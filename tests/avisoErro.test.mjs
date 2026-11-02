import test from 'node:test';
import assert from 'node:assert/strict';
import { validarAviso, caminhoSeguro, MAX_DESCRICAO } from '../src/lib/avisoErro.js';
import { linkAviso } from '../src/lib/contato.js';

test('aviso válido: monta página, texto com assunto e dado em dúvida, e fonte', () => {
  const v = validarAviso({ pagina: '/deputado/fulano?x=1#votos', assunto: 'Perfil de Fulano (PL-RS)', detalhe: 'R$ 10', descricao: 'O valor mostrado difere da Câmara.', fonte: 'https://www.camara.leg.br/x', email: 'a@b.com' });
  assert.equal(v.ok, true);
  assert.equal(v.dados.pagina, '/deputado/fulano?x=1');
  assert.equal(v.dados.email_retorno, 'a@b.com');
  assert.match(v.dados.descricao, /^Assunto: Perfil de Fulano \(PL-RS\)\nDado em dúvida: R\$ 10\nO valor mostrado difere/);
  assert.match(v.dados.descricao, /Fonte oficial citada: https:\/\/www\.camara\.leg\.br\/x$/);
  assert.ok(v.dados.descricao.length <= 2000);
});

test('aviso: texto curto demais ou longo demais é recusado com motivo', () => {
  assert.equal(validarAviso({ descricao: 'curto' }).ok, false);
  const longo = validarAviso({ descricao: 'a'.repeat(MAX_DESCRICAO + 1) });
  assert.equal(longo.ok, false);
  assert.ok(longo.motivo);
});

test('aviso: fonte precisa ser http(s) e e-mail precisa parecer e-mail', () => {
  assert.equal(validarAviso({ descricao: 'a'.repeat(20), fonte: 'javascript:alert(1)' }).ok, false);
  assert.equal(validarAviso({ descricao: 'a'.repeat(20), email: 'sem-arroba' }).ok, false);
  const v = validarAviso({ descricao: 'a'.repeat(20) });
  assert.equal(v.ok, true);
  assert.equal(v.dados.email_retorno, null);
  assert.equal(v.dados.pagina, '(não informada)');
});

test('aviso: campo escondido preenchido = robô, sem gravar', () => {
  const v = validarAviso({ site: 'http://spam', descricao: 'a'.repeat(20) });
  assert.equal(v.ok, true);
  assert.equal(v.robo, true);
  assert.equal(v.dados, undefined);
});

test('caminhoSeguro: só caminho interno do Lume', () => {
  assert.equal(caminhoSeguro('/estado/rs#x'), '/estado/rs');
  assert.equal(caminhoSeguro('//evil.com'), '');
  assert.equal(caminhoSeguro('https://evil.com'), '');
  assert.equal(caminhoSeguro(''), '');
});

test('linkAviso: caminho interno com página, assunto e dado; sem argumentos vai ao formulário', () => {
  const l = linkAviso({ caminho: '/deputado/fulano#votos', assunto: 'Perfil de Fulano', detalhe: 'R$ 10' });
  assert.ok(l.startsWith('/avisar-erro?'));
  const q = new URLSearchParams(l.split('?')[1]);
  assert.equal(q.get('pagina'), '/deputado/fulano');
  assert.equal(q.get('assunto'), 'Perfil de Fulano');
  assert.equal(q.get('detalhe'), 'R$ 10');
  assert.equal(linkAviso(), '/avisar-erro');
});
