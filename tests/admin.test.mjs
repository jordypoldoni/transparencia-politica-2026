import test from 'node:test';
import assert from 'node:assert/strict';
import { ehAdmin, validarMudancaStatus, filtroValido, contarPorStatus } from '../src/lib/admin.js';

test('ehAdmin: só o e-mail da variável, confirmado, sem diferenciar maiúscula', () => {
  const u = { email: 'Jordy@Exemplo.com', email_confirmed_at: '2026-11-02T10:00:00Z' };
  assert.equal(ehAdmin(u, 'jordy@exemplo.com'), true);
  assert.equal(ehAdmin({ ...u, email: 'outro@exemplo.com' }, 'jordy@exemplo.com'), false);
  assert.equal(ehAdmin({ email: 'jordy@exemplo.com' }, 'jordy@exemplo.com'), false); // não confirmado
});

test('ehAdmin: sem variável configurada ou sem usuário, ninguém é administrador', () => {
  const u = { email: 'a@b.com', email_confirmed_at: 'x' };
  assert.equal(ehAdmin(u, ''), false);
  assert.equal(ehAdmin(u, undefined), false);
  assert.equal(ehAdmin(null, 'a@b.com'), false);
  assert.equal(ehAdmin({ email: '', email_confirmed_at: 'x' }, ''), false);
});

test('validarMudancaStatus: id inteiro positivo e status da lista', () => {
  assert.deepEqual(validarMudancaStatus({ id: '7', status: 'corrigido' }), { ok: true, id: 7, status: 'corrigido' });
  assert.equal(validarMudancaStatus({ id: 0, status: 'novo' }).ok, false);
  assert.equal(validarMudancaStatus({ id: 1.5, status: 'novo' }).ok, false);
  assert.equal(validarMudancaStatus({ id: 1, status: 'apagado' }).ok, false);
  assert.equal(validarMudancaStatus().ok, false);
});

test('filtroValido e contarPorStatus', () => {
  assert.equal(filtroValido('novo'), 'novo');
  assert.equal(filtroValido('qualquer'), 'todos');
  assert.equal(filtroValido(undefined), 'todos');
  const c = contarPorStatus([{ status: 'novo' }, { status: 'novo' }, { status: 'corrigido' }, { status: 'x' }]);
  assert.deepEqual(c, { todos: 4, novo: 2, em_analise: 0, corrigido: 1, nao_procede: 0 });
});
