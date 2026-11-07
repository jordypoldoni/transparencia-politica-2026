import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const pagina = readFileSync(new URL('../pages/gastos-parlamentares.js', import.meta.url), 'utf8');
const api = readFileSync(new URL('../src/servicos/servico_api.js', import.meta.url), 'utf8');

test('a lista de comparação mostra a foto à esquerda do nome', () => {
  assert.match(pagina, /import Avatar from '..\/components\/Avatar'/);
  assert.match(pagina, /<Avatar nome=\{d\.nome_urna\} foto=\{d\.foto_url\}/);
});

test('a foto chega ao navegador, sempre em https', () => {
  assert.match(pagina, /foto_url: d\.foto_url \? String\(d\.foto_url\)\.replace\(\/\^http:\\\/\\\/\/, 'https:\/\/'\)/);
  const trecho = api.slice(api.indexOf('getRadarCompleto: async'));
  assert.match(trecho.slice(0, 600), /uf_sede, foto_url/);
});
