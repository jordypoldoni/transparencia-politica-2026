import test from 'node:test';
import assert from 'node:assert/strict';
import { buscarTudo } from '../src/lib/paginar.js';

// Consulta de mentira que obedece .range(), como o supabase-js.
const fabrica = (total, { falhaEm } = {}) => () => ({
  range: async (ini, fim) => {
    if (falhaEm !== undefined && ini >= falhaEm) return { data: null, error: { message: 'queda' } };
    const data = []; for (let i = ini; i <= Math.min(fim, total - 1); i++) data.push(i);
    return { data, error: null };
  },
});
const silencio = (fn) => async () => { const e = console.error, w = console.warn; console.error = console.warn = () => {}; try { await fn(); } finally { console.error = e; console.warn = w; } };

test('le todas as linhas alem do teto de 1000 do servidor', async () => {
  assert.equal((await buscarTudo(fabrica(2500))).length, 2500);
});
test('pagina cheia nao e fim: total exatamente 1000 e 2000', async () => {
  assert.equal((await buscarTudo(fabrica(1000))).length, 1000);
  assert.equal((await buscarTudo(fabrica(2000))).length, 2000);
});
test('tabela vazia', async () => {
  assert.equal((await buscarTudo(fabrica(0))).length, 0);
});
test('erro no meio devolve o que veio, sem lancar', silencio(async () => {
  assert.equal((await buscarTudo(fabrica(5000, { falhaEm: 2000 }))).length, 2000);
}));
test('teto protege contra laco infinito', silencio(async () => {
  assert.equal((await buscarTudo(fabrica(10 ** 6), 'x', { pagina: 100, teto: 300 })).length, 300);
}));
