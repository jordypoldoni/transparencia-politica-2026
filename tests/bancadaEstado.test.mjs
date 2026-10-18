import test from 'node:test';
import assert from 'node:assert/strict';
import { mediaMensal, mediana, agruparPorCasa, montarLinhas, ordenar, ordensDisponiveis, filtrar, resumoDoGrupo, fraseResumo, rotuloSituacao, tetoDoGrupo, reais, posicaoNaBancada } from '../src/lib/bancadaEstado.js';

const dep = (nome, total, meses, extra = {}) => ({ id: nome, slug: nome, nome_urna: nome, partido_atual: 'XX', uf_sede: 'RS', casa: 'Câmara', total, meses_com_gasto: meses, n_notas: 10, ...extra });

test('mediaMensal: total dividido pelos meses com gasto; sem meses vira null', () => {
  assert.equal(mediaMensal({ total: 300000, meses_com_gasto: 10 }), 30000);
  assert.equal(mediaMensal({ total: 5000, meses_com_gasto: 1 }), 5000);
  assert.equal(mediaMensal({ total: 5000 }), null);
  assert.equal(mediaMensal({ total: 5000, meses_com_gasto: 0 }), null);
});

test('mediana: ímpar, par e vazio', () => {
  assert.equal(mediana([3, 1, 2]), 2);
  assert.equal(mediana([4, 1, 2, 3]), 2.5);
  assert.equal(mediana([]), null);
});

test('agruparPorCasa separa federal, senado e estadual e some com casa vazia', () => {
  const l = [dep('a', 1, 1), dep('b', 1, 1, { casa: 'Senado' }), dep('c', 1, 1, { casa: 'Assembleia (RS)' })];
  const g = agruparPorCasa(l);
  assert.deepEqual(g.map((x) => x.chave), ['federal', 'senado', 'estadual']);
  assert.deepEqual(agruparPorCasa([dep('a', 1, 1)]).map((x) => x.chave), ['federal']);
});

test('teto: federal e senado do RS; estadual só em SP', () => {
  assert.equal(tetoDoGrupo('federal', 'RS'), 53086.78);
  assert.equal(tetoDoGrupo('senado', 'RS'), 35886.6);
  assert.equal(tetoDoGrupo('estadual', 'RS'), null);
  assert.equal(tetoDoGrupo('estadual', 'SP'), 44200);
});

test('montarLinhas: % do teto usa a média mensal e o teto da casa; estadual do RS fica sem teto', () => {
  const fed = montarLinhas({ lista: [dep('a', 265433.9, 10)] }, 'RS', {});
  assert.equal(fed[0].pct, 50); // 26.543 / 53.086
  const sen = montarLinhas({ lista: [dep('s', 358860, 10, { casa: 'Senado' })] }, 'RS', {});
  assert.equal(sen[0].pct, 100);
  const est = montarLinhas({ lista: [dep('e', 70000, 7, { casa: 'Assembleia (RS)' })] }, 'RS', {});
  assert.equal(est[0].pct, null);
  assert.equal(est[0].media, 10000);
  const sp = montarLinhas({ lista: [dep('e', 44200, 1, { casa: 'Assembleia (SP)', uf_sede: 'SP' })] }, 'SP', {});
  assert.equal(sp[0].pct, 100);
});

test('montarLinhas: votos só quando a fonte traz o total; situação em texto simples', () => {
  const l = montarLinhas({ lista: [dep('a', 100, 1, { situacao_atual: 'Suplência' }), dep('b', 100, 1, { situacao_atual: 'Licença' }), dep('c', 100, 1, { situacao_atual: 'Exercício' })] }, 'RS', { a: { compareceu: 100, total: 117 }, b: { compareceu: 0, total: 0 } });
  assert.deepEqual(l[0].votos, { compareceu: 100, total: 117 });
  assert.equal(l[1].votos, null);
  assert.equal(l[2].votos, null);
  assert.deepEqual(l.map((x) => x.situacao), ['suplente', 'em licença', null]);
  assert.equal(rotuloSituacao({ situacao_atual: null, casa: 'Assembleia (RS)' }), null);
  assert.equal(rotuloSituacao({ situacao_atual: null, casa: 'Câmara' }), 'situação: a fonte não informa');
});

test('ordenar: por gasto, por votos e por nome; sem dado vai para o fim', () => {
  const l = montarLinhas({ lista: [dep('Carlos', 10000, 1), dep('Ana', 30000, 1), dep('Bia', 20000, 1), dep('Zé', 5000, null)] }, 'RS', { Carlos: { compareceu: 50, total: 100 }, Ana: { compareceu: 90, total: 100 } });
  assert.deepEqual(ordenar(l, 'gasto-maior').map((x) => x.d.nome_urna), ['Ana', 'Bia', 'Carlos', 'Zé']);
  assert.deepEqual(ordenar(l, 'gasto-menor').map((x) => x.d.nome_urna), ['Carlos', 'Bia', 'Ana', 'Zé']);
  assert.deepEqual(ordenar(l, 'votos-mais').map((x) => x.d.nome_urna), ['Ana', 'Carlos', 'Bia', 'Zé']);
  assert.deepEqual(ordenar(l, 'nome').map((x) => x.d.nome_urna), ['Ana', 'Bia', 'Carlos', 'Zé']);
  assert.deepEqual(ordenar(l, 'inexistente').map((x) => x.d.nome_urna)[0], 'Ana'); // padrão
});

