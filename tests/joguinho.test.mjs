import test from 'node:test';
import assert from 'node:assert/strict';
import { FRASES, resultado, faixaDaMedia, posicao } from '../src/lib/joguinhoIdeologia.js';

const todas = (v) => Object.fromEntries(FRASES.map((f) => [f.id, v]));

test('12 frases, 6 por eixo, 3 de cada lado em cada eixo', () => {
  assert.equal(FRASES.length, 12);
  for (const eixo of ['economia', 'costumes']) {
    const f = FRASES.filter((x) => x.eixo === eixo);
    assert.equal(f.length, 6);
    assert.equal(f.filter((x) => x.lado === 'direita').length, 3);
    assert.equal(f.filter((x) => x.lado === 'esquerda').length, 3);
  }
  assert.equal(new Set(FRASES.map((f) => f.id)).size, 12);
});

test('concordar com tudo ou discordar de tudo dá centro (sem viés de concordância)', () => {
  for (const v of [2, -2, 0, 1, -1]) {
    const r = resultado(todas(v));
    assert.equal(r.faixaGeral, 2);
    assert.equal(r.faixaEconomia, 2);
    assert.equal(r.faixaCostumes, 2);
  }
});

test('respostas coerentes com um lado dão a faixa extrema', () => {
  const dir = Object.fromEntries(FRASES.map((f) => [f.id, f.lado === 'direita' ? 2 : -2]));
  const esq = Object.fromEntries(FRASES.map((f) => [f.id, f.lado === 'esquerda' ? 2 : -2]));
  assert.equal(resultado(dir).faixaGeral, 4);
  assert.equal(resultado(esq).faixaGeral, 0);
});

test('eixos podem divergir: esquerda na economia e direita nos costumes', () => {
  const r = resultado(Object.fromEntries(FRASES.map((f) => [f.id, (f.eixo === 'economia' ? f.lado === 'esquerda' : f.lado === 'direita') ? 2 : -2])));
  assert.equal(r.faixaEconomia, 0);
  assert.equal(r.faixaCostumes, 4);
  assert.equal(r.faixaGeral, 2);
});

test('cortes das faixas e posição do marcador', () => {
  assert.equal(faixaDaMedia(-2), 0);
  assert.equal(faixaDaMedia(-1.2), 0);
  assert.equal(faixaDaMedia(-1.19), 1);
  assert.equal(faixaDaMedia(-0.4), 1);
  assert.equal(faixaDaMedia(-0.39), 2);
  assert.equal(faixaDaMedia(0.39), 2);
  assert.equal(faixaDaMedia(0.4), 3);
  assert.equal(faixaDaMedia(1.2), 4);
  assert.equal(posicao(-2), 0);
  assert.equal(posicao(0), 50);
  assert.equal(posicao(2), 100);
  assert.equal(posicao(9), 100);
});

test('sem respostas não quebra', () => {
  assert.equal(resultado({}).faixaGeral, 2);
});
