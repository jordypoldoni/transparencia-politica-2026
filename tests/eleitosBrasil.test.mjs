import { test } from 'node:test';
import assert from 'node:assert/strict';
import { somarEleitos, governadorDoEstado, carregarEleitosBrasil } from '../src/lib/eleitosBrasil.js';

test('somarEleitos conta por partido e ignora vazio', () => {
  const c = somarEleitos({}, [{ partido: 'PL' }, { partido: 'PL' }, { partido: '' }, { partido: 'PT' }]);
  assert.deepEqual(c, { PL: 2, PT: 1 });
  assert.deepEqual(somarEleitos({ PL: 1 }, undefined), { PL: 1 });
});

test('governadorDoEstado: eleito no 1º turno', () => {
  const g = governadorDoEstado('RS', { secoes: { total: 10, totalizadas: 10 }, candidatos: [{ nome: 'A', partido: 'X', pct: '55,00', votos: 5, eleito: true }, { nome: 'B', votos: 4 }] }, null);
  assert.equal(g.eleito.nome, 'A');
  assert.deepEqual(g.finalistas, []);
  assert.equal(g.segundo, null);
  assert.equal(g.apurado, true);
});

test('governadorDoEstado: 2º turno com eleito', () => {
  const r1 = { secoes: { total: 10, totalizadas: 10 }, candidatos: [{ nome: 'A', segundoTurno: true, votos: 5 }, { nome: 'B', segundoTurno: true, votos: 4 }, { nome: 'C', votos: 1 }] };
  const r2 = { secoes: { total: 10, totalizadas: 10 }, candidatos: [{ nome: 'B', votos: 7, eleito: true }, { nome: 'A', votos: 6 }] };
  const g = governadorDoEstado('AM', r1, r2);
  assert.equal(g.eleito, null);
  assert.deepEqual(g.finalistas.map((c) => c.nome), ['A', 'B']);
  assert.equal(g.segundo.eleito.nome, 'B');
  assert.equal(g.segundo.apurado, true);
});

const arquivo = (cargo, eleitos) => ({ carg: [{ nmn: cargo, nv: '1', agr: [{ tp: 'i', nm: 'x', par: [{ sg: 'PL', cand: eleitos }] }] }], s: { ts: '10', st: '10', pst: '100,00' } });

test('carregarEleitosBrasil: sonda 404 não insiste', async () => {
  let pedidos = 0;
  const r = await carregarEleitosBrasil({ env: {}, buscar: async () => { pedidos++; const e = new Error('x'); e.status = 404; throw e; } });
  assert.equal(r.naoPublicado, true);
  assert.equal(pedidos, 1);
  assert.equal(r.governadores.length, 0);
});

test('carregarEleitosBrasil: soma os 27 estados', async () => {
  const buscar = async (url) => {
    if (url.includes('-c0003-')) return arquivo('Governador', [{ n: '1', nm: 'GOV', vap: '10', pvap: '60,00', e: 's', st: 'Eleito' }]);
    if (url.includes('-c0005-')) return arquivo('Senador', [{ n: '1', nm: 'S', vap: '10', e: 's', st: 'Eleito' }]);
    return arquivo('Deputado Federal', [{ n: '1', nm: 'D1', vap: '10', e: 's', st: 'Eleito' }, { n: '2', nm: 'D2', vap: '9', e: 's', st: 'Eleito' }]);
  };
  const r = await carregarEleitosBrasil({ env: {}, buscar });
  assert.equal(r.governadores.length, 27);
  assert.equal(r.senado.total, 27);
  assert.equal(r.camara.total, 54);
  assert.equal(r.camara.contagem.PL, 54);
  assert.equal(r.apurado, true); // seções 10/10 em tudo
  assert.equal(r.faltando.length, 0);
});
