import test from 'node:test';
import assert from 'node:assert/strict';
import { situacaoLegivel } from '../src/lib/situacaoCamara.js';

test('situacao normal passa limpa', () => {
  assert.equal(situacaoLegivel('Aguardando Autorização do Despacho'), 'Aguardando Autorização do Despacho');
  assert.equal(situacaoLegivel('  Tramitação Finalizada '), 'Tramitação Finalizada');
});
test('texto cru de sistema e vazio viram null (a fonte nao informa)', () => {
  for (const x of ['<Não Definido>', '<null>', ' <Não Definido> ', '', '   ', null, undefined]) assert.equal(situacaoLegivel(x), null, String(x));
});
test('texto que apenas contem sinais de menor/maior no meio nao e descartado', () => {
  assert.equal(situacaoLegivel('Prazo <30 dias> pendente'), 'Prazo <30 dias> pendente');
});
