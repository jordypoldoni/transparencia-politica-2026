import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { tituloCidadao, agruparPorMateria } from '../src/lib/votacao.js';

test('tituloCidadao: resumo da proposição vence a frase da votação, que vence a ementa', () => {
  assert.equal(tituloCidadao({ resumo_simples: 'R', explicacao_cidada: 'E', ementa: 'M' }), 'R');
  assert.equal(tituloCidadao({ explicacao_cidada: 'E', ementa: 'M' }), 'E');
  assert.equal(tituloCidadao({ ementa: 'M' }), 'M');
  assert.equal(tituloCidadao({}), null);
  assert.equal(tituloCidadao(null), null);
});

test('agruparPorMateria leva o resumo_simples da proposição para o grupo', () => {
  const g = agruparPorMateria([
    { votacao_id_externa: '1-1', proposicao_titulo: 'PL 1/2026', ementa: 'Dispõe sobre X.', resumo_simples: 'Cria a regra X.', data_voto: '2026-01-01' },
    { votacao_id_externa: '1-2', proposicao_titulo: 'PL 1/2026', ementa: 'Dispõe sobre X.', resumo_simples: 'Cria a regra X.', data_voto: '2026-01-02' },
  ]);
  assert.equal(g[0].resumo_simples, 'Cria a regra X.');
  assert.equal(tituloCidadao(g[0]), 'Cria a regra X.');
});

test('sem resumo_simples o card cai na ementa (sem buraco)', () => {
  const g = agruparPorMateria([{ votacao_id_externa: '2-1', proposicao_titulo: 'PL 2/2026', ementa: 'Dispõe sobre Y.', data_voto: '2026-01-01' }]);
  assert.equal(tituloCidadao(g[0]), 'Dispõe sobre Y.');
});

test('as consultas de votação trazem a coluna resumo_simples', () => {
  const fonte = readFileSync(new URL('../src/servicos/servico_api.js', import.meta.url), 'utf8');
  const n = (fonte.match(/explicacao_cidada, resumo_simples/g) || []).length;
  assert.ok(n >= 3, `esperava 3 selects com resumo_simples, achei ${n}`);
  assert.match(fonte, /resumo_simples: vm\?\.resumo_simples/);
});
