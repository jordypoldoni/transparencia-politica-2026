import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { reduzirResultado } from '../src/lib/apuracaoTse.js';
import { UFS_SOMA, combinarComSoma, montarCorpoDaSoma, pct2, carimbo, parteValida, modoDaSoma, anomaliaNacional, AUTO_LIGA_EM } from '../src/lib/somaEstados.js';

const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..', 'docs', 'fixtures_tse', 'turno1');
const temFixtures = fs.existsSync(path.join(dir, 'br.json'));
const ler = (n) => reduzirResultado(JSON.parse(fs.readFileSync(path.join(dir, `${n}.json`), 'utf8')), 'presidente');
const clone = (x) => JSON.parse(JSON.stringify(x));

function cenario() {
  const estados = {};
  for (const u of UFS_SOMA) estados[u] = ler(u.toLowerCase());
  return { nacional: ler('br'), estados, exterior: ler('zz') };
}
// Nacional "parado": tira votos de um estado grande do nacional, mantendo-o internamente coerente.
function nacionalParado(c, uf = 'SP') {
  const n = clone(c.nacional); const sp = c.estados[uf];
  n.secoes.totalizadas -= 100;
  n.eleitorado.comparecimento -= 1000;
  const tira = 1000; let resto = tira; // tira de votos válidos do 1º candidato e brancos nada
  n.candidatos[0].votos -= resto;
  n.votos.validos -= tira; n.votos.total -= tira;
  return n;
}

test('pct2: arredonda meio para cima, sem ponto flutuante', () => {
  assert.equal(pct2(1, 3), '33,33');
  assert.equal(pct2(2, 3), '66,67');
  assert.equal(pct2(1, 8), '12,50');
  assert.equal(pct2(1, 0), null);
  assert.equal(pct2(100, 100), '100,00');
});
test('carimbo: data e hora do TSE viram numero comparavel', () => {
  assert.ok(carimbo('05/10/2026 12:52:05') > carimbo('05/10/2026 12:51:59'));
  assert.equal(carimbo('lixo'), null);
});

test('GOLDEN: soma dos arquivos reais finais == nacional real (exceto carimbos/origem)', { skip: !temFixtures }, () => {
  const c = cenario();
  const corpo = montarCorpoDaSoma(c.nacional, c.estados, c.exterior);
  const esperado = clone(c.nacional);
  assert.deepEqual(corpo.secoes, esperado.secoes);
  assert.deepEqual(corpo.eleitorado, esperado.eleitorado);
  assert.deepEqual(corpo.votos, esperado.votos);
  assert.equal(corpo.total_candidatos, esperado.total_candidatos);
  assert.deepEqual(corpo.candidatos, esperado.candidatos);
  assert.deepEqual(corpo.eleitos, esperado.eleitos);
  for (const k of ['cargo', 'uf', 'nome_cargo', 'vagas']) assert.equal(corpo[k], esperado[k]);
});

test('fixtures reais: todas as partes passam em parteValida', { skip: !temFixtures }, () => {
  const c = cenario();
  assert.equal(parteValida(c.nacional), null);
  assert.equal(parteValida(c.exterior), null);
  for (const u of UFS_SOMA) assert.equal(parteValida(c.estados[u]), null, u);
});

test('nacional em dia (igual aos estados): nao usa a soma', { skip: !temFixtures }, () => {
  const c = cenario();
  const r = combinarComSoma(c);
  assert.equal(r.ok, false); assert.equal(r.motivo, 'nacional_em_dia');
});

test('nacional parado: soma entra, com origem e carimbo, formato igual ao nacional', { skip: !temFixtures }, () => {
  const c = cenario(); c.nacional = nacionalParado(c);
  const r = combinarComSoma(c);
  assert.equal(r.ok, true);
  assert.equal(r.corpo.origem, 'soma_dos_estados');
  assert.equal(r.corpo.nacional_gerado_em, c.nacional.gerado_em);
  assert.equal(r.corpo.votos.total, c.nacional.votos.total + 1000);
  assert.deepEqual(Object.keys(r.corpo).filter((k) => !['origem', 'nacional_gerado_em'].includes(k)).sort(), Object.keys(c.nacional).sort());
  assert.equal(r.corpo.gerado_em, '05/10/2026 12:52:05');
});

