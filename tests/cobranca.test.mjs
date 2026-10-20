import test from 'node:test';
import assert from 'node:assert/strict';
import { montarCobrancaVoto, montarCobrancaGasto, validarPergunta, PERGUNTA_VOTO, PERGUNTA_GASTO, AVISO_PADRAO, AVISO_CIDADAO } from '../src/lib/cobranca.js';
import { linkErro, CONTATO, BASE_SITE } from '../src/lib/contato.js';
import { CORRECOES } from '../src/dados/correcoes.js';

const perfil = { nome_urna: 'Fulano', partido_atual: 'PL', uf_sede: 'RS' };

test('cobrança de voto: fato, data, fonte e a pergunta-padrão', () => {
  const c = montarCobrancaVoto({ perfil, voto: { voto_tipo: 'Sim', data_voto: '2026-09-10' }, titulo: 'Altera a lei X', fonteNome: 'Câmara dos Deputados' });
  assert.equal(c.fato, 'Fulano votou Sim');
  assert.equal(c.data, '10/09/2026');
  assert.equal(c.pergunta, PERGUNTA_VOTO);
  assert.equal(c.aviso, AVISO_PADRAO);
  assert.equal(c.fonte, 'Fonte: Câmara dos Deputados');
  assert.match(c.texto, /Fulano \(PL-RS\) votou Sim em 10\/09\/2026/);
});

test('cobrança de voto: título longo é cortado; sem voto devolve null', () => {
  const c = montarCobrancaVoto({ perfil, voto: { voto_tipo: 'Não', data_voto: '2026-09-10' }, titulo: 'x '.repeat(300), fonteNome: 'Senado Federal' });
  assert.ok(c.contexto.length <= 230);
  assert.ok(c.contexto.endsWith('…'));
  assert.equal(montarCobrancaVoto({ perfil, voto: null, titulo: 'a', fonteNome: 'x' }), null);
});

test('cobrança de gasto: média, % do teto só quando existe; sem gasto devolve null', () => {
  const c = montarCobrancaGasto({ perfil, ano: 2026, total: 120000, media: 12000, pctTeto: 23, fonteNome: 'Câmara dos Deputados' });
  assert.match(c.contexto, /23% do teto mensal/);
  assert.equal(c.pergunta, PERGUNTA_GASTO);
  const s = montarCobrancaGasto({ perfil, ano: 2026, total: 120000, media: 12000, pctTeto: null, fonteNome: 'Assembleia' });
  assert.doesNotMatch(s.contexto, /teto/);
  assert.equal(montarCobrancaGasto({ perfil, ano: 2026, total: 0, media: 0, pctTeto: null, fonteNome: 'x' }), null);
});

test('neutralidade: a pergunta não muda por parlamentar e não traz adjetivo de julgamento', () => {
  const a = montarCobrancaVoto({ perfil, voto: { voto_tipo: 'Sim', data_voto: '2026-09-10' }, titulo: 't', fonteNome: 'f' });
  const b = montarCobrancaVoto({ perfil: { nome_urna: 'Outra', partido_atual: 'PT', uf_sede: 'SP' }, voto: { voto_tipo: 'Não', data_voto: '2026-09-11' }, titulo: 'u', fonteNome: 'f' });
  assert.equal(a.pergunta, b.pergunta);
  assert.doesNotMatch(`${a.texto} ${a.pergunta}`, /vergonha|absurdo|traiu|corrupt|culpa/i);
});

