import test from 'node:test';
import assert from 'node:assert/strict';
import {
  chaveDaCasa, linhasDaCasa, comparacaoJusta, usoPorEstado, mesAberto, serieMensal, porTipo,
  divulgacaoMensal, passagensPorAno, anosDisponiveis, partidosDe, resumoRecursosSenado, escalaY, somaFechados,
} from '../src/lib/gastosParlamentares.js';
import { TETO_CEAP } from '../src/lib/cotas.js';

const dep = (nome, uf, mediaAlvo, meses, extra = {}) => ({
  id: nome, nome_urna: nome, partido_atual: 'XX', uf_sede: uf, casa: 'Câmara',
  total: mediaAlvo * meses, meses_com_gasto: meses, meses_base: meses, total_base: mediaAlvo * meses, ...extra,
});

test('chaveDaCasa', () => {
  assert.equal(chaveDaCasa('Câmara'), 'camara');
  assert.equal(chaveDaCasa('Senado'), 'senado');
  assert.equal(chaveDaCasa('Assembleia (RS)'), 'assembleias');
  assert.equal(chaveDaCasa('outra'), null);
});

test('linhasDaCasa: % do teto do estado de cada um (mesma média, estados diferentes, % diferentes)', () => {
  const l = linhasDaCasa([dep('A', 'RR', 30000, 8), dep('B', 'DF', 30000, 8)], 'camara');
  assert.equal(l[0].pct, Math.round((30000 / TETO_CEAP.RR) * 100));
  assert.equal(l[1].pct, Math.round((30000 / TETO_CEAP.DF) * 100));
  assert.ok(l[1].pct > l[0].pct); // o teto do DF é menor: o mesmo gasto pesa mais
});

test('comparacaoJusta: ordena por % do teto, corta pelo mínimo de meses e conta quem ficou fora', () => {
  const linhas = linhasDaCasa([
    dep('Alto', 'SP', 45000, 8), dep('Baixo', 'SP', 5000, 8), dep('Novo', 'SP', 48000, 1), dep('Sem', 'SP', 0, 0, { meses_base: 0, total_base: 0 }),
  ], 'camara');
  const r = comparacaoJusta(linhas, 'camara', { minMeses: 3 });
  assert.deepEqual(r.itens.map((x) => x.d.nome_urna), ['Alto', 'Baixo']);
  assert.equal(r.foraDoMinimo, 1);
  assert.equal(r.semMedia, 1);
  const todos = comparacaoJusta(linhas, 'camara', { minMeses: 0 });
  assert.deepEqual(todos.itens.map((x) => x.d.nome_urna), ['Novo', 'Alto', 'Baixo']);
});

test('comparacaoJusta: ordem "menor" põe quem menos usou primeiro, com desempate por nome', () => {
  const linhas = linhasDaCasa([dep('Alto', 'SP', 45000, 8), dep('Meio', 'SP', 20000, 8), dep('Baixo', 'SP', 5000, 8)], 'camara');
  assert.deepEqual(comparacaoJusta(linhas, 'camara', { ordem: 'menor' }).itens.map((x) => x.d.nome_urna), ['Baixo', 'Meio', 'Alto']);
  assert.deepEqual(comparacaoJusta(linhas, 'camara', { ordem: 'maior' }).itens.map((x) => x.d.nome_urna), ['Alto', 'Meio', 'Baixo']);
});

test('comparacaoJusta: filtros de estado e partido', () => {
  const linhas = linhasDaCasa([dep('A', 'SP', 1000, 8), dep('B', 'RS', 1000, 8, { partido_atual: 'YY' })], 'camara');
  assert.equal(comparacaoJusta(linhas, 'camara', { uf: 'RS' }).itens.length, 1);
  assert.equal(comparacaoJusta(linhas, 'camara', { partido: 'YY' }).itens[0].d.nome_urna, 'B');
});

test('comparacaoJusta: Assembleias exigem um estado e ordenam por reais por mês', () => {
  const rows = [
    { ...dep('A', 'RS', 3000, 8), casa: 'Assembleia (RS)' },
    { ...dep('B', 'RS', 9000, 8), casa: 'Assembleia (RS)' },
  ];
  const linhas = linhasDaCasa(rows, 'assembleias');
  assert.equal(comparacaoJusta(linhas, 'assembleias', {}).precisaEstado, true);
  const r = comparacaoJusta(linhas, 'assembleias', { uf: 'RS' });
  assert.deepEqual(r.itens.map((x) => x.d.nome_urna), ['B', 'A']);
  assert.equal(r.itens[0].pct, null); // sem teto publicado: não inventa %
});

test('usoPorEstado: mediana do % por estado, só de quem tem meses suficientes', () => {
  const linhas = linhasDaCasa([dep('A', 'SP', 24000, 8), dep('B', 'SP', 36000, 8), dep('C', 'SP', 48000, 8), dep('D', 'SP', 48000, 1)], 'camara');
  const r = usoPorEstado(linhas, { minMeses: 3 });
  assert.equal(r.length, 1);
  assert.equal(r[0].n, 3);
  assert.equal(r[0].mediana, Math.round((36000 / TETO_CEAP.SP) * 100));
  assert.equal(r[0].medianaReais, 36000);
  assert.equal(r[0].teto, TETO_CEAP.SP);
});

test('mesAberto: só fecha 30 dias depois do fim do mês', () => {
  assert.equal(mesAberto(2026, 9, new Date('2026-10-21T12:00:00Z')), true);   // setembro acaba em 30/9, fecha em 30/10
  assert.equal(mesAberto(2026, 8, new Date('2026-10-21T12:00:00Z')), false);  // agosto fechou em 30/9
});