test('barreira: estado ausente, exterior ausente, estado corrompido', { skip: !temFixtures }, () => {
  const base = cenario(); base.nacional = nacionalParado(base);
  let c = clone(base); delete c.estados.MG;
  assert.deepEqual([combinarComSoma(c).ok, combinarComSoma(c).motivo], [false, 'estado_ausente']);
  c = clone(base); c.exterior = null;
  assert.equal(combinarComSoma(c).motivo, 'exterior_ausente');
  c = clone(base); c.estados.BA.votos.validos += 5;
  assert.equal(combinarComSoma(c).motivo, 'arquivo_invalido');
  c = clone(base); c.estados.RJ.votos.total = 'x';
  assert.equal(combinarComSoma(c).motivo, 'arquivo_invalido');
  c = clone(base); c.estados.PA.secoes.totalizadas = c.estados.PA.secoes.total + 1;
  assert.equal(combinarComSoma(c).motivo, 'arquivo_invalido');
  assert.equal(combinarComSoma({ nacional: null, estados: base.estados, exterior: base.exterior }).motivo, 'sem_nacional');
});

test('barreira: estado regride (soma fica atras em um candidato ou nos totais) => nacional', { skip: !temFixtures }, () => {
  const base = cenario(); base.nacional = nacionalParado(base);
  // candidato no nacional com mais votos do que a soma, mesmo com total da soma a frente
  let c = clone(base); c.nacional.candidatos[1].votos += 500; c.nacional.votos.validos += 500; c.nacional.votos.total -= 0;
  c.nacional.votos.total = base.nacional.votos.total; // total ainda atras da soma
  const r = combinarComSoma(c);
  assert.equal(r.ok, false); assert.ok(['candidato_com_menos_votos', 'total_menor_que_nacional'].includes(r.motivo), r.motivo);
  // candidato extra/ausente
  c = clone(base); c.estados.AC.candidatos[0].numero = '99';
  assert.equal(combinarComSoma(c).ok, false);
  // total de secoes ou eleitorado diferente
  c = clone(base); c.nacional.eleitorado.total += 1;
  assert.equal(combinarComSoma(c).ok, false);
});

test('soma nunca devolve ok sem origem e nunca altera as entradas', { skip: !temFixtures }, () => {
  const c = cenario(); c.nacional = nacionalParado(c);
  const antes = JSON.stringify(c);
  const r = combinarComSoma(c);
  assert.equal(JSON.stringify(c), antes);
  assert.equal(r.ok && r.corpo.origem, 'soma_dos_estados');
});

test('modoDaSoma: explicito vale sempre; ausente/auto/desconhecido vira sombra ate 23/10 09h e on depois', () => {
  const antes = AUTO_LIGA_EM - 1, depois = AUTO_LIGA_EM;
  for (const t of [antes, depois]) {
    assert.equal(modoDaSoma({ APURACAO_SOMA_ESTADOS: 'off' }, t), 'off');
    assert.equal(modoDaSoma({ APURACAO_SOMA_ESTADOS: 'sombra' }, t), 'sombra');
    assert.equal(modoDaSoma({ APURACAO_SOMA_ESTADOS: ' ON ' }, t), 'on');
  }
  for (const env of [{}, { APURACAO_SOMA_ESTADOS: '' }, { APURACAO_SOMA_ESTADOS: 'auto' }, { APURACAO_SOMA_ESTADOS: 'talvez' }]) {
    assert.equal(modoDaSoma(env, antes), 'sombra'); assert.equal(modoDaSoma(env, depois), 'on');
  }
  assert.equal(AUTO_LIGA_EM, Date.parse('2026-10-23T12:00:00Z'));
});

test('anomaliaNacional: so acusa nacional igual ou mais novo e menor', () => {
  const ent = { total: 1000, carimbo: carimbo('05/10/2026 12:00:00') };
  const nac = (gerado_em, total) => ({ gerado_em, votos: { total } });
  assert.equal(anomaliaNacional(null, nac('05/10/2026 13:00:00', 1)), null);
  assert.equal(anomaliaNacional(ent, nac('05/10/2026 11:59:59', 1)), null);   // mais antigo: pode estar parado
  assert.ok(anomaliaNacional(ent, nac('05/10/2026 12:00:00', 999)));          // mesmo instante e menor
  assert.ok(anomaliaNacional(ent, nac('05/10/2026 12:30:00', 500)));          // mais novo e menor
  assert.equal(anomaliaNacional(ent, nac('05/10/2026 12:30:00', 1000)), null); // alcancou
  assert.equal(anomaliaNacional(ent, nac('lixo', 1)), null);                   // carimbo ilegivel: nao acusa
});
