import test from 'node:test';
import assert from 'node:assert/strict';
import { ordenarNotas, ehDivulgacaoAtividade } from '../src/lib/ordemNotas.js';

const notas = [
  { id: 1, data_emissao: '2026-03-10', valor_liquido: '100' },
  { id: 2, data_emissao: '2026-05-02', valor_liquido: '50' },
  { id: 3, data_emissao: null, valor_liquido: '900' },
  { id: 4, data_emissao: '2026-05-02', valor_liquido: '70' },
];

test('divulgação da atividade parlamentar: do mais recente ao mais antigo, sem data no fim', () => {
  const r = ordenarNotas('DIVULGAÇÃO DA ATIVIDADE PARLAMENTAR.', notas).map((n) => n.id);
  assert.deepEqual(r, [4, 2, 1, 3]);
});

test('outros tipos continuam da maior para a menor', () => {
  const r = ordenarNotas('COMBUSTÍVEIS E LUBRIFICANTES.', notas).map((n) => n.id);
  assert.deepEqual(r, [3, 1, 4, 2]);
});

test('reconhece o tipo com ou sem caixa alta e ponto final', () => {
  assert.ok(ehDivulgacaoAtividade('Divulgação da atividade parlamentar'));
  assert.ok(ehDivulgacaoAtividade('DIVULGACAO DA ATIVIDADE PARLAMENTAR.'));
  assert.ok(!ehDivulgacaoAtividade('Passagem aérea'));
});

test('não altera a lista original', () => {
  const copia = JSON.stringify(notas);
  ordenarNotas('DIVULGAÇÃO DA ATIVIDADE PARLAMENTAR', notas);
  assert.equal(JSON.stringify(notas), copia);
});
