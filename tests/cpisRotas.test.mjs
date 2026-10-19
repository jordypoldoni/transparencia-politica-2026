import test from 'node:test';
import assert from 'node:assert/strict';
import { slugPedido, lerSlug, nomeOrgao, horaDe } from '../src/lib/cpisRotas.js';

test('slug de ida e volta', () => {
  assert.equal(slugPedido(1, 2026), 'rcp-1-2026');
  assert.deepEqual(lerSlug('rcp-1-2026'), { numero: 1, ano: 2026 });
  assert.deepEqual(lerSlug(slugPedido(11, 2023)), { numero: 11, ano: 2023 });
});

test('slug invalido vira null, sem chance de injecao no banco', () => {
  for (const s of ['', null, undefined, 'rcp-1', 'RCP-1-2026', 'rcp-1-2026/x', 'rcp-a-2026', "rcp-1-2026'--", 'rcp-1-1999', 'rcp-12345-2026']) {
    assert.equal(lerSlug(s), null, String(s));
  }
});

test('orgao conhecido tem nome; desconhecido mostra a sigla; vazio e null', () => {
  assert.equal(nomeOrgao('MESA'), 'Mesa Diretora');
  assert.equal(nomeOrgao('plen'), 'Plenário');
  assert.equal(nomeOrgao('XPTO'), 'XPTO');
  assert.equal(nomeOrgao(null), null);
});

test('hora vem do carimbo, sem fuso', () => {
  assert.equal(horaDe('2026-02-02T09:54:00'), '09h54');
  assert.equal(horaDe('2026-02-02'), null);
  assert.equal(horaDe(null), null);
});
