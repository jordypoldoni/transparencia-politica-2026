// Testes de INTEGRAÇÃO da soma dos estados na rota /api/apuracao, contra um TSE falso com arquivos reais (I4, D-049).
import test from 'node:test';
import assert from 'node:assert/strict';
import { subirTseFalso, rebaixarNacional, lerBruto, temFixtures } from './tseFalso.mjs';

let n = 0;
// Cada chamada carrega uma cópia nova da rota (memória, disjuntor e cache zerados).
async function rota() { const m = await import(`../pages/api/apuracao.js?t=${++n}`); return m.default; }
function resposta() {
  const r = { cab: {}, codigo: 200, corpo: null };
  r.setHeader = (k, v) => { r.cab[k] = v; };
  r.status = (c) => { r.codigo = c; return r; };
  r.json = (b) => { r.corpo = b; return r; };
  return r;
}
async function chamar(handler, query = {}) {
  const res = resposta();
  await handler({ method: 'GET', query: { cargo: 'presidente', ...query } }, res);
  return res;
}
async function com(modo, { nacional, ajustar } = {}, fn) {
  const tse = await subirTseFalso({ nacional });
  if (ajustar) ajustar(tse);
  const antes = { b: process.env.TSE_RESULTADOS_BASE, m: process.env.APURACAO_SOMA_ESTADOS };
  process.env.TSE_RESULTADOS_BASE = tse.base;
  if (modo) process.env.APURACAO_SOMA_ESTADOS = modo; else delete process.env.APURACAO_SOMA_ESTADOS;
  try { await fn(tse, await rota()); } finally {
    if (antes.b === undefined) delete process.env.TSE_RESULTADOS_BASE; else process.env.TSE_RESULTADOS_BASE = antes.b;
    if (antes.m === undefined) delete process.env.APURACAO_SOMA_ESTADOS; else process.env.APURACAO_SOMA_ESTADOS = antes.m;
    await tse.fechar();
  }
}
const parado = () => rebaixarNacional(lerBruto('br'));
const opt = { skip: !temFixtures };

test('off (padrao): so o nacional, ZERO pedidos extras ao TSE', opt, async () => {
  await com(null, { nacional: parado() }, async (tse, h) => {
    const r = await chamar(h);
    assert.equal(r.codigo, 200); assert.equal(r.corpo.origem, undefined);
    assert.equal(tse.total(), 1); assert.equal(r.cab['X-Apuracao-Soma'], undefined);
  });
});

test('on + nacional parado: entrega a soma, rotulada, maior que o nacional', opt, async () => {
  await com('on', { nacional: parado() }, async (tse, h) => {
    const r = await chamar(h);
    assert.equal(r.codigo, 200); assert.equal(r.corpo.origem, 'soma_dos_estados');
    assert.equal(r.corpo.votos.total, 125275835);
    assert.equal(r.cab['X-Apuracao-Soma'], 'on:ok');
    assert.equal(tse.total(), 1 + 28);
    assert.ok(r.corpo.turno && r.corpo.fonte_url);
  });
});

test('sombra: calcula mas entrega o nacional (corpo identico ao de antes)', opt, async () => {
  await com('sombra', { nacional: parado() }, async (tse, h) => {
    const r = await chamar(h);
    assert.equal(r.corpo.origem, undefined); assert.equal(r.corpo.votos.total, 125275835 - 1000);
    assert.equal(r.cab['X-Apuracao-Soma'], 'sombra:ok');
  });
});

test('on + nacional completo (100%): nao pede os estados', opt, async () => {
  await com('on', {}, async (tse, h) => {
    const r = await chamar(h);
    assert.equal(r.corpo.origem, undefined); assert.equal(tse.total(), 1);
  });
});

test('on + nacional em andamento e em dia: mantem o nacional', opt, async () => {
  const b = lerBruto('br'); b.s.st = String(nm(b.s.st) - 1);
  function nm(x) { return Number(x); }
  await com('on', { nacional: b }, async (tse, h) => {
    const r = await chamar(h);
    assert.equal(r.corpo.origem, undefined);
    assert.equal(r.cab['X-Apuracao-Soma'], 'on:nacional_em_dia');
  });
});

