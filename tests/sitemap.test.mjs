import test from 'node:test';
import assert from 'node:assert/strict';
import { TIPOS, FIXAS, dataIso, conjuntoDeUrls, indice, entradasDoTipo, caminhoDoTipo, escapar } from '../src/lib/sitemap.js';

const BASE = 'https://www.lumecidadao.com.br';
const locs = (xml) => [...xml.matchAll(/<loc>([^<]*)<\/loc>/g)].map((m) => m[1]);

test('dataIso: data válida vira AAAA-MM-DD; ausente e inválida viram null', () => {
  assert.equal(dataIso('2026-10-16T21:30:00.000Z'), '2026-10-16');
  assert.equal(dataIso(new Date('2026-01-24T00:00:00Z')), '2026-01-24');
  assert.equal(dataIso(null), null);
  assert.equal(dataIso(''), null);
  assert.equal(dataIso('não é data'), null);
});

test('índice: um sitemap por tipo, endereços /sitemap-<tipo>.xml', () => {
  const xml = indice(BASE);
  assert.match(xml, /<sitemapindex /);
  assert.deepEqual(locs(xml), TIPOS.map((t) => BASE + caminhoDoTipo(t)));
  assert.ok(locs(xml).includes(`${BASE}/sitemap-votacoes.xml`));
});

test('conjunto: tira repetidos e "#", escapa & e põe lastmod só quando a data é válida', () => {
  const xml = conjuntoDeUrls(BASE, [
    '/a', '/a', '#',
    { caminho: '/b?x=1&y=2', lastmod: '2026-10-16T10:00:00Z' },
    { caminho: '/c', lastmod: 'lixo' },
    { caminho: '/d' },
  ]);
  assert.deepEqual(locs(xml), [`${BASE}/a`, `${BASE}/b?x=1&amp;y=2`, `${BASE}/c`, `${BASE}/d`]);
  assert.match(xml, /<loc>https:\/\/www\.lumecidadao\.com\.br\/b\?x=1&amp;y=2<\/loc><lastmod>2026-10-16<\/lastmod>/);
  assert.equal((xml.match(/<lastmod>/g) || []).length, 1);
});

test('conjunto: lista vazia ainda é XML válido', () => {
  const xml = conjuntoDeUrls(BASE, []);
  assert.match(xml, /<urlset [^>]*>\n\n<\/urlset>$/);
  assert.deepEqual(locs(xml), []);
});

test('páginas: fixas, estados e listas de votação; sem /presidenciaveis (redireciona)', () => {
  const c = entradasDoTipo('paginas');
  for (const f of FIXAS) assert.ok(c.includes(f), f);
  assert.ok(c.includes('/afinidade'));
  assert.ok(c.includes('/estado/RS') && c.includes('/estado/DF'));
  assert.equal(c.filter((x) => x.startsWith('/estado/')).length, 27);
  assert.ok(c.includes('/votacoes/camara') && c.includes('/votacoes/senado') && c.includes('/votacoes/rs'));
  assert.ok(!c.includes('/presidenciaveis'));
});

test('perfis: deputado em /deputado/, senador em /senador/, com lastmod da data de atualização', () => {
  const e = entradasDoTipo('perfis', { perfis: [
    { slug: 'ana-pt-rs-1', cargo_atual: 'Deputado Federal', fonte_api: 'camara', casa_legislativa: 'Câmara', data_atualizacao: '2026-10-18T03:00:00Z' },
    { slug: 'beto-mdb-sp-2', cargo_atual: 'Senador', fonte_api: 'senado', casa_legislativa: 'Senado', data_atualizacao: null },
  ] });
  assert.equal(e.length, 2);
  assert.match(e[0].caminho, /^\/deputado\/ana-pt-rs-1$/);
  assert.match(e[1].caminho, /^\/senador\/beto-mdb-sp-2$/);
  const xml = conjuntoDeUrls(BASE, e);
  assert.equal((xml.match(/<lastmod>2026-10-18<\/lastmod>/g) || []).length, 1);
});

test('votações: /votacao/<id> com lastmod; linha sem id fica fora; id é escapado na URL', () => {
  const e = entradasDoTipo('votacoes', { votacoes: [
    { votacao_id_externa: '2345-12', data_insercao: '2026-10-16T00:00:00Z' },
    { votacao_id_externa: null, data_insercao: '2026-10-16' },
    { votacao_id_externa: 'a b/c', data_insercao: null },
  ] });
  assert.deepEqual(e.map((x) => x.caminho), ['/votacao/2345-12', '/votacao/a%20b%2Fc']);
});

test('fiscal: /ente/<cod> só para quem tem código', () => {
  assert.deepEqual(entradasDoTipo('fiscal', { fiscal: [{ cod_ibge: 1 }, { cod_ibge: 43 }, {}] }), ['/ente/1', '/ente/43']);
});

test('candidatos: devolve os caminhos como vieram; tipo desconhecido devolve null', () => {
  assert.deepEqual(entradasDoTipo('candidatos', { candidatos: ['/presidencial/x'] }), ['/presidencial/x']);
  assert.equal(entradasDoTipo('xyz'), null);
});

test('escapar cobre os cinco caracteres do XML', () => {
  assert.equal(escapar(`<&>"'`), '&lt;&amp;&gt;&quot;&apos;');
});

test('cpis: /cpis/rcp-N-AAAA com lastmod da ultima movimentacao; sem numero ou ano fica fora', () => {
  const r = entradasDoTipo('cpis', { cpis: [{ numero: 1, ano: 2026, data_situacao: '2026-07-20' }, { numero: 2, ano: 2023, data_situacao: null }, {}, { numero: 3 }] });
  assert.deepEqual(r, [{ caminho: '/cpis/rcp-1-2026', lastmod: '2026-07-20' }, { caminho: '/cpis/rcp-2-2023', lastmod: null }]);
  assert.ok(TIPOS.includes('cpis'));
});

