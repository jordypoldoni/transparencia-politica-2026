import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cargoAtualTexto, chaveNomeNascimento, cargoAtualDoCandidato, linhaAtual } from '../src/lib/cargoAtual.js';

test('cargoAtualTexto traduz o cargo e respeita o gênero', () => {
  assert.equal(cargoAtualTexto('Deputado Federal', null, 'MASC.'), 'deputado federal');
  assert.equal(cargoAtualTexto('Deputado Federal', null, 'FEM.'), 'deputada federal');
  assert.equal(cargoAtualTexto('Deputado Estadual', true, 'MASC.'), 'deputado estadual');
  assert.equal(cargoAtualTexto('Senador(a)', true, 'FEM.'), 'senadora');
  assert.equal(cargoAtualTexto('Senador', true, 'MASC.'), 'senador');
});

test('cargoAtualTexto não afirma quando está fora de exercício ou o cargo é desconhecido', () => {
  assert.equal(cargoAtualTexto('Senador(a)', false, 'MASC.'), null);
  assert.equal(cargoAtualTexto('Prefeito', true, 'MASC.'), null);
  assert.equal(cargoAtualTexto(null, null, null), null);
});

test('chaveNomeNascimento ignora acento e caixa e exige data válida', () => {
  assert.equal(chaveNomeNascimento('João  Álvaro', '1970-05-01T00:00:00'), 'JOAO ALVARO|1970-05-01');
  assert.equal(chaveNomeNascimento('João', null), null);
  assert.equal(chaveNomeNascimento('', '1970-05-01'), null);
});

test('cargoAtualDoCandidato liga por agente_id ou por nome + nascimento, e usa o partido atual', () => {
  const ag = { id: 7, nome_completo: 'ANA SOUZA', data_nascimento: '1980-01-02', cargo_atual: 'Deputado Federal', partido_atual: 'UNIÃO', em_exercicio: null };
  const porId = new Map([[7, ag]]);
  const porNome = new Map([[chaveNomeNascimento(ag.nome_completo, ag.data_nascimento), ag]]);
  assert.deepEqual(cargoAtualDoCandidato({ agente_id: 7, genero: 'FEM.', partido_sigla: 'PL' }, porId, porNome), { cargo: 'deputada federal', partido: 'UNIÃO' });
  assert.deepEqual(cargoAtualDoCandidato({ agente_id: null, nome_completo: 'Ana Souza', data_nascimento: '1980-01-02', genero: 'MASC.', partido_sigla: 'PL' }, porId, porNome), { cargo: 'deputado federal', partido: 'UNIÃO' });
  assert.equal(cargoAtualDoCandidato({ agente_id: null, nome_completo: 'Outra Pessoa', data_nascimento: '1990-01-01' }, porId, porNome), null);
});

test('linhaAtual mostra só o partido quando o cargo atual não é conhecido', () => {
  assert.equal(linhaAtual({ cargo: 'deputado federal', partido: 'PL' }, 'NOVO'), 'Atualmente é deputado federal pelo PL');
  assert.equal(linhaAtual(null, 'PL'), 'PL');
  assert.equal(linhaAtual(undefined, ''), '');
});