test('ordensDisponiveis: sem dado na coluna, a ordem some', () => {
  const sem = montarLinhas({ lista: [dep('a', 100, 1, { casa: 'Assembleia (RS)' })] }, 'RS', {});
  assert.deepEqual(ordensDisponiveis(sem).map((o) => o.valor), ['gasto-maior', 'gasto-menor', 'nome']);
  const com = montarLinhas({ lista: [dep('a', 100, 1)] }, 'RS', { a: { compareceu: 1, total: 2 } });
  assert.equal(ordensDisponiveis(com).length, 6);
});

test('filtrar: ignora acento e caixa, busca em nome e partido', () => {
  const l = montarLinhas({ lista: [dep('José Silva', 1, 1, { partido_atual: 'PT' }), dep('Ana', 1, 1, { partido_atual: 'MDB' })] }, 'RS', {});
  assert.equal(filtrar(l, 'jose').length, 1);
  assert.equal(filtrar(l, 'mdb').length, 1);
  assert.equal(filtrar(l, '').length, 2);
  assert.equal(filtrar(l, 'zzz').length, 0);
});

test('fraseResumo: faixa, mediana (só com 4 ou mais), teto e sem adjetivo', () => {
  const g = agruparPorCasa([dep('a', 1, 1)])[0];
  const mk = (totais) => montarLinhas({ lista: totais.map((v, i) => dep('p' + i, v, 1)) }, 'RS', {});
  const l4 = mk([10000, 20000, 30000, 40000]);
  const f4 = fraseResumo(g, resumoDoGrupo(l4, 'federal', 'RS'));
  assert.equal(f4, `Em 2026, a média mensal de gasto dos 4 deputados federais do estado vai de ${reais(10000)} a ${reais(40000)}, com mediana de ${reais(25000)}. O teto mensal da cota da Câmara para o estado é ${reais(53086.78)}.`);
  const l2 = mk([10000, 20000]);
  assert.ok(!/mediana/.test(fraseResumo(g, resumoDoGrupo(l2, 'federal', 'RS'))));
  assert.match(fraseResumo(g, resumoDoGrupo(mk([7000]), 'federal', 'RS')), /gastou, em média/);
  assert.equal(fraseResumo(g, resumoDoGrupo([], 'federal', 'RS')), null);
  assert.ok(!/—/.test(f4));
  const est = fraseResumo({ ...g, chave: 'estadual', plural: 'deputados estaduais' }, resumoDoGrupo(l4, 'estadual', 'RS'));
  assert.ok(!/teto/.test(est));
});

test('perfil: presença e coerência não têm cor de aprovação (sem semáforo, D-003)', async () => {
  const { readFileSync } = await import('node:fs');
  const fonte = readFileSync(new URL('../components/PerfilPolitico.jsx', import.meta.url), 'utf8');
  assert.ok(!/corCoerencia/.test(fonte));
  assert.ok(!/p >= 80/.test(fonte));
});

test('posicaoNaBancada: 1º é a maior média; empate divide; mediana só com 4+; compara só dentro da casa', () => {
  const l = [dep('a', 100000, 10), dep('b', 80000, 10), dep('c', 60000, 10), dep('d', 60000, 10), dep('e', 20000, 10), dep('sen', 999999, 1, { casa: 'Senado' })];
  const eu = (n) => ({ id: n, casa: 'Câmara', uf_sede: 'RS' });
  const a = posicaoNaBancada(l, eu('a'), 'RS');
  assert.equal(a.posicao, 1);
  assert.equal(a.de, 5);
  assert.equal(a.mediana, 6000);
  assert.equal(posicaoNaBancada(l, eu('c'), 'RS').posicao, 3);
  assert.equal(posicaoNaBancada(l, eu('d'), 'RS').posicao, 3);
  assert.equal(posicaoNaBancada(l, eu('e'), 'RS').posicao, 5);
  assert.equal(a.teto, 53086.78);
  assert.equal(a.grupo.chave, 'federal');
});

test('posicaoNaBancada: sem média, bancada de 1 pessoa ou fora da lista devolve null; mediana some com menos de 4', () => {
  const l = [dep('a', 100000, 10), dep('sem', 5000, 0), dep('b', 1000, 10)];
  assert.equal(posicaoNaBancada(l, { id: 'sem', casa: 'Câmara' }, 'RS'), null);
  assert.equal(posicaoNaBancada(l, { id: 'x', casa: 'Câmara' }, 'RS'), null);
  assert.equal(posicaoNaBancada([dep('a', 1, 1)], { id: 'a', casa: 'Câmara' }, 'RS'), null);
  assert.equal(posicaoNaBancada(l, { id: 'a', casa: 'Câmara' }, 'RS').mediana, null);
});

test('posicaoNaBancada: senador não recebe posição (3 por estado), mesmo com média', () => {
  const l = [dep('a', 100000, 10, { casa: 'Senado' }), dep('b', 80000, 10, { casa: 'Senado' }), dep('c', 60000, 10, { casa: 'Senado' }), dep('d', 40000, 10, { casa: 'Senado' })];
  assert.equal(posicaoNaBancada(l, { id: 'a', casa: 'Senado', cargo_atual: 'Senador(a)' }, 'RS'), null);
});
