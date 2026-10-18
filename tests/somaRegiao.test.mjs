import test from 'node:test';
import assert from 'node:assert/strict';
import { somarRegiao } from '../src/lib/somaRegiao.js';

const est = (validos, brancos, nulos, tot, total, cands) => ({
  votos: { validos, brancos, nulos },
  secoes: { totalizadas: tot, total },
  candidatos: cands.map(([numero, nome, partido, votos]) => ({ numero, nome, partido, votos })),
});
const A = est(100, 10, 10, 90, 100, [[13, 'Ana', 'P1', 60], [22, 'Beto', 'P2', 40]]);
const B = est(300, 20, 30, 200, 200, [[22, 'Beto', 'P2', 200], [13, 'Ana', 'P1', 100]]);

test('soma votos por candidato, validos, brancos, nulos e secoes; % sobre validos da regiao', () => {
  const r = somarRegiao({ AC: A, AM: B }, 'N', ['AC', 'AM', 'RR']);
  assert.equal(r.nEstados, 2);
  assert.deepEqual(r.faltam, ['RR']);
  assert.equal(r.e.votos.validos, 400);
  assert.equal(r.e.votos.brancos, 30);
  assert.equal(r.e.votos.nulos, 40);
  assert.deepEqual(r.e.secoes, { totalizadas: 290, total: 300, pct_totalizadas: '96,67' });
  assert.deepEqual(r.e.candidatos.map((c) => [c.nome, c.votos, c.pct]), [['Beto', 240, '60,00'], ['Ana', 160, '40,00']]);
  assert.equal(r.e.votos.pct_brancos, '6,38'); // 30 de 470 (validos + brancos + nulos)
});
test('regiao sem nenhum estado publicado devolve e nulo e lista todos em faltam', () => {
  const r = somarRegiao({}, 'S', ['PR', 'RS', 'SC']);
  assert.equal(r.e, null);
  assert.equal(r.nEstados, 0);
  assert.deepEqual(r.faltam, ['PR', 'RS', 'SC']);
});
test('regiao completa nao tem faltam; candidato so em um estado entra na soma', () => {
  const C = est(50, 0, 0, 10, 10, [[99, 'Caio', 'P3', 50]]);
  const r = somarRegiao({ AC: A, AM: C }, 'N', ['AC', 'AM']);
  assert.deepEqual(r.faltam, []);
  assert.equal(r.e.candidatos.find((c) => c.nome === 'Caio').votos, 50);
});
