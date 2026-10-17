// Testes da escolha da coluna de despesa do SICONFI (bug de 17/10/2026: pegava "No Bimestre").
import test from 'node:test';
import assert from 'node:assert/strict';
import { colunaDespesaRealizada, parseDespesaEFuncoes } from '../src/lib/siconfi.js';

const linha = (conta, coluna, valor) => ({ conta, coluna, valor });
const COLUNAS = [
  'DOTAÇÃO INICIAL', 'DOTAÇÃO ATUALIZADA (a)',
  'DESPESAS EMPENHADAS NO BIMESTRE', 'DESPESAS EMPENHADAS ATÉ O BIMESTRE (b)', '% (b/total b)',
  'DESPESAS LIQUIDADAS NO BIMESTRE', 'DESPESAS LIQUIDADAS ATÉ O BIMESTRE (d)', '% (d/total d)',
];
const itens = (colunas) => colunas.flatMap((c, i) => [
  linha('DESPESAS (EXCETO INTRA-ORÇAMENTÁRIAS) (I)', c, 1000 * (i + 1)),
  linha('Saúde', c, 10 * (i + 1)),
]);

test('prefere liquidada ATÉ o bimestre, nunca a do bimestre', () => {
  assert.equal(colunaDespesaRealizada(itens(COLUNAS)), 'DESPESAS LIQUIDADAS ATÉ O BIMESTRE (d)');
});

test('independe da ordem das colunas (a do bimestre vindo primeiro não engana)', () => {
  assert.equal(colunaDespesaRealizada(itens([...COLUNAS].reverse())), 'DESPESAS LIQUIDADAS ATÉ O BIMESTRE (d)');
});

test('sem liquidada até o bimestre, cai na empenhada até o bimestre', () => {
  const sem = COLUNAS.filter((c) => !/LIQUIDADAS/.test(c));
  assert.equal(colunaDespesaRealizada(itens(sem)), 'DESPESAS EMPENHADAS ATÉ O BIMESTRE (b)');
});

test('só colunas "No Bimestre": não inventa acumulado (devolve nulo)', () => {
  assert.equal(colunaDespesaRealizada(itens(['DESPESAS LIQUIDADAS NO BIMESTRE', 'DOTAÇÃO INICIAL'])), null);
});

test('total e funções saem da coluna acumulada', () => {
  const r = parseDespesaEFuncoes(itens(COLUNAS));
  const i = COLUNAS.indexOf('DESPESAS LIQUIDADAS ATÉ O BIMESTRE (d)') + 1;
  assert.equal(r.despesa_total, 1000 * i);
  assert.equal(r.funcoes['Saúde'], 10 * i);
});
