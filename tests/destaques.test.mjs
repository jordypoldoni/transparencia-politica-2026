import test from 'node:test';
import assert from 'node:assert/strict';
import { statusSimples, explicarStatus, trechoCurto, montarMaisImportantes } from '../src/lib/destaques.js';

test('rótulos simples no cartão, termo oficial explicado à parte', () => {
  assert.deepEqual(statusSimples('Promulgada'), { rotulo: 'Já vale', tom: 'ok' });
  assert.equal(statusSimples('Sancionada').rotulo, 'Já é lei');
  assert.equal(statusSimples('Virou lei').rotulo, 'Já é lei');
  assert.equal(statusSimples('Aprovada').rotulo, 'Ainda não vale');
  assert.equal(statusSimples('Em análise').rotulo, 'Em análise');
  assert.equal(statusSimples('Arquivada').rotulo, 'Arquivada');
  assert.equal(statusSimples(''), null);
  assert.match(explicarStatus('Promulgada').texto, /Constituição/);
  assert.equal(explicarStatus('Promulgada').termo, 'Promulgada');
  assert.equal(explicarStatus('Arquivada'), null);
});

test('trecho tira negrito e corta em fim de palavra', () => {
  assert.equal(trechoCurto('A **jornada** cai.'), 'A jornada cai.');
  const longo = trechoCurto('palavra '.repeat(40), 50);
  assert.ok(longo.length <= 51 && longo.endsWith('…'));
  assert.equal(trechoCurto(null), '');
});

const resumo = (apelido) => ({ apelido, rotulo_proposicao: 'PEC 1', status: { rotulo: 'Promulgada' }, mudancas: ['Muda **tudo**.'] });

test('monta na ordem e descarta quem não tem resumo ou votação', () => {
  const r = montarMaisImportantes({
    casa: 'camara',
    destaques: [{ proposicao_id: '3', ordem: 3 }, { proposicao_id: '1', ordem: 1 }, { proposicao_id: '2', ordem: 2 }, { proposicao_id: '4', ordem: 4 }],
    resumos: { 'camara:1': resumo('Um'), 'camara:2': resumo('Dois'), 'camara:3': resumo('Três') },
    alvos: { 1: '10-1', 3: '30-1' },
  });
  assert.deepEqual(r.map((c) => c.apelido), ['Um', 'Três']);
  assert.equal(r[0].href, '/votacao/10-1');
  assert.equal(r[0].resumo, 'Muda tudo.');
  assert.equal(r[0].status.rotulo, 'Já vale');
});

test('entrada vazia não quebra', () => {
  assert.deepEqual(montarMaisImportantes({ casa: 'camara' }), []);
});
