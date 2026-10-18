// Testes da escolha da coluna de despesa do SICONFI (bug de 17/10/2026: pegava "No Bimestre").
import test from 'node:test';
import assert from 'node:assert/strict';
import { colunaDespesaRealizada, parseDespesaEFuncoes } from '../src/lib/siconfi.js';

const linha = (conta, coluna, valor) => ({ conta, coluna, valor });
const COLUNAS = [
  'DOTAÇÃO INICIAL', 'DOTAÇÃO ATUALIZADA (a)',
  'DESPESAS EMPENHADAS NO BIMESTRE', 'DESPESAS EMPENHADAS ATÉ O BIMESTRE (b)', '% (b/total b)',
  'DESPESAS LIQUIDADAS NO BIMESTRE', 'DESPESAS LIQUIDADAS ATÉ O BIMESTRE (d)', '% (d/total d)',
];
const itens = (colunas) => colunas.flatMap((c, i) => [
  linha('DESPESAS (EXCETO INTRA-ORÇAMENTÁRIAS) (I)', c, 1000 * (i + 1)),
  linha('Saúde', c, 10 * (i + 1)),
]);

test('prefere liquidada ATÉ o bimestre, nunca a do bimestre', () => {
  assert.equal(colunaDespesaRealizada(itens(COLUNAS)), 'DESPESAS LIQUIDADAS ATÉ O BIMESTRE (d)');
});

test('independe da ordem das colunas (a do bimestre vindo primeiro não engana)', () => {
  assert.equal(colunaDespesaRealizada(itens([...COLUNAS].reverse())), 'DESPESAS LIQUIDADAS ATÉ O BIMESTRE (d)');
});

test('sem liquidada até o bimestre, cai na empenhada até o bimestre', () => {
  const sem = COLUNAS.filter((c) => !/LIQUIDADAS/.test(c));
  assert.equal(colunaDespesaRealizada(itens(sem)), 'DESPESAS EMPENHADAS ATÉ O BIMESTRE (b)');
});

test('só colunas "No Bimestre": não inventa acumulado (devolve nulo)', () => {
  assert.equal(colunaDespesaRealizada(itens(['DESPESAS LIQUIDADAS NO BIMESTRE', 'DOTAÇÃO INICIAL'])), null);
});

test('total e funções saem da coluna acumulada', () => {
  const r = parseDespesaEFuncoes(itens(COLUNAS));
  const i = COLUNAS.indexOf('DESPESAS LIQUIDADAS ATÉ O BIMESTRE (d)') + 1;
  assert.equal(r.despesa_total, 1000 * i);
  assert.equal(r.funcoes['Saúde'], 10 * i);
});

// ---- Detalhe (página de gastos públicos v2). Valores reais da União, 4º bimestre de 2026. ----
import { parseReceitaDetalhe, parseResultados, parseEncargos, parseSubfuncoes, parseIntraPorFuncao } from '../src/lib/siconfi.js';

test('origem da receita lê as linhas "Até o Bimestre" pelo código da conta', () => {
  const ate = 'Até o Bimestre (c)';
  const r = parseReceitaDetalhe([
    { cod_conta: 'ReceitaTributaria', coluna: 'PREVISÃO INICIAL', valor: 1 },
    { cod_conta: 'ReceitaTributaria', coluna: ate, valor: 846163557843.27 },
    { cod_conta: 'ReceitaDeContribuicoes', coluna: ate, valor: 1048150710753.87 },
    { cod_conta: 'ReceitasDeOperacoesDeCredito', coluna: ate, valor: 467781360906.8 },
    { cod_conta: 'ReceitasDeOperacoesDeCredito', coluna: '% (c/a)', valor: 99 },
  ]);
  assert.equal(r.tributaria, 846163557843.27);
  assert.equal(r.contribuicoes, 1048150710753.87);
  assert.equal(r.operacoes_credito, 467781360906.8);
  assert.equal(r.remuneracao_caixa, null);
});

