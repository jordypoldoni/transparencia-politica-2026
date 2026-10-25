import test from 'node:test';
import assert from 'node:assert/strict';
import { fracaoPorUf, ufsRecebendo, candidatosOrdemFixa, intervaloMapaMs, pctNumero } from '../src/lib/mapaVivo.js';

const est = (feitas, total) => ({ secoes: { totalizadas: feitas, total } });

test('fração por estado: parte das seções apuradas, limitada a 0..1', () => {
  const f = fracaoPorUf({ SP: est(50, 100), AC: est(0, 10), RJ: est(10, 10), XX: est(5, 0), YY: est(20, 10), ZZ: null });
  assert.equal(f.SP, 0.5); assert.equal(f.AC, 0); assert.equal(f.RJ, 1);
  assert.equal(f.XX, 0, 'sem seções = 0'); assert.equal(f.YY, 1, 'nunca passa de 1'); assert.equal(f.ZZ, 0);
  assert.deepEqual(fracaoPorUf(null), {});
});
test('recebendo agora: só quem começou e não terminou', () => {
  assert.deepEqual(ufsRecebendo({ SP: 0.5, AC: 0, RJ: 1, MG: 0.01 }).sort(), ['MG', 'SP']);
  assert.deepEqual(ufsRecebendo(null), []);
});
test('candidatos em ordem fixa por número de urna, mesmo que a votação mude', () => {
  const a = [{ numero: '22', votos: 900 }, { numero: '13', votos: 100 }];
  const b = [{ numero: '22', votos: 100 }, { numero: '13', votos: 900 }];
  assert.deepEqual(candidatosOrdemFixa(a).map((c) => c.numero), ['13', '22']);
  assert.deepEqual(candidatosOrdemFixa(b).map((c) => c.numero), ['13', '22']);
  assert.deepEqual(candidatosOrdemFixa(undefined), []);
  assert.equal(a[0].numero, '22', 'não altera o original');
});
test('intervalo: 10 s apurando, 30 s antes de começar e depois de fechar', () => {
  assert.equal(intervaloMapaMs({ SP: est(0, 10), AC: est(0, 5) }), 30000);
  assert.equal(intervaloMapaMs({ SP: est(3, 10), AC: est(0, 5) }), 10000);
  assert.equal(intervaloMapaMs({ SP: est(10, 10), AC: est(5, 5) }), 30000);
  assert.equal(intervaloMapaMs(null), 30000);
});
test('percentual em texto do TSE', () => {
  assert.equal(pctNumero('51,23'), 51.23); assert.equal(pctNumero('0,00'), 0);
  assert.equal(pctNumero(null), 0); assert.equal(pctNumero('abc'), 0); assert.equal(pctNumero('100,00'), 100);
});
