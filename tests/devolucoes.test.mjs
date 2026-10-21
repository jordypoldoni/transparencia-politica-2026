import test from 'node:test';
import assert from 'node:assert/strict';
import { resumoDevolucoes, textoDevolucao } from '../src/lib/devolucoes.js';

const nbsp = (s) => s.replace(/ /g, ' ');
test('sem devolução: nulo e sem linha', () => {
  assert.equal(resumoDevolucoes([]), null);
  assert.equal(resumoDevolucoes([{ valor_restituido: 0, data_restituicao: null }]), null);
  assert.equal(textoDevolucao(null), null);
});
test('uma devolução', () => {
  const r = textoDevolucao(resumoDevolucoes([{ valor_restituido: '57000.00', data_restituicao: '2026-09-25' }]));
  assert.equal(r.rotulo, 'Devolução à Câmara:');
  assert.equal(nbsp(r.texto), 'R$ 57.000,00 em 25/09/2026');
});
test('vários lançamentos no mesmo dia', () => {
  const l = [12000, 12000, 12000].map((v) => ({ valor_restituido: v, data_restituicao: '2026-05-06' }));
  const r = textoDevolucao(resumoDevolucoes(l));
  assert.equal(r.rotulo, 'Devolução à Câmara:');
  assert.equal(nbsp(r.texto), 'R$ 36.000,00 em 06/05/2026 (3 lançamentos)');
});
test('vários dias: soma em centavos sem erro de ponto flutuante', () => {
  const l = [{ valor_restituido: 0.1, data_restituicao: '2026-09-23' }, { valor_restituido: 0.2, data_restituicao: '2026-08-26' }];
  const d = resumoDevolucoes(l);
  assert.equal(d.total, 0.3);
  const r = textoDevolucao(d);
  assert.equal(r.rotulo, 'Devoluções à Câmara:');
  assert.equal(nbsp(r.texto), 'R$ 0,30 em 2 lançamentos, de 26/08/2026 a 23/09/2026');
});
test('sem data: mostra só valor e quantidade', () => {
  const r = textoDevolucao(resumoDevolucoes([{ valor_restituido: 10, data_restituicao: null }, { valor_restituido: 5, data_restituicao: null }]));
  assert.equal(nbsp(r.texto), 'R$ 15,00 em 2 lançamentos');
});
