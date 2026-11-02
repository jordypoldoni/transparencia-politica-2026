import { sessaoAtual } from './perfilUsuario';

// "ESTA CONTA É A ADMINISTRADORA?" e "QUANTOS AVISOS NOVOS?" (02/11/2026). Só para o menu: mostrar ou esconder o item
// "Avisos de erro" e pôr o número vermelho ao lado dele.
// Esconder é conforto: quem digitar o endereço /admin/avisos na mão continua recusado pelo SERVIDOR, que confere o token.
// "É admin?" fica na sessão da aba (por conta): quem NÃO é admin nunca mais pergunta. Quem é admin pergunta de novo a cada
// página, porque o número muda. Qualquer falha = não é admin, zero avisos.
export const EVENTO_AVISOS = 'lume:avisos-mudou';

// O painel chama isto depois de mudar um status, para o número do menu acompanhar na hora.
export function avisarMudancaDeAvisos() {
  try { window.dispatchEvent(new Event(EVENTO_AVISOS)); } catch (_) { /* ok */ }
}

export async function consultarAdmin() {
  const nao = { admin: false, novos: 0 };
  try {
    const s = await sessaoAtual();
    if (!s || !s.user) return nao;
    const chave = `lume:admin:${s.user.id}`;
    try { if (sessionStorage.getItem(chave) === '0') return nao; } catch (_) { /* sem armazenamento: pergunta ao servidor */ }
    const r = await fetch('/api/admin/sou-admin', { headers: { Authorization: `Bearer ${s.access_token}` } });
    if (!r.ok) return nao;
    const j = await r.json().catch(() => ({}));
    const admin = j.admin === true;
    try { sessionStorage.setItem(chave, admin ? '1' : '0'); } catch (_) { /* ok */ }
    const n = Number(j.novos);
    return { admin, novos: admin && Number.isFinite(n) && n > 0 ? Math.floor(n) : 0 };
  } catch (_) {
    return nao;
  }
}
