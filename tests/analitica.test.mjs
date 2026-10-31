import test from 'node:test';
import assert from 'node:assert/strict';
import { limparEnderecoParaMedicao } from '../src/lib/analitica.js';

test('a cola pessoal perde os parametros: nenhuma escolha de voto vai para a medicao', () => {
  const r = limparEnderecoParaMedicao({ type: 'pageview', url: 'https://www.lumecidadao.com.br/cola?uf=RS&df=fulano-1313&s=a-11,b-22&g=c-33&p=d-13#topo' });
  assert.equal(r.url, 'https://www.lumecidadao.com.br/cola');
  assert.equal(r.type, 'pageview');
});

test('o corte vale tambem para endereco relativo e para subcaminho de /cola', () => {
  assert.equal(limparEnderecoParaMedicao({ url: '/cola?df=x-1' }).url, 'https://www.lumecidadao.com.br/cola');
  assert.equal(limparEnderecoParaMedicao({ url: 'https://www.lumecidadao.com.br/cola/outra?s=x-1' }).url, 'https://www.lumecidadao.com.br/cola/outra');
});

test('outras paginas seguem inteiras, e /colaboracao nao e confundida com /cola', () => {
  const a = { url: 'https://www.lumecidadao.com.br/comecar?uf=RS' };
  assert.deepEqual(limparEnderecoParaMedicao(a), a);
  const b = { url: 'https://www.lumecidadao.com.br/colaboracao?x=1' };
  assert.deepEqual(limparEnderecoParaMedicao(b), b);
});

test('entrada invalida volta como veio, sem quebrar a pagina', () => {
  assert.equal(limparEnderecoParaMedicao(null), null);
  assert.deepEqual(limparEnderecoParaMedicao({ url: 123 }), { url: 123 });
});
