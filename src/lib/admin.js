// ADMIN DO LUME (02/11/2026). Regras puras do painel /admin/avisos, com teste.
// Quem é administrador: SÓ a conta cujo e-mail está na variável ADMIN_EMAIL da Vercel (não fica no código público).
// A conferência é no SERVIDOR, sobre o token da sessão (auth.getUser), nunca sobre o que o navegador diz.

export const STATUS_AVISO = ['novo', 'em_analise', 'corrigido', 'nao_procede'];
export const ROTULO_STATUS = { novo: 'Novo', em_analise: 'Em análise', corrigido: 'Corrigido', nao_procede: 'Não procede' };

// user: o usuário devolvido pelo Supabase para o token. Exige e-mail igual (sem diferença de maiúscula) e confirmado pelo provedor.
export function ehAdmin(user, adminEmail) {
  const alvo = String(adminEmail || '').trim().toLowerCase();
  if (!alvo || !user) return false;
  const email = String(user.email || '').trim().toLowerCase();
  return email === alvo && Boolean(user.email_confirmed_at);
}

// Mudança de status: id inteiro positivo e status da lista.
export function validarMudancaStatus(corpo = {}) {
  const id = Number(corpo.id);
  if (!Number.isInteger(id) || id <= 0) return { ok: false, motivo: 'id inválido' };
  if (!STATUS_AVISO.includes(corpo.status)) return { ok: false, motivo: 'status inválido' };
  return { ok: true, id, status: corpo.status };
}

// Filtro da lista: um status ou "todos".
export function filtroValido(valor) {
  return STATUS_AVISO.includes(valor) ? valor : 'todos';
}

export function contarPorStatus(linhas = []) {
  const c = { todos: linhas.length };
  for (const s of STATUS_AVISO) c[s] = 0;
  for (const l of linhas) if (c[l.status] !== undefined) c[l.status] += 1;
  return c;
}
