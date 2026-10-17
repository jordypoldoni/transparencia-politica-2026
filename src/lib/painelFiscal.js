// PAINEL FISCAL (17/10/2026, página de gastos públicos v2): transforma o resumo do SICONFI
// (fiscal_resumo.detalhe + fiscal_funcao) nos blocos que a tela mostra. Função pura, testada em
// tests/painelFiscal.test.mjs, para a tela não fazer conta.
//
// Conceitos oficiais (Tesouro Nacional, RREO Anexo 06):
//   resultado primário = receita primária - despesa primária (sem juros e sem dívida nova)
//   resultado nominal  = resultado primário - juros líquidos; é o déficit/superávit "de verdade"
//   a dívida líquida sobe (ou cai) pelo resultado nominal.
// "Gastou" é a despesa primária PAGA no ano (inclui restos a pagar de anos anteriores), que é a base
// em que o Tesouro calcula o resultado primário.

export const brlCompacto = (v) => {
  if (v == null) return '-';
  const n = Number(v), abs = Math.abs(n);
  if (abs >= 1e12) return `R$ ${(n / 1e12).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} tri`;
  if (abs >= 1e9) return `R$ ${(n / 1e9).toLocaleString('pt-BR', { maximumFractionDigits: abs >= 1e10 ? 0 : 1 })} bi`;
  if (abs >= 1e6) return `R$ ${(n / 1e6).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} mi`;
  if (abs >= 1e3) return `R$ ${(n / 1e3).toLocaleString('pt-BR', { maximumFractionDigits: 0 })} mil`;
  return `R$ ${n.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}`;
};
// Um decimal em bilhões (R$ 94,9 bi), para somas que o leitor vai conferir de cabeça (94,9 + 707,6 = 802,4).
export const brlPreciso = (v) => {
  if (v == null) return '-';
  const n = Number(v), abs = Math.abs(n);
  if (abs >= 1e9 && abs < 1e12) return `R$ ${(n / 1e9).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} bi`;
  return brlCompacto(v);
};
export const pct = (p) => `${p.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 1 })}%`;

const ok = (...vs) => vs.every((v) => v != null && Number.isFinite(Number(v)));

// Textos de "o que é" por área. SÓ para a União: texto escrito para um âmbito não vale em outro
// (Diretrizes de Design, 19/09/2026).
const DESC_UNIAO = {
  'Previdência Social': 'Aposentadorias e pensões do INSS e dos servidores federais.',
  'Serviço da dívida': 'Juros e principal pagos aos credores do governo (dívida interna e externa).',
  'Repasses a estados e municípios': 'Parte da arrecadação que a lei manda dividir com estados e municípios.',
  'Outros encargos': 'Demais despesas que o Tesouro classifica como encargos especiais.',
  'Assistência Social': 'Bolsa Família, BPC e outros benefícios.',
  'Saúde': 'SUS, hospitais federais e medicamentos.',
  'Educação': 'Universidades e institutos federais e repasses para a educação básica.',
  'Trabalho': 'Seguro-desemprego e abono salarial.',
  'Defesa Nacional': 'Forças Armadas.',
};

// Para onde foi o dinheiro: as funções de governo, com "Encargos Especiais" aberto em serviço da
// dívida, repasses e outros (o nome sozinho não diz nada ao cidadão). Percentual sobre a soma dos itens.
export function montarDestino({ funcoes, encargos, esfera, maxPrincipais = 9 }) {
  const lista = (funcoes || []).map((f) => ({ rotulo: f.funcao, valor: Number(f.valor) || 0 })).filter((f) => f.valor > 0);
  const enc = lista.find((f) => f.rotulo === 'Encargos Especiais');
  let itens = lista;
  if (enc && encargos && (ok(encargos.divida_interna) || ok(encargos.divida_externa) || ok(encargos.transferencias))) {
    const divida = (Number(encargos.divida_interna) || 0) + (Number(encargos.divida_externa) || 0);
    const repasses = Number(encargos.transferencias) || 0;
    const outros = Math.max(0, enc.valor - divida - repasses);
    itens = lista.filter((f) => f !== enc);
    if (divida > 0) itens.push({ rotulo: 'Serviço da dívida', valor: divida, divida: true });
    if (repasses > 0) itens.push({ rotulo: 'Repasses a estados e municípios', valor: repasses });
    if (outros > 0) itens.push({ rotulo: 'Outros encargos', valor: outros });
  }
  const total = itens.reduce((a, f) => a + f.valor, 0);
  itens = itens.sort((a, b) => b.valor - a.valor).map((f) => ({
    ...f, pct: total ? (f.valor / total) * 100 : 0,
    desc: esfera === 'U' ? DESC_UNIAO[f.rotulo] || null : null,
  }));
  const principais = itens.slice(0, maxPrincipais);
  const resto = itens.slice(maxPrincipais);
  const outras = resto.length ? { rotulo: 'Outras áreas', valor: resto.reduce((a, f) => a + f.valor, 0), n: resto.length } : null;
  if (outras) outras.pct = total ? (outras.valor / total) * 100 : 0;
  return { total, itens, principais, outras };
}

// Quadro completo. `v2` só quando o ente publica o resultado primário e nominal (hoje: União).
export function montarPainel({ resumo, funcoes, ente }) {
  const d = (resumo && resumo.detalhe) || {};
  const r = d.resultados || {};
  const rec = d.receita || {};
  const destino = montarDestino({ funcoes, encargos: d.encargos, esfera: ente && ente.esfera });
  const v2 = ok(r.receita_primaria, r.despesa_primaria_paga, r.resultado_primario, r.resultado_nominal,
    r.juros_ativos, r.juros_passivos, r.divida_liquida_inicio, r.divida_liquida_atual);
  if (!v2) return { v2: false, destino };

  const juros = Number(r.juros_passivos) - Number(r.juros_ativos);
  const aumentoDivida = Number(r.divida_liquida_atual) - Number(r.divida_liquida_inicio);
  const direta = Number(r.receita_primaria) - Number(r.despesa_primaria_paga);
  let origem = null;
  if (ok(rec.tributaria, rec.contribuicoes)) {
    const outras = Number(r.receita_primaria) - Number(rec.tributaria) - Number(rec.contribuicoes);
    if (outras >= 0) {
      const base = Number(r.receita_primaria);
      origem = [
        { chave: 'contribuicoes', rotulo: 'Contribuições (INSS, PIS, Cofins...)', curto: 'Contribuições', valor: Number(rec.contribuicoes) },
        { chave: 'impostos', rotulo: 'Impostos e taxas (renda, IPI, IOF...)', curto: 'Impostos', valor: Number(rec.tributaria) },
        { chave: 'outras', rotulo: 'Concessões, serviços e outras', curto: 'Outras', valor: outras },
      ].map((o) => ({ ...o, pct: (o.valor / base) * 100 }));
    }
  }
  return {
    v2: true,
    arrecadou: Number(r.receita_primaria),
    gastou: Number(r.despesa_primaria_paga),
    primario: Number(r.resultado_primario),          // negativo = gastou mais do que arrecadou
    ajuste: ok(r.ajuste_metodologico) ? Number(r.ajuste_metodologico) : 0,
    direta,
    juros,
    nominal: Number(r.resultado_nominal),
    deficit: Number(r.resultado_nominal) < 0,
    divida: { inicio: Number(r.divida_liquida_inicio), atual: Number(r.divida_liquida_atual), aumento: aumentoDivida },
    origem,
    destino,
  };
}