test('resultados: despesa primária paga soma paga + restos a pagar processados + não processados', () => {
  const dp = 'DESPESA PRIMÁRIA TOTAL (VII) = (IV + V + VI)';
  const r = parseResultados([
    { conta: 'Receita primária total (III)', coluna: 'RECEITAS REALIZADAS (a)', valor: 2096979235519.67 },
    { conta: 'Receita primária total (III)', coluna: 'PREVISÃO ATUALIZADA', valor: 3290035796352 },
    { conta: dp, coluna: 'DESPESAS LIQUIDADAS', valor: 2081313962959.7 },
    { conta: dp, coluna: 'DESPESAS PAGAS (a)', valor: 1974876257274.12 },
    { conta: dp, coluna: 'RESTOS A PAGAR PROCESSADOS PAGOS (b)', valor: 100546209425.79 },
    { conta: dp, coluna: 'LIQUIDADOS', valor: 111648788961.61 },
    { conta: dp, coluna: 'PAGOS (c)', valor: 108938653399.75 },
    { conta: 'AJUSTE METODOLÓGICO DO RESULTADO PRIMÁRIO - Acima da Linha (VIII)', coluna: 'VALOR', valor: -7487594022.33 },
    { conta: 'RESULTADO PRIMÁRIO - Acima da Linha (IX)', coluna: 'VALOR', valor: -94869478602.32 },
    { conta: 'RESULTADO PRIMÁRIO - Abaixo da Linha (XXVII)', coluna: 'VALOR', valor: -87381884580.06 },
    { conta: 'RESULTADO NOMINAL - Acima da Linha (XII)', coluna: 'VALOR', valor: -802436455362.47 },
    { conta: 'Juros, Encargos e Variações Monetárias Ativos (X)', coluna: 'VALOR INCORRIDO', valor: 252764502419.5 },
    { conta: 'Juros, Encargos e Variações Monetárias Passivos (XI)', coluna: 'VALOR INCORRIDO', valor: 960331479179.65 },
    { conta: 'DÍVIDA CONSOLIDADA LÍQUIDA (XVI) = (XIII - XIV)', coluna: 'Em 31/12/2024 (a)', valor: 8023014930732.35 },
    { conta: 'DÍVIDA CONSOLIDADA LÍQUIDA (XVI) = (XIII - XIV)', coluna: 'Até o Bimestre 2026 (b)', valor: 8824948368201.45 },
  ]);
  assert.equal(r.receita_primaria, 2096979235519.67);
  assert.ok(Math.abs(r.despesa_primaria_paga - (1974876257274.12 + 100546209425.79 + 108938653399.75)) < 1);
  assert.equal(r.resultado_primario, -94869478602.32);
  assert.equal(r.resultado_nominal, -802436455362.47);
  assert.equal(r.ajuste_metodologico, -7487594022.33);
  assert.equal(r.juros_passivos - r.juros_ativos, 960331479179.65 - 252764502419.5);
  assert.equal(r.divida_liquida_atual - r.divida_liquida_inicio, 8824948368201.45 - 8023014930732.35);
});

test('conferência de coerência com a União: primário e nominal fecham com os juros líquidos', () => {
  // resultado nominal = resultado primário - juros líquidos (valores publicados)
  const nominal = -94869478602.32 - (960331479179.65 - 252764502419.5);
  assert.ok(Math.abs(nominal - -802436455362.47) < 1e6);
});

test('resultados: ente sem a linha devolve nulo (a página cai no desenho simples)', () => {
  const r = parseResultados([{ conta: 'Qualquer', coluna: 'X', valor: 1 }]);
  assert.equal(r.resultado_primario, null);
  assert.equal(r.despesa_primaria_paga, null);
  assert.equal(r.divida_liquida_atual, null);
});

