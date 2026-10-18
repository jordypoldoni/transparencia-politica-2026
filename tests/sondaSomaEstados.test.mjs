import test from 'node:test';
import assert from 'node:assert/strict';
import { reduzir, comparar, urlDe, num } from '../coletores/_sonda_soma_estados_tse.mjs';

const arq = (dg, st, c, v, cands) => ({
  dg, hg: '10:00:00', s: { ts: 10, st }, e: { c }, v: { vv: v[0], vb: v[1], vn: v[2], tv: v[0] + v[1] + v[2] },
  carg: [{ agr: [{ par: cands.map(([n, nm, vap]) => ({ cand: [{ n, nm, vap }] })) }] }],
});

test('URLs: 1o turno 6257 e 2o turno 6258, com 6 digitos', () => {
  assert.equal(urlDe('br', 1), 'https://resultados.tse.jus.br/oficial/ele2026/6257/dados/br/br-c0001-e006257-u.json');
  assert.equal(urlDe('sp', 2), 'https://resultados.tse.jus.br/oficial/ele2026/6258/dados/sp/sp-c0001-e006258-u.json');
});
test('num entende milhar com ponto e decimal com virgula', () => {
  assert.equal(num('5.009.437'), 5009437);
  assert.equal(num('12,5'), 12.5);
  assert.equal(num(undefined), 0);
});
test('soma dos estados + exterior igual ao nacional: todos_batem', () => {
  const a = reduzir(arq('02/10/2026', 5, 100, [90, 4, 6], [[13, 'Ana', '60'], [22, 'Beto', '30']]));
  const b = reduzir(arq('02/10/2026', 5, 200, [180, 8, 12], [[13, 'Ana', '100'], [22, 'Beto', '80']]));
  const z = reduzir(arq('02/10/2026', 1, 10, [10, 0, 0], [[13, 'Ana', '5'], [22, 'Beto', '5']]));
  const br = reduzir(arq('02/10/2026', 11, 310, [280, 12, 18], [[13, 'Ana', '165'], [22, 'Beto', '115']]));
  const r = comparar(br, { AC: a, AL: b }, z);
  assert.equal(r.todos_batem_com_exterior, true);
  assert.equal(r.totais.validos.soma_estados, 270);
  assert.equal(r.totais.validos.soma_estados_mais_exterior, 280);
  assert.equal(r.candidatos[0].diferenca_estados, 5); // sem o exterior faltam 5
  assert.equal(r.candidatos[0].diferenca_com_exterior, 0);
});
test('sem o exterior lido nao afirma que bate; diferenca aparece', () => {
  const a = reduzir(arq('x', 5, 100, [100, 0, 0], [[13, 'Ana', '100']]));
  const br = reduzir(arq('x', 6, 110, [110, 0, 0], [[13, 'Ana', '110']]));
  const r = comparar(br, { AC: a }, null);
  assert.equal(r.exterior_lido, false);
  assert.equal(r.todos_batem_com_exterior, false);
  assert.equal(r.candidatos[0].diferenca_estados, 10);
});
