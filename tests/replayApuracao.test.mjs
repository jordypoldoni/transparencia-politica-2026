import test from 'node:test';
import assert from 'node:assert/strict';
import { horaDoMinuto, limitarMinuto, avancar, MINUTOS_TOTAIS, UFS_SEM_DETALHE, VELOCIDADES, VELOCIDADE_PADRAO } from '../src/lib/replayApuracao.js';

test('hora do minuto: base 17:00, passa da meia-noite', () => {
  assert.equal(horaDoMinuto(0), '17:00');
  assert.equal(horaDoMinuto(8), '17:08');
  assert.equal(horaDoMinuto(125), '19:05');
  assert.equal(horaDoMinuto(420), '00:00 (dia seguinte)');
  assert.equal(horaDoMinuto(598), '02:58 (dia seguinte)');
});

test('limitar minuto: dentro de 0 e o total, só inteiros, lixo vira 0', () => {
  assert.equal(limitarMinuto(-5), 0);
  assert.equal(limitarMinuto(12.9), 12);
  assert.equal(limitarMinuto(99999), MINUTOS_TOTAIS);
  assert.equal(limitarMinuto('abc'), 0);
  assert.equal(limitarMinuto(undefined), 0);
});

test('avançar: tempo real vira minutos de apuração e para no fim', () => {
  const a = avancar(0, 1000, 10);
  assert.equal(a.minuto, 10);
  assert.equal(a.fim, false);
  const meio = avancar(100, 500, 30);
  assert.equal(meio.minuto, 115);
  const fim = avancar(595, 1000, 30);
  assert.equal(fim.minuto, MINUTOS_TOTAIS);
  assert.equal(fim.fim, true);
  assert.equal(avancar(50, -1000, 10).minuto, 50); // tempo negativo não volta o relógio
});

test('estados sem detalhe e velocidades', () => {
  assert.deepEqual(UFS_SEM_DETALHE, ['MS', 'RN', 'SE', 'TO']);
  assert.ok(VELOCIDADES.some((v) => v.chave === VELOCIDADE_PADRAO));
  for (const v of VELOCIDADES) assert.ok(v.minPorSeg > 0 && v.rotulo.length > 0);
});

import { fracoes, urnasRecebidas } from '../src/lib/replayApuracao.js';

const DADOS = {
  minutos: 601,
  ufs: {
    AA: { total: 10, acum: [0, 2, 5, 10] },
    BB: { total: 4, acum: [0, 0, 1, 4] },
    CC: { total: 0, acum: [0] },
  },
};

test('frações por estado no minuto: acumulado dividido pelo total, limitado a 1', () => {
  assert.deepEqual(fracoes(DADOS, 0), { AA: 0, BB: 0 });
  assert.deepEqual(fracoes(DADOS, 1), { AA: 0.2, BB: 0 });
  assert.deepEqual(fracoes(DADOS, 2), { AA: 0.5, BB: 0.25 });
  assert.deepEqual(fracoes(DADOS, 3), { AA: 1, BB: 1 });
  assert.deepEqual(fracoes(DADOS, 500), { AA: 1, BB: 1 }); // depois do último minuto do arquivo, fica no total
});

test('frações: sem dados ou estado sem seções não quebra nem entra', () => {
  assert.deepEqual(fracoes(null, 5), {});
  assert.deepEqual(fracoes({}, 5), {});
  assert.ok(!('CC' in fracoes(DADOS, 1)));
});

test('urnas recebidas: soma de todos os estados com dado e percentual', () => {
  const r = urnasRecebidas(DADOS, 2);
  assert.equal(r.recebidas, 6);
  assert.equal(r.total, 14);
  assert.ok(Math.abs(r.pct - (6 / 14) * 100) < 1e-9);
  assert.deepEqual(urnasRecebidas(null, 2), { recebidas: 0, total: 0, pct: 0 });
});