test('encargos especiais: separa dívida, repasses e outros, parando na próxima função', () => {
  const col = 'DESPESAS LIQUIDADAS ATÉ O BIMESTRE (d)';
  const l = (conta, valor) => ({ conta, coluna: col, valor });
  const r = parseEncargos([
    l('Previdência Social', 807620760645.23),
    l('Encargos Especiais', 1343024098744.01),
    l('Serviço da Dívida Interna', 676451304354.68),
    l('Serviço da Dívida Externa', 13604075323.65),
    l('Transferências', 326293930143.22),
    l('Outros Encargos Especiais', 254084507031.52),
    l('Transferências', 999), // outra subfunção com o mesmo nome em outra função: não conta
    l('Assistência Social', 1),
    l('Transferências', 888),
  ]);
  assert.equal(r.divida_interna, 676451304354.68);
  assert.equal(r.divida_externa, 13604075323.65);
  assert.equal(r.transferencias, 326293930143.22);
  assert.equal(r.outros, 254084507031.52);
});

test('encargos especiais: sem a função devolve nulo', () => {
  assert.equal(parseEncargos([{ conta: 'Saúde', coluna: 'DESPESAS LIQUIDADAS ATÉ O BIMESTRE (d)', valor: 1 }]), null);
});

test('subfunções: agrupa por função, usa a coluna acumulada e para nas intra-orçamentárias e totais', () => {
  const col = 'DESPESAS LIQUIDADAS ATÉ O BIMESTRE (d)';
  const outra = 'DESPESAS EMPENHADAS ATÉ O BIMESTRE (c)';
  const l = (conta, valor, coluna = col) => ({ conta, coluna, valor });
  const r = parseSubfuncoes([
    l('DESPESAS (EXCETO INTRA-ORÇAMENTÁRIAS) (I)', 999),
    l('Saúde', 100), l('Atenção Básica', 40), l('Assistência Hospitalar e Ambulatorial', 40), l('FU10 - Administração Geral', 10), l('FU10 - Demais Subfunções', 10),
    l('Atenção Básica', 7, outra),
    l('Trabalho', 30), l('Proteção e Benefícios ao Trabalhador', 30),
    l('Encargos Especiais', 70), l('Serviço da Dívida Interna', 50), l('Transferências', 0), l('Outros Encargos Especiais', 20),
    l('DESPESAS (INTRA-ORÇAMENTÁRIAS) (II)', 5),
    l('FU18 - Administração Geral', 5), l('Legislativa', 5),
    l('Saúde', 999), l('Subfunção intra', 999),
  ]);
  assert.deepEqual(r['Saúde'], [['Atenção Básica', 40], ['Assistência Hospitalar e Ambulatorial', 40], ['Administração Geral', 10], ['Demais Subfunções', 10]]);
  assert.deepEqual(r['Trabalho'], [['Proteção e Benefícios ao Trabalhador', 30]]);
  assert.deepEqual(r['Encargos Especiais'], [['Serviço da Dívida Interna', 50], ['Outros Encargos Especiais', 20]]);
});

test('subfunções: ente sem coluna acumulada ou sem subfunções devolve nulo', () => {
  assert.equal(parseSubfuncoes([]), null);
  assert.equal(parseSubfuncoes([{ conta: 'Saúde', coluna: 'DESPESAS LIQUIDADAS ATÉ O BIMESTRE (d)', valor: 5 }]), null);
});

test('intra-orçamentárias: soma por função só das linhas Intra da coluna acumulada', () => {
  const col = 'DESPESAS LIQUIDADAS ATÉ O BIMESTRE (d)';
  const r = parseIntraPorFuncao([
    { conta: 'Educação', cod_conta: 'RREO2TotalDespesas', coluna: col, valor: 100 },
    { conta: 'Educação', cod_conta: 'RREO2TotalDespesasIntra', coluna: col, valor: 8.7 },
    { conta: 'Educação', cod_conta: 'RREO2TotalDespesasIntra', coluna: 'DOTAÇÃO INICIAL', valor: 999 },
    { conta: 'FU12 - Administração Geral', cod_conta: 'RREO2TotalDespesasIntra', coluna: col, valor: 3 },
    { conta: 'Judiciária', cod_conta: 'RREO2TotalDespesasIntra', coluna: col, valor: 3.4 },
  ]);
  assert.deepEqual(r, { 'Educação': 8.7, 'Judiciária': 3.4 });
  assert.equal(parseIntraPorFuncao([{ conta: 'Educação', cod_conta: 'RREO2TotalDespesas', coluna: col, valor: 1 }]), null);
});
