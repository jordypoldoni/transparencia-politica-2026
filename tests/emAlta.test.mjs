import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizar, contemTermo, lerTendencias, lerManchetes, avaliarEmAlta } from '../src/lib/emAlta.js';

test('normaliza acento, caixa e pontuação', () => {
  assert.equal(normalizar('  Fim da Escala 6x1! '), 'fim da escala 6x1');
  assert.equal(normalizar('PIS/Cofins'), 'pis cofins');
});

test('termo só casa como palavra inteira', () => {
  assert.equal(contemTermo('votação do PLP 114 hoje', ['PLP 114']), true);
  assert.equal(contemTermo('PLP 1140', ['PLP 114']), false);
  assert.equal(contemTermo('Quebra de bancos', ['quebra de bancos']), true);
  assert.equal(contemTermo('', ['x']), false);
  assert.equal(contemTermo('qualquer', []), false);
});

test('lê as buscas em alta do feed', () => {
  const xml = '<item><title>escala 6x1</title><ht:approx_traffic>2.000+</ht:approx_traffic></item><item><title>jogo</title></item>';
  assert.deepEqual(lerTendencias(xml), [{ titulo: 'escala 6x1', trafego: 2000 }, { titulo: 'jogo', trafego: 0 }]);
});

test('lê manchetes sem o veículo e decodifica', () => {
  const xml = '<item><title>Câmara vota &quot;MEI&quot; - Folha de S.Paulo</title></item><item><title><![CDATA[Outra - O Globo]]></title></item>';
  assert.deepEqual(lerManchetes(xml), ['Câmara vota "MEI"', 'Outra']);
});

const dest = [
  { casa: 'camara', proposicao_id: '1', termos: ['escala 6x1'] },
  { casa: 'senado', proposicao_id: '2', termos: ['escala 6x1'] },
  { casa: 'camara', proposicao_id: '3', termos: ['MEI'] },
  { casa: 'camara', proposicao_id: '4', termos: [] },
];

test('cruza as duas fontes e ordena por quantas fontes a matéria tem', () => {
  const r = avaliarEmAlta({
    destaques: dest,
    tendencias: [{ titulo: 'Escala 6x1', trafego: 500 }],
    manchetes: { 'escala 6x1': ['a escala 6x1', 'b escala 6x1', 'c escala 6x1'], MEI: ['MEI sobe', 'MEI cai'] },
  });
  assert.deepEqual(r.map((x) => [x.casa, x.proposicao_id, x.fontes]), [['camara', '1', ['google', 'noticias']], ['senado', '2', ['google', 'noticias']]]);
  assert.equal(r[0].detalhe.trafego, 500);
});

test('poucas manchetes não contam, e fonte que falhou não derruba a outra', () => {
  assert.deepEqual(avaliarEmAlta({ destaques: dest, tendencias: [], manchetes: { MEI: ['MEI 1', 'MEI 2'] } }), []);
  const so = avaliarEmAlta({ destaques: dest, tendencias: null, manchetes: { 'escala 6x1': ['escala 6x1', 'escala 6x1', 'escala 6x1'] } });
  assert.deepEqual(so[0].fontes, ['noticias']);
  const sg = avaliarEmAlta({ destaques: dest, tendencias: [{ titulo: 'mei', trafego: 0 }], manchetes: null });
  assert.deepEqual(sg.map((x) => x.proposicao_id), ['3']);
});