const agreg = [
  { casa: 'Câmara', ano: 2025, mes: 1, tipo_despesa: 'PASSAGEM AÉREA - SIGEPA', total: '100', categoria_normalizada: 'Passagens' },
  { casa: 'Câmara', ano: 2025, mes: 2, tipo_despesa: 'PASSAGEM AÉREA - RPA', total: '10', categoria_normalizada: 'Passagens' },
  { casa: 'Câmara', ano: 2026, mes: 1, tipo_despesa: 'PASSAGEM AÉREA - REEMBOLSO', total: '5', categoria_normalizada: 'Passagens' },
  { casa: 'Câmara', ano: 2026, mes: 1, tipo_despesa: 'DIVULGAÇÃO DA ATIVIDADE PARLAMENTAR.', total: '900', categoria_normalizada: 'Publicidade e Marketing' },
  { casa: 'Câmara', ano: 2026, mes: 2, tipo_despesa: 'COMPLEMENTAÇÃO DO AUXÍLIO-MORADIA', total: '-50', categoria_normalizada: 'Outras despesas' },
  { casa: 'Senado', ano: 2026, mes: 1, tipo_despesa: 'Passagens aéreas, aquáticas e terrestres nacionais', total: '7', categoria_normalizada: 'Passagens' },
];

test('passagensPorAno: ano sem linha SIGEPA tem sigepa null, nunca zero', () => {
  const p = passagensPorAno(agreg, 'Câmara', [2025, 2026]);
  assert.equal(p[0].sigepa, 100);
  assert.equal(p[0].total, 110);
  assert.equal(p[1].sigepa, null);
  assert.equal(p[1].total, 5);
  assert.equal(passagensPorAno(agreg, 'Senado', [2026])[0].total, 7);
});

test('porTipo: ordena, soma tudo no total e deixa valor negativo fora das barras', () => {
  const r = porTipo(agreg, 'Câmara', 2026);
  assert.deepEqual(r.tipos.map((x) => x.valor), [900, 5]);
  assert.equal(r.total, 855);
});

test('divulgacaoMensal e serieMensal', () => {
  assert.equal(divulgacaoMensal(agreg, 'Câmara', 2026)[0].total, 900);
  const s = serieMensal(agreg, 'Câmara', 2026, new Date('2026-10-21T12:00:00Z'));
  assert.equal(s.length, 12);
  assert.equal(s[0].total, 905);
  assert.equal(s[0].aberto, false);
  assert.equal(s[8].aberto, true);
  assert.equal(s[3].temDado, false);
});

test('anosDisponiveis e partidosDe', () => {
  assert.deepEqual(anosDisponiveis(agreg, 'Câmara'), [2026, 2025]);
  assert.deepEqual(partidosDe(linhasDaCasa([dep('A', 'SP', 1, 1, { partido_atual: 'ZZ' }), dep('B', 'SP', 1, 1, { partido_atual: 'AA' })], 'camara')), ['AA', 'ZZ']);
});

test('resumoRecursosSenado: soma fora da cota, conta quem usa cada benefício e devolve null sem linhas', () => {
  assert.equal(resumoRecursosSenado([]), null);
  const r = resumoRecursosSenado([
    { nao_inclusos: [{ recurso: 'Correios', valor: 10 }, { recurso: 'Diárias', valor: 0 }], beneficios: [{ beneficio: 'Auxílio-Moradia', utilizacao: 'Utilizou' }, { beneficio: 'Imóvel Funcional', utilizacao: 'Não utilizou' }] },
    { nao_inclusos: [{ recurso: 'Correios', valor: 5 }, { recurso: 'Diárias', valor: 20 }], beneficios: [{ beneficio: 'Auxílio-Moradia', utilizacao: 'Não utilizou' }, { beneficio: 'Imóvel Funcional', utilizacao: 'Utilizou' }] },
  ]);
  assert.equal(r.n, 2);
  assert.deepEqual(r.itens.map((x) => [x.recurso, x.valor, x.usam]), [['Diárias', 20, 1], ['Correios', 15, 2]]);
  assert.equal(r.total, 35);
  assert.deepEqual(r.beneficios, [{ beneficio: 'Auxílio-Moradia', usam: 1, n: 2 }, { beneficio: 'Imóvel Funcional', usam: 1, n: 2 }]);
});

test('escalaY: topo redondo acima do maior valor, com marcas de 0 ao topo', () => {
  const e = escalaY(21.8e6, 4);
  assert.ok(e.topo >= 21.8e6);
  assert.equal(e.marcas[0], 0);
  assert.equal(e.marcas[e.marcas.length - 1], e.topo);
  assert.deepEqual(escalaY(0).marcas[0], 0);
  assert.equal(escalaY(10, 5).topo, 10);
});

test('somaFechados: soma só meses fechados e os mesmos meses do ano anterior', () => {
  const at = [{ total: 10, temDado: true, aberto: false }, { total: 20, temDado: true, aberto: false }, { total: 5, temDado: true, aberto: true }, { total: 0, temDado: false, aberto: false }];
  const an = [{ total: 7, temDado: true }, { total: 8, temDado: true }, { total: 9, temDado: true }, { total: 9, temDado: true }];
  assert.deepEqual(somaFechados(at, an), { de: 1, ate: 2, meses: 2, atual: 30, anterior: 15 });
  assert.equal(somaFechados(at, []).anterior, null);
  assert.equal(somaFechados([{ total: 1, temDado: true, aberto: true }], an), null);
});
