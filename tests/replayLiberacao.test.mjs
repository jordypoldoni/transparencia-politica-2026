import test from 'node:test';
import assert from 'node:assert/strict';
import { replayLiberado, LIBERA_REPLAY_2T } from '../src/lib/replayLiberacao.js';

test('1º turno sempre liberado', () => { assert.equal(replayLiberado(1, new Date('2026-01-01T00:00:00Z')), true); });
test('2º turno travado antes das 17h de 25/10 (Brasília)', () => {
  assert.equal(replayLiberado(2, Date.parse('2026-10-25T16:59:59-03:00')), false);
  assert.equal(replayLiberado(2, new Date('2026-10-22T18:00:00Z')), false);
});
test('2º turno liberado às 17h de 25/10 (Brasília) em diante', () => {
  assert.equal(replayLiberado(2, Date.parse('2026-10-25T17:00:00-03:00')), true);
  assert.equal(replayLiberado(2, Date.parse('2026-10-25T20:00:00Z')), true);
  assert.equal(Date.parse(LIBERA_REPLAY_2T), Date.parse('2026-10-25T20:00:00Z'));
});
test('turno inválido e data inválida não liberam', () => {
  assert.equal(replayLiberado(3), false);
  assert.equal(replayLiberado(2, NaN), false);
});
