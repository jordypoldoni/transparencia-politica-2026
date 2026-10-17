import test from 'node:test';
import assert from 'node:assert/strict';
import { mapaVotacoes, posicoesPorAgente, compararPessoa, saldo, ordenarPorConcordancia, MIN_COMPARAVEIS } from '../src/lib/afinidade/nucleo.js';
import { posicoesPorPartido, compararPartido, faixaCoesao } from '../src/lib/afinidade/partidos.js';
import { lerPedido } from '../src/lib/afinidade/pedido.js';
import { PERGUNTAS_AFINIDADE } from '../src/lib/perguntasAfinidade.js';

const perguntas = [
  { id: 'p1', votacoes: [{ id: 'V1', simE: 'a_favor', casa: 'camara' }, { id: 'V1S', simE: 'a_favor', casa: 'senado' }] },
  { id: 'p2', votacoes: [{ id: 'V2', simE: 'contra', casa: 'camara' }] },
];
const mapa = mapaVotacoes(perguntas);

test('Sim e Nao viram posicao conforme o sentido da pergunta; Abstencao e ausencia ficam de fora', () => {
  const r = posicoesPorAgente([
    { agente_id: 'a', votacao_id_externa: 'V1', voto_tipo: 'Sim', data_voto: '2025-01-01' },
    { agente_id: 'a', votacao_id_externa: 'V2', voto_tipo: 'Sim', data_voto: '2025-01-01' }, // simE contra
    { agente_id: 'b', votacao_id_externa: 'V1', voto_tipo: 'Não', data_voto: '2025-01-01' },
    { agente_id: 'b', votacao_id_externa: 'V2', voto_tipo: 'Abstenção', data_voto: '2025-01-01' },
    { agente_id: 'c', votacao_id_externa: 'V1', voto_tipo: 'Obstrução', data_voto: '2025-01-01' },
    { agente_id: 'd', votacao_id_externa: 'DESCONHECIDA', voto_tipo: 'Sim', data_voto: '2025-01-01' },
  ], mapa);
  assert.equal(r.a.p1.pos, 'a_favor');
  assert.equal(r.a.p2.pos, 'contra');
  assert.equal(r.b.p1.pos, 'contra');
  assert.equal(r.b.p2, undefined);
  assert.equal(r.c, undefined);
  assert.equal(r.d, undefined);
});
test('mesma pergunta votada em duas Casas vale o voto mais recente', () => {
  const r = posicoesPorAgente([
    { agente_id: 'a', votacao_id_externa: 'V1', voto_tipo: 'Sim', data_voto: '2023-01-01' },
    { agente_id: 'a', votacao_id_externa: 'V1S', voto_tipo: 'Não', data_voto: '2025-06-01' },
  ], mapa);
  assert.equal(r.a.p1.pos, 'contra');
  assert.equal(r.a.p1.casa, 'senado');
});
test('compararPessoa: ignora sem_opiniao, conta so o comparavel', () => {
  const pos = { p1: { pos: 'a_favor', casa: 'camara' }, p2: { pos: 'contra', casa: 'camara' } };
  const r = compararPessoa(pos, { p1: 'a_favor', p2: 'a_favor', p3: 'contra', p4: 'sem_opiniao' });
  assert.equal(r.comparaveis, 2);
  assert.equal(r.iguais, 1);
  assert.equal(r.detalhes.find((d) => d.pergunta_id === 'p3').votou, null);
  assert.equal(r.detalhes.some((d) => d.pergunta_id === 'p4'), false);
});
test('ordem: 9 de 10 vem antes de 1 de 1; grupo com poucas perguntas vai depois', () => {
  const a = { iguais: 1, comparaveis: 1 }, b = { iguais: 9, comparaveis: 10 };
  assert.ok(ordenarPorConcordancia(a, b) > 0);
  assert.equal(saldo({ iguais: 5, comparaveis: 6 }), 4);
  assert.equal(saldo({ iguais: 4, comparaveis: 4 }), 4);
  // saldo igual: mais evidencia primeiro
  assert.ok(ordenarPorConcordancia({ iguais: 5, comparaveis: 6 }, { iguais: 4, comparaveis: 4 }) < 0);
  assert.equal(MIN_COMPARAVEIS, 3);
});

const agentes = [
  { id: '1', partido_atual: 'ABC' }, { id: '2', partido_atual: 'abc' }, { id: '3', partido_atual: 'ABC' },
  { id: '4', partido_atual: 'XYZ' }, { id: '5', partido_atual: 'ABC', em_exercicio: false }, { id: '6', partido_atual: null },
];
const P = (pos) => ({ p1: { pos } });
const posicoes = { 1: P('a_favor'), 2: P('a_favor'), 3: P('contra'), 4: P('a_favor'), 5: P('contra'), 6: P('contra') };

test('partido: maioria dos que estao em exercicio; sigla sem acento/caixa; sem partido e fora de exercicio ficam fora', () => {
  const r = posicoesPorPartido(posicoes, agentes);
  assert.deepEqual(Object.keys(r).sort(), ['ABC', 'XYZ']);
  assert.deepEqual({ ...r.ABC.perguntas.p1 }, { a_favor: 2, contra: 1, pos: 'a_favor' });
});
test('partido: empate vira "dividido" e nao conta como comparavel', () => {
  const r = posicoesPorPartido({ 1: P('a_favor'), 3: P('contra') }, agentes);
  assert.equal(r.ABC.perguntas.p1.pos, 'dividido');
  const c = compararPartido(r.ABC, { p1: 'a_favor' });
  assert.equal(c.comparaveis, 0);
  assert.equal(c.detalhes[0].maioria, 'dividido');
});
test('coesao e faixas', () => {
  const r = posicoesPorPartido(posicoes, agentes);
  const c = compararPartido(r.ABC, { p1: 'a_favor' });
  assert.equal(c.iguais, 1);
  assert.ok(Math.abs(c.coesao - 2 / 3) < 1e-9);
  assert.equal(c.membros, 3);
  assert.equal(faixaCoesao(0.95), 'Vota unido');
  assert.equal(faixaCoesao(0.8), 'Maioria clara');
  assert.equal(faixaCoesao(0.6), 'Dividido');
  assert.equal(faixaCoesao(null), null);
});

test('lerPedido valida UF e exige ao menos uma resposta real; descarta pergunta desconhecida', () => {
  const id = PERGUNTAS_AFINIDADE[0].id;
  assert.deepEqual(lerPedido({ uf: 'rs', respostas: { [id]: 'a_favor', inexistente: 'contra' } }), { uf: 'RS', respostas: { [id]: 'a_favor' } });
  assert.ok(lerPedido({ uf: 'XX', respostas: { [id]: 'a_favor' } }).erro);
  assert.ok(lerPedido({ uf: 'RS', respostas: { [id]: 'sem_opiniao' } }).erro);
  assert.ok(lerPedido(undefined).erro);
});
test('catalogo de perguntas: ids unicos e votacoes com simE valido', () => {
  const ids = PERGUNTAS_AFINIDADE.map((p) => p.id);
  assert.equal(new Set(ids).size, ids.length);
  for (const p of PERGUNTAS_AFINIDADE) for (const v of p.votacoes) assert.ok(['a_favor', 'contra'].includes(v.simE), `${p.id}/${v.id}`);
});