test('linkErro: mailto com assunto, página e dado preenchidos; hash sai', () => {
  const l = linkErro({ caminho: '/deputado/fulano?x=1#votos', assunto: 'Perfil de Fulano', detalhe: 'R$ 10' });
  assert.ok(l.startsWith(`mailto:${CONTATO}?subject=`));
  const corpo = decodeURIComponent(l.split('&body=')[1]);
  assert.match(corpo, new RegExp(`Página: ${BASE_SITE}/deputado/fulano\\?x=1\\n`));
  assert.match(corpo, /Dado em dúvida: R\$ 10/);
  assert.doesNotMatch(corpo, /#votos/);
  assert.match(decodeURIComponent(l.split('?subject=')[1].split('&')[0]), /Erro no Lume: Perfil de Fulano/);
});

test('linkErro: sem argumentos ainda gera e-mail válido', () => {
  const l = linkErro();
  assert.ok(l.startsWith('mailto:'));
  assert.match(decodeURIComponent(l.split('&body=')[1]), new RegExp(`Página: ${BASE_SITE}\\n`));
});

test('CORRECOES: cada item tem data, erro e correção', () => {
  for (const c of CORRECOES) {
    assert.match(c.data, /^\d{4}-\d{2}-\d{2}$/);
    assert.ok(c.erro && c.correcao);
  }
});

test('pergunta do cidadão: vale quando válida, rotula como cidadão e segue no texto de compartilhar', () => {
  const c = montarCobrancaVoto({ perfil, voto: { voto_tipo: 'Sim', data_voto: '2026-09-10' }, titulo: 'Altera a lei X', fonteNome: 'Câmara', pergunta: 'Por que o senhor votou a favor desta urgência?', materia: 'PL 1/2026', etapa: 'Urgência', resultado: 'Aprovado no plenário' });
  assert.equal(c.personalizada, true);
  assert.equal(c.pergunta, 'Por que o senhor votou a favor desta urgência?');
  assert.equal(c.aviso, AVISO_CIDADAO);
  assert.equal(c.materia, 'PL 1/2026 · Urgência');
  assert.match(c.texto, /Pergunta de um cidadão: "Por que o senhor votou/);
  assert.match(c.texto, /aprovado no plenário/);
});

test('pergunta do cidadão: igual à padrão, vazia ou inválida volta para a padrão', () => {
  const base = { perfil, voto: { voto_tipo: 'Sim', data_voto: '2026-09-10' }, titulo: 't', fonteNome: 'f' };
  assert.equal(montarCobrancaVoto({ ...base, pergunta: 'pode explicar o voto?' }).personalizada, false);
  assert.equal(montarCobrancaVoto({ ...base, pergunta: '' }).pergunta, PERGUNTA_VOTO);
  const ruim = montarCobrancaVoto({ ...base, pergunta: 'Fulano é um ladrão' });
  assert.equal(ruim.pergunta, PERGUNTA_VOTO);
  assert.equal(ruim.aviso, AVISO_PADRAO);
  assert.equal(montarCobrancaGasto({ perfil, ano: 2026, total: 10, media: 1, pctTeto: null, fonteNome: 'f', pergunta: 'Onde foi usada essa verba?' }).personalizada, true);
});

test('validarPergunta: tamanho, ofensa, acusação, link, contato e maiúsculas', () => {
  assert.equal(validarPergunta('Qual foi o motivo desse voto?').ok, true);
  assert.equal(validarPergunta('curto').ok, false);
  assert.equal(validarPergunta('a '.repeat(80)).ok, false);
  for (const ruim of ['Esse ladrão vai explicar?', 'Você é um VERGONHA para o estado', 'Veja em www.site.com o que ele fez', 'Fale comigo em joao@email.com agora', 'Ligue 51 99999-8888 para saber', 'ISSO FOI UM ABSURDO TOTAL DELES', 'Foi corrupção esse voto?']) {
    assert.equal(validarPergunta(ruim).ok, false, ruim);
  }
  assert.match(validarPergunta('Esse ladrão vai explicar?').motivo, /ofensa ou uma acusação/);
  // palavra comum que contém uma bloqueada não pode ser barrada à toa
  assert.equal(validarPergunta('O projeto trata de mateus e de compra pública. Pode explicar?').ok, true);
});

test('resumo do voto: corta no fim de uma frase quando possível', () => {
  const longo = `${'Frase curta e clara sobre o tema. '.repeat(10)}`;
  const c = montarCobrancaVoto({ perfil, voto: { voto_tipo: 'Sim', data_voto: '2026-09-10' }, titulo: longo, fonteNome: 'f' });
  assert.ok(c.contexto.length <= 230);
  assert.ok(c.contexto.endsWith('.') || c.contexto.endsWith('…'));
});
