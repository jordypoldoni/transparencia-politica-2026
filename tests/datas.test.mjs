import test from 'node:test';
import assert from 'node:assert/strict';
import { partesData, dataBr, anoDe, idadeEm } from '../src/lib/datas.js';
import { formatarDadosAte } from '../src/lib/datasFonte.js';

test('data sem hora vale o dia escrito (sem erro de fuso)', () => {
  assert.equal(dataBr('2026-05-19'), '19/05/2026');
});
test('meia-noite UTC exata e DATA, nao instante (votos do Senado)', () => {
  assert.equal(dataBr('2025-12-17T00:00:00+00:00'), '17/12/2025');
  assert.equal(dataBr('2025-12-17T00:00:00Z'), '17/12/2025');
});
test('instante com fuso e mostrado no horario de Brasilia', () => {
  assert.equal(dataBr('2026-09-27T01:30:00Z'), '26/09/2026'); // 22h30 do dia 26 em Brasilia
  assert.equal(dataBr('2026-09-27T15:31:16Z'), '27/09/2026');
});
test('data com hora e sem fuso vale o dia escrito', () => {
  assert.deepEqual(partesData('2026-05-19 23:50:00'), { ano: 2026, mes: 5, dia: 19 });
});
test('entradas vazias ou invalidas', () => {
  assert.equal(partesData(null), null);
  assert.equal(partesData(''), null);
  assert.equal(dataBr('lixo'), '');
  assert.equal(anoDe('2026-05-19'), 2026);
  assert.equal(anoDe(undefined), null);
});
test('idadeEm: nascimento futuro ou absurdo vira null; adulto tem idade plausivel', () => {
  assert.equal(idadeEm('2999-01-01'), null);
  assert.equal(idadeEm('1800-01-01'), null);
  const i = idadeEm('1980-06-15');
  assert.ok(i >= 45 && i < 120);
});
test('formatarDadosAte: mensal e diario, e nulo quando a fonte nao informa', () => {
  assert.equal(formatarDadosAte('2026-07-31', true), 'jul/2026');
  assert.equal(formatarDadosAte('2026-07-31', false), '31/07/2026');
  assert.equal(formatarDadosAte(null, true), null);
  assert.equal(formatarDadosAte('abc', false), null);
});
