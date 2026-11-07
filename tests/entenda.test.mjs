import test from 'node:test';
import assert from 'node:assert/strict';
import { chaveEntenda, normalizarEntenda } from '../src/lib/entenda.js';

test('chave junta casa e proposição, e é nula sem um dos dois', () => {
  assert.equal(chaveEntenda('senado', 174386), 'senado:174386');
  assert.equal(chaveEntenda('camara', '2236186'), 'camara:2236186');
  assert.equal(chaveEntenda('senado', null), null);
  assert.equal(chaveEntenda('', 5), null);
});

test('entrada ruim vira null e nunca lança erro', () => {
  assert.equal(normalizarEntenda(null), null);
  assert.equal(normalizarEntenda('texto'), null);
  assert.equal(normalizarEntenda({}), null);
  assert.equal(normalizarEntenda({ mudancas: [1, null, ''] }), null);
});

test('barras: largura proporcional ao maior valor, com piso para não sumir', () => {
  const d = normalizarEntenda({ barras: { titulo: 'Horas', itens: [{ rotulo: 'Hoje', valor: 44, unidade: 'h' }, { rotulo: 'Depois', valor: 40, unidade: 'h', destaque: true }] } });
  assert.equal(d.barras.itens[0].largura, 100);
  assert.equal(d.barras.itens[1].largura, 90.9);
  assert.equal(d.barras.itens[1].destaque, true);
});

test('dias: limita a 7 e descarta linha sem dia', () => {
  const d = normalizarEntenda({ dias: { linhas: [{ rotulo: 'Hoje', trabalho: 6, descanso: 1 }, { rotulo: 'Vazia', trabalho: 0, descanso: 0 }, { rotulo: 'Exagero', trabalho: 20, descanso: 20 }] } });
  assert.equal(d.dias.linhas.length, 2);
  assert.equal(d.dias.linhas[1].trabalho, 7);
});

test('fontes só aceitam https; link inseguro perde a URL mas mantém o rótulo', () => {
  const d = normalizarEntenda({ mudancas: ['x'], fontes: [{ rotulo: 'Senado', url: 'https://legis.senado.leg.br/x' }, { rotulo: 'Ruim', url: 'javascript:alert(1)' }] });
  assert.equal(d.fontes[0].url, 'https://legis.senado.leg.br/x');
  assert.equal(d.fontes[1].url, null);
});

test('texto longo é cortado', () => {
  const d = normalizarEntenda({ mudancas: ['a'.repeat(1000)] });
  assert.equal(d.mudancas[0].length, 400);
});

test('etapa só guarda casa e proposição quando os dois são válidos', () => {
  const d = normalizarEntenda({ mudancas: ['x'], fluxo: { etapas: [
    { titulo: 'Câmara', casa: 'camara', proposicao: '2500080' },
    { titulo: 'Senado', casa: 'senado', proposicao: 172997 },
    { titulo: 'Ruim', casa: 'marte', proposicao: '1' },
    { titulo: 'Sem id', casa: 'camara' },
    { titulo: 'Injeção', casa: 'camara', proposicao: '1; drop table' },
  ] } });
  const e = d.fluxo.etapas;
  assert.deepEqual([e[0].casa, e[0].proposicao], ['camara', '2500080']);
  assert.deepEqual([e[1].casa, e[1].proposicao], ['senado', '172997']);
  assert.equal(e[2].casa, null);
  assert.equal(e[3].proposicao, null);
  assert.equal(e[4].proposicao, null);
});
