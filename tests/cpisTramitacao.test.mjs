// Tramitacao dos pedidos de CPI (19/10/2026): normalizacao pura, sem rede.
import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizarTramitacoes } from '../src/lib/cpisAoVivo.js';

const mov = (o) => ({ sequencia: 1, dataHora: '2026-02-02T09:54', siglaOrgao: 'MESA', descricaoTramitacao: 'Apresentação de Proposição', codTipoTramitacao: '100', despacho: 'Texto', url: 'https://x', ...o });

test('numera pela posicao (ordem) e guarda os campos', () => {
  const r = normalizarTramitacoes([mov({}), mov({ sequencia: 4, dataHora: '2026-02-02T10:22', siglaOrgao: 'PLEN' })], 99);
  assert.equal(r.length, 2);
  assert.deepEqual(r.map((x) => x.ordem), [1, 2]);
  assert.equal(r[0].pedido_id, 99);
  assert.equal(r[1].sigla_orgao, 'PLEN');
  assert.equal(r[0].data_hora, '2026-02-02T09:54');
  assert.equal(r[0].cod_tipo, '100');
});

test('sequencia repetida na fonte nao vira chave duplicada (caso real RCP 2/2023)', () => {
  const r = normalizarTramitacoes([
    mov({ sequencia: 445, dataHora: '2023-08-16T14:00', despacho: 'A' }),
    mov({ sequencia: 445, dataHora: '2023-08-16T14:00', despacho: 'B' }),
  ], 1);
  assert.deepEqual(r.map((x) => x.ordem), [1, 2]);
  assert.deepEqual(r.map((x) => x.despacho), ['A', 'B']); // empate de data: ordem da fonte
});

test('ordena por data e mantem a ordem da fonte no empate', () => {
  const r = normalizarTramitacoes([mov({ dataHora: '2026-03-01T10:00', despacho: 'tarde' }), mov({ dataHora: '2026-02-01T10:00', despacho: 'cedo' })], 1);
  assert.deepEqual(r.map((x) => x.despacho), ['cedo', 'tarde']);
});

test('limpa espacos e trata vazio como nulo', () => {
  const [r] = normalizarTramitacoes([mov({ despacho: '  duas   palavras\n', url: '', siglaOrgao: undefined, sequencia: 'x' })], 1);
  assert.equal(r.despacho, 'duas palavras');
  assert.equal(r.url, null);
  assert.equal(r.sigla_orgao, null);
  assert.equal(r.sequencia, null);
});

test('movimentacao sem data valida invalida a leitura inteira (nao grava com buraco)', () => {
  assert.throws(() => normalizarTramitacoes([mov({}), mov({ dataHora: null })], 1), /sem data valida/);
  assert.throws(() => normalizarTramitacoes([mov({ dataHora: 'ontem' })], 1), /sem data valida/);
});

test('resposta que nao e lista falha; lista vazia devolve vazio (o coletor trata como falha)', () => {
  assert.throws(() => normalizarTramitacoes(undefined, 1), /sem lista/);
  assert.deepEqual(normalizarTramitacoes([], 1), []);
});
