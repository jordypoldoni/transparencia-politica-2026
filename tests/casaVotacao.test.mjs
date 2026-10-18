import test from 'node:test';
import assert from 'node:assert/strict';
import { casaDaVotacao } from '../src/lib/casa.js';

test('casaDaVotacao lê o prefixo do id da votação', () => {
  assert.equal(casaDaVotacao({ votacao_id_externa: 'SF-6918' }).chave, 'senado');
  assert.equal(casaDaVotacao({ votacao_id_externa: 'ALERGS-2023-12' }).chave, 'rs');
  assert.equal(casaDaVotacao({ votacao_id_externa: '2122125-115' }).chave, 'camara');
});

test('o meta de getVotacao precisa levar votacao_id_externa (senão toda votação vira da Câmara)', async () => {
  const { readFileSync } = await import('node:fs');
  const fonte = readFileSync(new URL('../src/servicos/servico_api.js', import.meta.url), 'utf8');
  const trecho = fonte.slice(fonte.indexOf('getVotacao: async'), fonte.indexOf('const votos = votosData'));
  assert.match(trecho, /votacao_id_externa: id/);
});