for (const [nome, ajuste, motivo] of [
  ['um estado fora do ar (500)', (t) => { t.modos.MG = { modo: '500' }; t.modos.mg = { modo: '500' }; }, 'estado_ausente'],
  ['exterior sem arquivo (404)', (t) => { t.modos.zz = { modo: '404' }; }, 'tse_404'],
  ['estado com JSON corrompido', (t) => { t.modos.sp = { modo: 'corrompido' }; }, 'estado_ausente'],
  ['estado devolvendo vazio', (t) => { t.modos.ba = { modo: 'vazio' }; }, 'estado_ausente'],
  ['TSE recusa (403) em um estado', (t) => { t.modos.rj = { modo: '403' }; }, 'tse_403'],
]) {
  test(`on + ${nome}: entrega o nacional e registra o motivo`, opt, async () => {
    await com('on', { nacional: parado(), ajustar: ajuste }, async (tse, h) => {
      const r = await chamar(h);
      assert.equal(r.codigo, 200); assert.equal(r.corpo.origem, undefined);
      assert.equal(r.corpo.votos.total, 125275835 - 1000);
      assert.equal(r.cab['X-Apuracao-Soma'], `on:${motivo}`);
    });
  });
}

test('estado lento demais: estoura o prazo e entrega o nacional', { ...opt, timeout: 20000 }, async () => {
  await com('on', { nacional: parado(), ajustar: (t) => { t.modos.sp = { modo: 'lento', atraso: 8000 }; } }, async (tse, h) => {
    const t0 = Date.now(); const r = await chamar(h);
    assert.equal(r.corpo.origem, undefined); assert.match(r.cab['X-Apuracao-Soma'], /on:(prazo_estourado|estado_ausente)/);
    assert.ok(Date.now() - t0 < 7500, `demorou ${Date.now() - t0} ms`);
  });
});

test('estado com dado incoerente (candidato a mais que os validos): nacional', opt, async () => {
  await com('on', { nacional: parado(), ajustar: (t) => { const b = lerBruto('sp'); b.v.vv = String(Number(b.v.vv) + 7); t.corpo.sp = b; } }, async (tse, h) => {
    const r = await chamar(h);
    assert.equal(r.corpo.origem, undefined); assert.equal(r.cab['X-Apuracao-Soma'], 'on:arquivo_invalido');
  });
});

test('?origem=nacional ignora a soma; ?origem=soma mostra a soma em sombra e explica a falha', opt, async () => {
  await com('sombra', { nacional: parado() }, async (tse, h) => {
    let r = await chamar(h, { origem: 'nacional' });
    assert.equal(r.corpo.origem, undefined); assert.equal(r.cab['X-Apuracao-Soma'], undefined); assert.equal(tse.total(), 1);
    r = await chamar(h, { origem: 'soma' });
    assert.equal(r.corpo.origem, 'soma_dos_estados');
  });
  await com('sombra', { nacional: parado(), ajustar: (t) => { t.modos.mg = { modo: '500' }; } }, async (tse, h) => {
    const r = await chamar(h, { origem: 'soma' });
    assert.equal(r.codigo, 503); assert.equal(r.corpo.erro, 'soma_indisponivel'); assert.equal(r.corpo.motivo, 'estado_ausente');
  });
});

test('origem=soma com o interruptor desligado e ignorado (off)', opt, async () => {
  await com('off', { nacional: parado() }, async (tse, h) => {
    const r = await chamar(h, { origem: 'soma' });
    assert.equal(r.corpo.origem, undefined); assert.equal(tse.total(), 1);
  });
});

test('outros cargos nunca usam a soma, mesmo com on', opt, async () => {
  await com('on', {}, async (tse, h) => {
    const res = resposta();
    await h({ method: 'GET', query: { cargo: 'governador', uf: 'SP' } }, res);
    assert.equal(res.cab['X-Apuracao-Soma'], undefined);
  });
});

test('disjuntor: depois de 3 falhas seguidas, para de insistir no TSE', opt, async () => {
  await com('on', { nacional: parado(), ajustar: (t) => { t.modos.mg = { modo: '500' }; } }, async (tse, h) => {
    for (let i = 0; i < 3; i++) await chamar(h, { limite: String(10 + i) }); // chaves de cache diferentes
    const antes = tse.total();
    const r = await chamar(h, { limite: '50' });
    assert.equal(r.cab['X-Apuracao-Soma'], 'on:disjuntor_aberto');
    assert.equal(tse.total() - antes, 1); // só o nacional
    assert.equal(r.corpo.origem, undefined);
  });
});

test('mesma tela em duas chamadas seguidas usa a memoria: 1 rodada de pedidos', opt, async () => {
  await com('on', { nacional: parado() }, async (tse, h) => {
    await chamar(h); const n1 = tse.total(); await chamar(h);
    assert.equal(tse.total(), n1);
  });
});
