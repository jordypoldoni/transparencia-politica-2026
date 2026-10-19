import test from 'node:test';
import assert from 'node:assert/strict';
import { resumirTramitacao, semEmentaRepetida } from '../src/lib/tramitacaoCpi.js';

const m = (ordem, data, cod, tipo, despacho) => ({ ordem, data_hora: `${data}T10:00:00`, cod_tipo: cod, tipo, despacho });

test('caso real RCP 1/2026: tipos pequenos aparecem um a um, o grande vira uma linha com periodo', () => {
  const movs = [
    m(1, '2026-02-02', '100', 'Apresentação de Proposição', 'Apresentação do RCP n. 1/2026'),
    m(2, '2026-02-02', '1042', 'Relatório de Conferência de Assinaturas', 'Relatório de Conferência de Assinaturas Eletrônicas.'),
    m(3, '2026-02-03', '100', 'Apresentação de Proposição', 'Apresentação do OF n. 1/2026'),
    ...Array.from({ length: 15 }, (_, i) => m(4 + i, i === 14 ? '2026-05-26' : '2026-02-04', '194', 'Apresentação de Requerimento', 'REQ')),
    m(19, '2026-07-20', '1005', 'Notificações', 'Indeferido o Requerimento n. 2884/2026.'),
    m(20, '2026-07-20', '1005', 'Notificações', 'Indeferido o Requerimento n. 3181/2026.'),
  ];
  const r = resumirTramitacao(movs);
  assert.equal(r.total, 20);
  assert.equal(r.restantes, 0);
  const grande = r.itens.find((x) => x.n === 15);
  assert.equal(grande.texto, '15 requerimentos apresentados');
  assert.equal(grande.inicio, '2026-02-04');
  assert.equal(grande.fim, '2026-05-26');
  assert.deepEqual(r.itens.map((x) => x.inicio), [...r.itens.map((x) => x.inicio)].sort());
  assert.ok(r.itens.some((x) => x.texto === 'Indeferido o Requerimento n. 3181/2026.' && x.inicio === '2026-07-20'));
});

test('limite de 3: com 3 lista cada um, com 4 agrupa', () => {
  const tres = [1, 2, 3].map((i) => m(i, `2026-01-0${i}`, '1005', 'Notificações', `d${i}`));
  assert.equal(resumirTramitacao(tres).itens.length, 3);
  const quatro = [1, 2, 3, 4].map((i) => m(i, `2026-01-0${i}`, '1005', 'Notificações', `d${i}`));
  const r = resumirTramitacao(quatro);
  assert.equal(r.itens.length, 1);
  assert.equal(r.itens[0].texto, '4 notificações');
});

test('tipo desconhecido nao some: cai no texto com o nome oficial', () => {
  const r = resumirTramitacao([1, 2, 3, 4].map((i) => m(i, '2026-01-01', '9999', 'Tipo Novo', 'x')));
  assert.equal(r.itens[0].texto, '4 movimentações do tipo "Tipo Novo"');
});

test('limita a 8 linhas e informa quantas movimentacoes ficaram de fora', () => {
  const movs = [];
  for (let c = 0; c < 10; c++) movs.push(m(c + 1, `2026-01-${String(c + 1).padStart(2, '0')}`, `c${c}`, `T${c}`, `despacho ${c}`));
  const r = resumirTramitacao(movs);
  assert.equal(r.itens.length, 8);
  assert.equal(r.restantes, 2);
  assert.equal(r.total, 10);
});

test('despacho longo e cortado em palavra inteira; vazio usa o tipo', () => {
  const longo = 'palavra '.repeat(80);
  const r = resumirTramitacao([m(1, '2026-01-01', '1', 'A', longo), m(2, '2026-01-02', '2', 'Tipo B', '')]);
  assert.ok(r.itens[0].texto.endsWith('…'));
  assert.ok(r.itens[0].texto.length <= 301);
  assert.equal(r.itens[1].texto, 'Tipo B');
});

test('entrada vazia nao quebra', () => {
  assert.deepEqual(resumirTramitacao([]), { total: 0, itens: [], restantes: 0 });
  assert.deepEqual(resumirTramitacao(undefined), { total: 0, itens: [], restantes: 0 });
});

test('tira do despacho a citacao que e so a ementa do pedido; citacao diferente fica', () => {
  const ementa = 'Requer a criação de Comissão Parlamentar de Inquérito para investigar as fraudes financeiras ocorridas na relação entre o Banco Master e o Banco Regional de Brasília – BRB.';
  const d1 = 'Apresentação do RCP n. 1/2026 (Requerimento de Instituição de CPI), pelos Deputado Rodrigo Rollemberg (PSB/DF) e outros, que "Requer a criação de Comissão Parlamentar de Inquérito para investigar as fraudes financeiras ocorridas na relação entre o Banco Master e o Banco Regional de Brasília – BRB".';
  assert.equal(semEmentaRepetida(d1, ementa), 'Apresentação do RCP n. 1/2026 (Requerimento de Instituição de CPI), pelos Deputado Rodrigo Rollemberg (PSB/DF) e outros.');
  const d2 = 'Apresentação do OF n. 1/2026 (Ofício), pelo Deputado Alencar Santana, que "Manifestação de apoio ao RCP nº 1/2026 que visa instauração da CPI".';
  assert.equal(semEmentaRepetida(d2, ementa), d2);
  assert.equal(semEmentaRepetida('Indeferido o Requerimento n. 3181/2026.', ementa), 'Indeferido o Requerimento n. 3181/2026.');
  const r = resumirTramitacao([{ ordem: 1, data_hora: '2026-02-02T09:54:00', cod_tipo: '100', tipo: 'x', despacho: d1 }], { ementa });
  assert.ok(!r.itens[0].texto.includes('Requer a criação'));
});

test('opcao max limita as linhas', () => {
  const movs = Array.from({ length: 5 }, (_, c) => m(c + 1, `2026-01-0${c + 1}`, `c${c}`, `T${c}`, `d${c}`));
  assert.equal(resumirTramitacao(movs, { max: 2 }).itens.length, 2);
});
