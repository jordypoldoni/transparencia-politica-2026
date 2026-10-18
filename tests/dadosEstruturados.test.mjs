import test from 'node:test';
import assert from 'node:assert/strict';
import { SITE, organizacao, site, migalhas, lista, conjuntoDeDados, pagina, grafo, jsonSeguro } from '../src/lib/dadosEstruturados.js';
import { descricaoDoPerfil } from '../src/lib/descricaoPerfil.js';
import { casaDoPerfil } from '../src/lib/casa.js';

test('organização e site: ligados pelo @id, sem campo vazio', () => {
  const o = organizacao(); const s = site();
  assert.equal(o['@type'], 'Organization');
  assert.equal(s.publisher['@id'], o['@id']);
  for (const v of Object.values(o)) assert.ok(v !== undefined && v !== null && v !== '');
});

test('migalhas: posições 1..n, endereço absoluto e item inválido fora', () => {
  const m = migalhas([{ nome: 'Início', caminho: '/' }, { nome: 'Votações', caminho: '/votacoes' }, null, { nome: 'sem caminho' }]);
  assert.equal(m.itemListElement.length, 2);
  assert.deepEqual(m.itemListElement.map((x) => x.position), [1, 2]);
  assert.equal(m.itemListElement[0].item, `${SITE}/`);
  assert.equal(m.itemListElement[1].item, `${SITE}/votacoes`);
});

test('lista: limita a quantidade e conta o que entrou', () => {
  const itens = Array.from({ length: 80 }, (_, i) => ({ nome: `V${i}`, caminho: `/votacao/${i}` }));
  const l = lista({ nome: 'x', caminho: '/votacoes/camara', itens, max: 50 });
  assert.equal(l.numberOfItems, 50);
  assert.equal(l.itemListElement[49].url, `${SITE}/votacao/49`);
});

test('conjunto de dados: leva a fonte oficial e nenhuma sem nome ou link', () => {
  const d = conjuntoDeDados({ nome: 'n', descricao: 'd', caminho: '/cpis', fontes: [{ nome: 'Câmara', url: 'https://dadosabertos.camara.leg.br' }, { nome: 'sem link' }] });
  assert.equal(d['@type'], 'Dataset');
  assert.equal(d.isBasedOn.length, 1);
  assert.equal(d.isBasedOn[0].url, 'https://dadosabertos.camara.leg.br');
  assert.equal(d.isAccessibleForFree, true);
});

test('grafo junta blocos e ignora vazios', () => {
  const g = grafo(organizacao(), [site(), null], undefined);
  assert.equal(g['@context'], 'https://schema.org');
  assert.equal(g['@graph'].length, 2);
});

test('jsonSeguro: nome com </script> não fecha a tag e o JSON continua válido', () => {
  const txt = jsonSeguro({ name: 'x</script><script>alert(1)</script>' });
  assert.ok(!txt.includes('</script>'));
  assert.equal(JSON.parse(txt).name, 'x</script><script>alert(1)</script>');
});

test('página: tipo configurável e @id próprio', () => {
  const p = pagina({ nome: 'n', descricao: 'd', caminho: '/sobre', tipo: 'AboutPage' });
  assert.equal(p['@type'], 'AboutPage');
  assert.equal(p['@id'], `${SITE}/sobre#pagina`);
});

const casaFed = casaDoPerfil({ fonte_api: 'camara', cargo_atual: 'Deputado Federal' });
const base = { perfil: { nome_urna: 'Ana Souza', cargo_atual: 'Deputado Federal', partido_atual: 'PT', uf_sede: 'RS' }, ano_referencia: 2026, total_geral: 123456, n_notas: 80,
  presenca: { compareceu: 90, total: 100, percentual: 90 }, coerencia: { percentual: 95.4 } };

test('descrição do perfil: usa o ano de referência (não "2026" fixo), presença, coerência e fonte', () => {
  const d = descricaoDoPerfil({ ...base, ano_referencia: 2025 }, casaFed);
  assert.match(d, /^Ana Souza é Deputado Federal \(PT-RS\)\./);
  assert.match(d, /Em 2025, usou R\$\s?123\.456 da cota parlamentar em 80 notas fiscais\./);
  assert.match(d, /Registrou voto em 90 de 100 votações nominais \(90%\)\./);
  assert.match(d, /Acompanhou o próprio partido em 95% das votações\./);
  assert.match(d, /Fonte: Câmara dos Deputados\.$/);
  assert.ok(!d.includes('2026'));
});

test('descrição do perfil: sem gastos, presença ou coerência, essas frases não aparecem (nada inventado)', () => {
  const d = descricaoDoPerfil({ perfil: base.perfil }, casaFed);
  assert.ok(!/usou|Registrou|Acompanhou/.test(d));
  assert.match(d, /^Ana Souza é Deputado Federal \(PT-RS\)\. Fonte: Câmara dos Deputados\.$/);
});

test('descrição do perfil: Assembleia do RS não fala em nota fiscal e usa "verba de gabinete"', () => {
  const casaRs = casaDoPerfil({ fonte_api: 'alergs', casa_legislativa: 'Assembleia (RS)' });
  const d = descricaoDoPerfil({ ...base }, casaRs);
  assert.ok(!d.includes('notas fiscais'));
  assert.match(d, /da verba de gabinete/);
  assert.match(d, /Fonte: Assembleia Legislativa do RS\./);
});

test('descrição do perfil: nunca passa muito de 320 caracteres', () => {
  const longo = { ...base, perfil: { ...base.perfil, nome_urna: 'Fulano de Tal da Silva Sauro dos Santos Albuquerque Cavalcanti' } };
  assert.ok(descricaoDoPerfil(longo, casaFed).length <= 330);
});

test('descrição do perfil: uma nota fiscal no singular', () => {
  assert.match(descricaoDoPerfil({ ...base, n_notas: 1 }, casaFed), /em 1 nota fiscal\./);
});
