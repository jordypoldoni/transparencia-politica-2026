import { sessaoAtual } from './perfilUsuario';

// "ESTA CONTA É A ADMINISTRADORA?" (02/11/2026). Só para mostrar ou esconder o item "Avisos de erro" no menu.
// Esconder é conforto: quem digitar o endereço /admin/avisos na mão continua recusado pelo SERVIDOR, que confere o token.
// O resultado fica na sessão da aba (por conta), para o menu não perguntar a cada página. Qualquer falha = não é admin.
export async function souAdmin() {
  try {
    const s = await sessaoAtual();
    if (!s || !s.user) return false;
    const chave = `lume:admin:${s.user.id}`;
    try { const g = sessionStorage.getItem(chave); if (g !== null) return g === '1'; } catch (_) { /* sem armazenamento: pergunta ao servidor */ }
    const r = await fetch('/api/admin/sou-admin', { headers: { Authorization: `Bearer ${s.access_token}` } });
    if (!r.ok) return false;
    const j = await r.json().catch(() => ({}));
    const v = j.admin === true;
    try { sessionStorage.setItem(chave, v ? '1' : '0'); } catch (_) { /* ok */ }
    return v;
  } catch (_) {
    return false;
  }
}
