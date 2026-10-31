import { test } from 'node:test';
import assert from 'node:assert/strict';
import { termoValido, filtrarPresidentes, montarGrupos, hrefTodos, itemEnxuto } from '../src/lib/buscaCandidatosHome.js';

test('termoValido: 2+ letras ou número', () => {
  assert.equal(termoValido('a'), '');
  assert.equal(termoValido('  Lu '), 'Lu');
  assert.equal(termoValido('13'), '13');
  assert.equal(termoValido('1'), '1');
  assert.equal(termoValido('a%,()b'), 'ab');
  assert.equal(termoValido(undefined), '');
});

const chapas = [
  { presidente: { slug: 'lula-13', nome_urna: 'LULA', nome_completo: 'Luiz Inácio Lula da Silva', partido_sigla: 'PT', nr_candidato: '13' } },
  { presidente: { slug: 'flavio-22', nome_urna: 'FLAVIO BOLSONARO', nome_completo: 'Flávio Nantes Bolsonaro', partido_sigla: 'PL', nr_candidato: '22' } },
];

test('filtrarPresidentes: nome sem acento, sigla exata e número', () => {
  assert.deepEqual(filtrarPresidentes(chapas, 'flavio').map((p) => p.slug), ['flavio-22']);
  assert.deepEqual(filtrarPresidentes(chapas, 'Flávio').map((p) => p.slug), ['flavio-22']);
  assert.deepEqual(filtrarPresidentes(chapas, 'PT').map((p) => p.slug), ['lula-13']);
  assert.deepEqual(filtrarPresidentes(chapas, 'P'), []);
  assert.deepEqual(filtrarPresidentes(chapas, '2').map((p) => p.slug), ['flavio-22']);
  assert.deepEqual(filtrarPresidentes(null, 'lula'), []);
});

test('montarGrupos descarta vazios e corta em 5', () => {
  const itens = Array.from({ length: 8 }, (_, i) => ({ slug: `s${i}`, nome_urna: `N${i}`, partido_sigla: 'X', uf: 'RS', nr_candidato: 10 + i }));
  const g = montarGrupos([{ cargo: 'senador', rotulo: 'Senador', hrefBase: '/candidato-senador', itens, total: 8 }, { cargo: 'governador', itens: [], total: 0 }, null]);
  assert.equal(g.length, 1);
  assert.equal(g[0].itens.length, 5);
  assert.equal(g[0].total, 8);
  assert.deepEqual(itemEnxuto(itens[0]), { slug: 's0', nome: 'N0', partido: 'X', uf: 'RS', numero: '10', foto: null });
});

test('hrefTodos escolhe o cargo com mais resultados', () => {
  const g = [{ cargo: 'governador', total: 2 }, { cargo: 'deputado-federal', total: 40 }];
  assert.equal(hrefTodos(g, 'silva', 'RS'), '/eleicoes?cargo=deputado-federal&busca=silva');
  assert.equal(hrefTodos([{ cargo: 'deputado-estadual', total: 3 }], 'ana', 'RS'), '/eleicoes?cargo=deputado-estadual&busca=ana&uf=RS');
  assert.equal(hrefTodos([{ cargo: 'presidente', total: 1 }], 'lula', ''), '/eleicoes?cargo=presidente');
  assert.equal(hrefTodos([], 'x', ''), '/eleicoes');
});
