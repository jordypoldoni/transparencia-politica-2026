import test from 'node:test';
import assert from 'node:assert/strict';
import { urlDoResultado, urlPresidentePorUf, reduzirResultado, UFS } from '../src/lib/apuracaoTse.js';
import { turnoValido, disponivelNoTurno, ehSegundoTurno } from '../src/lib/turnos.js';
import { fonteGastosEstadual, seloDoCargoCandidato } from '../src/lib/selosFonte.js';
import handler from '../pages/api/apuracao.js';

const ENV = {};

test('URL do TSE: 1o turno, nacional e por UF', () => {
  assert.equal(urlDoResultado('presidente', undefined, ENV).url,
    'https://resultados.tse.jus.br/oficial/ele2026/6257/dados/br/br-c0001-e006257-u.json');
  assert.equal(urlDoResultado('governador', 'rs', ENV).url,
    'https://resultados.tse.jus.br/oficial/ele2026/6259/dados/rs/rs-c0003-e006259-u.json');
});
test('deputado estadual no DF usa o codigo distrital 0008', () => {
  assert.match(urlDoResultado('deputado-estadual', 'DF', ENV).url, /df-c0008-/);
  assert.match(urlDoResultado('deputado-estadual', 'SP', ENV).url, /sp-c0007-/);
});
test('combinacao invalida NAO gera URL (404 em excesso bloqueia o IP)', () => {
  assert.equal(urlDoResultado('prefeito', 'RS', ENV), null);
  assert.equal(urlDoResultado('governador', 'ZZ', ENV), null);
  assert.equal(urlDoResultado('governador', undefined, ENV), null);
  assert.equal(urlDoResultado('governador', 'RS', ENV, 3), null);
  assert.equal(urlPresidentePorUf('ZZ', ENV), null);
});
test('2o turno: so presidente e governador de AC, AM, DF, ES, RN, TO', () => {
  assert.ok(urlDoResultado('governador', 'AC', ENV, 2));
  assert.ok(urlDoResultado('presidente', undefined, ENV, 2));
  assert.equal(urlDoResultado('governador', 'RS', ENV, 2), null);
  assert.equal(urlDoResultado('senador', 'AC', ENV, 2), null);
  assert.match(urlDoResultado('governador', 'AC', ENV, 2).url, /\/6260\/dados\/ac\/ac-c0003-e006260-u\.json$/);
  assert.equal(disponivelNoTurno(2, 'deputado-federal', 'AC'), false);
});
test('variaveis de ambiente do simulado trocam base e eleicao so no 1o turno', () => {
  const env = { TSE_RESULTADOS_BASE: 'https://x.test/sim/', TSE_ELEICAO_ESTADUAL: '21272' };
  assert.equal(urlDoResultado('governador', 'RS', env).url, 'https://x.test/sim/ele2026/21272/dados/rs/rs-c0003-e021272-u.json');
  assert.match(urlDoResultado('governador', 'AC', env, 2).url, /\/6260\//);
});
test('turnoValido e ehSegundoTurno', () => {
  assert.equal(turnoValido(undefined), 1);
  assert.equal(turnoValido('2'), 2);
  assert.equal(turnoValido('3'), null);
  assert.equal(ehSegundoTurno('2º turno'), true);
  assert.equal(ehSegundoTurno('Eleito'), false);
  assert.equal(UFS.length, 27);
});

test('reduzirResultado: ordena por voto, separa eleito de 2o turno, calcula nulos sobre o total', () => {
  const json = {
    cdabr: 'rs',
    carg: [{ nmn: 'Governador', nv: '1', agr: [
      { tp: 'i', nm: 'A', par: [{ sg: 'AAA', cand: [{ n: '11', nmu: 'Ana', vap: '1.000', pvap: '40,00', e: 's', st: '2º turno' }] }] },
      { tp: 'i', nm: 'B', par: [{ sg: 'BBB', cand: [{ n: '22', nmu: 'Bia', vap: '1.500', pvap: '60,00', e: 'n', st: 'Não eleito' }] }] },
    ] }],
    s: { ts: '100', st: '50', pst: '50,00' },
    e: { te: '5000', c: '3000' },
    v: { tv: '3000', vv: '2500', vn: '300', vb: '200' },
  };
  const r = reduzirResultado(json, 'governador');
  assert.equal(r.uf, 'RS');
  assert.deepEqual(r.candidatos.map((c) => c.nome), ['Bia', 'Ana']);
  assert.equal(r.candidatos[0].votos, 1500);
  assert.equal(r.candidatos[1].segundoTurno, true);
  assert.equal(r.candidatos[1].eleito, false); // e="s" do 2o turno nao e eleicao
  assert.equal(r.eleitos.length, 0);
  assert.equal(r.votos.pct_nulos, '10,00');
  assert.equal(r.secoes.totalizadas, 50);
});
test('reduzirResultado: arquivo vazio nao quebra', () => {
  const r = reduzirResultado({}, 'governador');
  assert.equal(r.total_candidatos, 0);
  assert.equal(r.votos.pct_nulos, null);
});

test('selos: fonte certa por UF e cargo', () => {
  assert.equal(fonteGastosEstadual('mg').fonte, 'gastos_almg');
  assert.equal(fonteGastosEstadual('BA'), null);
  assert.equal(seloDoCargoCandidato('deputado-estadual').aoVivo, true);
  assert.equal(seloDoCargoCandidato('xyz'), null);
});

// Teste de fumaca da rota: entradas invalidas respondem sem falar com o TSE nem com o banco.
const resFalsa = () => { const r = { cabecalhos: {} }; r.setHeader = (k, v) => { r.cabecalhos[k] = v; }; r.status = (c) => { r.codigo = c; return r; }; r.json = (c) => { r.corpo = c; return r; }; return r; };
test('/api/apuracao: POST da 405; cargo, UF ou turno invalido da 400 (sem pedir ao TSE)', async () => {
  const antes = globalThis.fetch;
  globalThis.fetch = () => { throw new Error('nao deveria chamar o TSE'); };
  try {
    let r = resFalsa(); await handler({ method: 'POST', query: {} }, r); assert.equal(r.codigo, 405);
    r = resFalsa(); await handler({ method: 'GET', query: { cargo: 'prefeito', uf: 'RS' } }, r); assert.equal(r.codigo, 400);
    r = resFalsa(); await handler({ method: 'GET', query: { cargo: 'governador', uf: 'ZZ' } }, r); assert.equal(r.codigo, 400);
    r = resFalsa(); await handler({ method: 'GET', query: { cargo: 'governador', uf: 'RS', turno: '2' } }, r); assert.equal(r.codigo, 400);
  } finally { globalThis.fetch = antes; }
});
