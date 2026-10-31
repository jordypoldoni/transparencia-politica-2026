import { test } from 'node:test';
import assert from 'node:assert/strict';
import { nomeBonito, pctNum, cadeirasPorPartido, cadeirasDeContagem, governoNoPrimeiroTurno, ufConhecida } from '../src/lib/eleicoesHome.js';

test('nomeBonito deixa preposições em minúscula', () => {
  assert.equal(nomeBonito('CELINA LEÃO'), 'Celina Leão');
  assert.equal(nomeBonito('CADU DE LULA'), 'Cadu de Lula');
  assert.equal(nomeBonito(''), '');
  assert.equal(nomeBonito(null), '');
});

test('pctNum lê percentual em formato brasileiro', () => {
  assert.equal(pctNum('52,17'), 52.17);
  assert.equal(pctNum('100,00'), 100);
  assert.equal(pctNum(undefined), 0);
});

test('cadeirasPorPartido conta, ordena e agrupa os demais', () => {
  const eleitos = ['PL', 'PL', 'PT', 'PT', 'PT', 'PP', 'MDB', 'PSD', 'UNIÃO', 'NOVO'].map((partido) => ({ partido }));
  const r = cadeirasPorPartido(eleitos, 3);
  assert.equal(r.total, 10);
  assert.deepEqual(r.linhas, [{ partido: 'PT', qtd: 3 }, { partido: 'PL', qtd: 2 }, { partido: 'MDB', qtd: 1 }]);
  assert.equal(r.outros, 4);
  assert.equal(r.maior, 4);
});

test('cadeirasPorPartido aguenta lista vazia e partido em branco', () => {
  assert.deepEqual(cadeirasPorPartido([], 6), { total: 0, linhas: [], outros: 0, maior: 1 });
  assert.equal(cadeirasPorPartido([{ partido: '' }, { partido: 'PL' }]).total, 1);
  assert.equal(cadeirasPorPartido(undefined).total, 0);
});

test('governoNoPrimeiroTurno: eleito, ou finalistas do 2º turno', () => {
  const a = governoNoPrimeiroTurno([{ nome: 'A', eleito: true }, { nome: 'B' }]);
  assert.equal(a.eleito.nome, 'A');
  const b = governoNoPrimeiroTurno([{ nome: 'A', segundoTurno: true }, { nome: 'B', segundoTurno: true }, { nome: 'C' }]);
  assert.equal(b.eleito, null);
  assert.deepEqual(b.finalistas.map((c) => c.nome), ['A', 'B']);
  assert.deepEqual(governoNoPrimeiroTurno(null), { eleito: null, finalistas: [] });
});

test('ufConhecida', () => {
  assert.equal(ufConhecida('rs', ['RS', 'SC']), true);
  assert.equal(ufConhecida('XX', ['RS']), false);
  assert.equal(ufConhecida('', ['RS']), false);
});

test('cadeirasDeContagem equivale a cadeirasPorPartido', () => {
  const r = cadeirasDeContagem({ PL: 2, PT: 3, MDB: 1, NOVO: 1, PP: 1 }, 3);
  assert.deepEqual(r.linhas, [{ partido: 'PT', qtd: 3 }, { partido: 'PL', qtd: 2 }, { partido: 'MDB', qtd: 1 }]);
  assert.equal(r.outros, 2);
  assert.equal(r.total, 8);
  assert.deepEqual(cadeirasDeContagem(undefined), { total: 0, linhas: [], outros: 0, maior: 1 });
});

test('fotoDe acha pela chave cargo|UF|número', async () => {
  const { chaveFoto, fotoDe } = await import('../src/lib/eleicoesHome.js');
  const fotos = { [chaveFoto('governador', 'rs', '22')]: { foto: 'f.jpg', slug: 's' } };
  assert.deepEqual(fotoDe(fotos, 'governador', 'RS', '22'), { foto: 'f.jpg', slug: 's' });
  assert.equal(fotoDe(fotos, 'senador', 'RS', '22'), null);
  assert.equal(fotoDe(undefined, 'governador', 'RS', '22'), null);
});
