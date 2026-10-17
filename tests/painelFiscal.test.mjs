import test from 'node:test';
import assert from 'node:assert/strict';
import { montarPainel, montarDestino, brlCompacto } from '../src/lib/painelFiscal.js';

// Valores reais da União, 4º bimestre de 2026.
const detalheUniao = {
  receita: { tributaria: 846163557843.27, contribuicoes: 1048150710753.87, operacoes_credito: 467781360906.8 },
  resultados: {
    receita_primaria: 2096979235519.67, despesa_primaria_paga: 2184361120099.66, ajuste_metodologico: -7487594022.33,
    resultado_primario: -94869478602.32, resultado_nominal: -802436455362.47,
    juros_ativos: 252764502419.5, juros_passivos: 960331479179.65,
    divida_liquida_inicio: 8023014930732.35, divida_liquida_atual: 8824948368201.45,
  },
  encargos: { divida_interna: 676451304354.68, divida_externa: 13604075323.65, transferencias: 326293930143.22, outros: 254084507031.52 },
};
const funcoes = [
  ['Encargos Especiais', 1361.2], ['Previdência Social', 808.2], ['Assistência Social', 198.9], ['Saúde', 157.8],
  ['Educação', 125.1], ['Trabalho', 86.3], ['Defesa Nacional', 59.1], ['Judiciária', 33.7], ['Gestão Ambiental', 32.5], ['Agricultura', 20.7],
].map(([funcao, bi]) => ({ funcao, valor: bi * 1e9 }));

test('União: números do quadro batem com os publicados pelo Tesouro', () => {
  const p = montarPainel({ resumo: { detalhe: detalheUniao }, funcoes, ente: { esfera: 'U' } });
  assert.equal(p.v2, true);
  assert.ok(Math.abs(p.juros - 707566976759.95) < 1e3);
  // resultado nominal = primário - juros líquidos
  assert.ok(Math.abs(p.primario - p.juros - p.nominal) < 1e6);
  // a dívida líquida sobe o que o resultado nominal indica (diferença pequena de metodologia)
  assert.ok(Math.abs(p.divida.aumento + p.nominal) < 5e9);
  // conta direta + ajuste metodológico = resultado primário oficial
  assert.ok(Math.abs(p.direta + p.ajuste - p.primario) < 1e6);
  assert.equal(brlCompacto(p.arrecadou), 'R$ 2,10 tri');
  assert.equal(brlCompacto(p.gastou), 'R$ 2,18 tri');
  assert.equal(brlCompacto(-p.nominal), 'R$ 802 bi');
  assert.equal(brlCompacto(-p.primario), 'R$ 95 bi');
});

test('origem da receita fecha 100% e a sobra é positiva', () => {
  const p = montarPainel({ resumo: { detalhe: detalheUniao }, funcoes, ente: { esfera: 'U' } });
  assert.equal(p.origem.length, 3);
  assert.ok(Math.abs(p.origem.reduce((a, o) => a + o.pct, 0) - 100) < 1e-9);
  assert.ok(p.origem.every((o) => o.valor >= 0));
  assert.equal(p.origem[0].chave, 'contribuicoes');
});

test('destino: Encargos Especiais vira dívida, repasses e outros; percentuais fecham 100%', () => {
  const d = montarDestino({ funcoes, encargos: detalheUniao.encargos, esfera: 'U' });
  const nomes = d.itens.map((i) => i.rotulo);
  assert.ok(!nomes.includes('Encargos Especiais'));
  assert.ok(nomes.includes('Serviço da dívida') && nomes.includes('Repasses a estados e municípios') && nomes.includes('Outros encargos'));
  const soma = d.itens.reduce((a, i) => a + i.pct, 0);
  assert.ok(Math.abs(soma - 100) < 1e-9);
  assert.ok(Math.abs(d.total - funcoes.reduce((a, f) => a + f.valor, 0)) < 1);
  assert.equal(d.itens[0].rotulo, 'Previdência Social');
  assert.equal(d.itens[1].rotulo, 'Serviço da dívida');
});

test('destino: principais + "Outras áreas" somam o total', () => {
  const d = montarDestino({ funcoes, encargos: detalheUniao.encargos, esfera: 'U', maxPrincipais: 5 });
  assert.equal(d.principais.length, 5);
  assert.ok(Math.abs(d.principais.reduce((a, i) => a + i.valor, 0) + d.outras.valor - d.total) < 1);
});

test('descrições só para a União (texto de um âmbito não vale em outro)', () => {
  const u = montarDestino({ funcoes, encargos: null, esfera: 'U' });
  const e = montarDestino({ funcoes, encargos: null, esfera: 'E' });
  assert.ok(u.itens.find((i) => i.rotulo === 'Saúde').desc);
  assert.equal(e.itens.find((i) => i.rotulo === 'Saúde').desc, null);
});

test('sem detalhe de encargos, mantém "Encargos Especiais"', () => {
  const d = montarDestino({ funcoes, encargos: null, esfera: 'E' });
  assert.ok(d.itens.some((i) => i.rotulo === 'Encargos Especiais'));
});

test('ente sem resultado primário (estados hoje): não é v2 e o destino continua', () => {
  const p = montarPainel({ resumo: { detalhe: { receita: {}, resultados: { receita_primaria: null }, encargos: detalheUniao.encargos } }, funcoes, ente: { esfera: 'E' } });
  assert.equal(p.v2, false);
  assert.ok(p.destino.itens.length > 0);
  assert.equal(montarPainel({ resumo: { detalhe: null }, funcoes: [], ente: null }).v2, false);
});
