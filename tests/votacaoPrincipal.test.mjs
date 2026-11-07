import test from 'node:test';
import assert from 'node:assert/strict';
import { votacaoPrincipal } from '../src/lib/votacao.js';

const v = (id, descricao) => ({ votacao_id_externa: id, descricao });

test('a principal é a última do texto principal ou da redação final', () => {
  const lista = [v('1', 'Aprovado o Requerimento de Urgência.'), v('2', 'Aprovado o Projeto de Lei nº 1.'), v('3', 'Aprovada a Emenda nº 2.')];
  assert.equal(votacaoPrincipal(lista).votacao_id_externa, '2');
  const dois = [...lista, v('4', 'Aprovada a Redação Final.')];
  assert.equal(votacaoPrincipal(dois).votacao_id_externa, '4');
});

test('sem texto principal, vale a última do processo; vazio dá null', () => {
  assert.equal(votacaoPrincipal([v('1', 'Aprovado o Requerimento.'), v('2', 'Rejeitada a Emenda nº 3.')]).votacao_id_externa, '2');
  assert.equal(votacaoPrincipal([]), null);
  assert.equal(votacaoPrincipal(undefined), null);
});

test('o substitutivo conta como texto principal (PL votado por substitutivo)', () => {
  const lista = [v('1', 'Aprovado o Requerimento.'), v('2', 'Aprovado o Substitutivo ao Projeto de Lei nº 5.582, de 2025.'), v('3', 'Aprovada a Emenda de Plenário nº 25.')];
  assert.equal(votacaoPrincipal(lista).votacao_id_externa, '2');
});

test('substitutivo "ressalvados os destaques" também é o texto principal', () => {
  const lista = [v('1', 'Aprovado o Substitutivo ao Projeto de Lei nº 5.582, de 2025, adotado pelo relator da Comissão, ressalvados os destaques. Sim: 370; Não: 110.'), v('2', 'Rejeitada a Emenda de Plenário nº 33. Sim: 142; Não: 298.'), v('3', 'Aprovada a Emenda de Plenário nº 25. Sim: 349; Não: 40.')];
  assert.equal(votacaoPrincipal(lista).votacao_id_externa, '1');
});
