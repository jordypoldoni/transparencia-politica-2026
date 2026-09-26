// PERFIL DO USUÁRIO, no navegador. (25/09/2026)
//
// Fala com o BANCO 2 (supabase/banco2/001_perfis_afinidade.sql) usando a chave PUBLICÁVEL e a
// sessão de quem entrou: a proteção é a RLS do banco, que só deixa cada pessoa ver e gravar o que
// é dela. A chave de serviço nunca vem para o navegador.
//
// SEM LOGIN, NADA SE PERDE: as respostas ficam neste navegador (localStorage). Quando a pessoa
// entra, `levarRespostasLocaisProPerfil` sobe o que estava aqui, sem apagar o que já havia no perfil
// com data mais nova.
//
// O TEXTO LIVRE NÃO PASSA POR AQUI: ele vai para a IA sugerir respostas e morre ali. Só a resposta
// CONFIRMADA pela pessoa é guardada (ver o porquê no SQL).
//
// Variáveis (as duas são públicas por natureza, por isso o prefixo NEXT_PUBLIC_):
//   NEXT_PUBLIC_SUPABASE_URL_2              endereço do banco 2
//   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY_2  chave publicável (sb_publishable_...) do banco 2
// Sem elas o site segue funcionando só com o navegador, e `perfilDisponivel` diz isso.
import { createClient } from '@supabase/supabase-js';
import { RESPOSTAS_VALIDAS, perguntaPorId } from './perguntasAfinidade';

// 2026-09-26: o texto do consentimento passou a citar os FAVORITOS (supabase/banco2/003_favoritos.sql).
export const VERSAO_CONSENTIMENTO = '2026-09-26';
const CHAVE_LOCAL = 'lume:afinidade';

const URL2 = process.env.NEXT_PUBLIC_SUPABASE_URL_2;
const CHAVE2 = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY_2;
export const perfilDisponivel = Boolean(URL2 && CHAVE2);

// Um cliente só para o site inteiro: dois clientes de login no mesmo navegador brigam pela sessão.
// Exportado para src/lib/favoritos.js usar o mesmo.
let cliente = null;
export function banco() {
  if (!perfilDisponivel || typeof window === 'undefined') return null;
  if (!cliente) cliente = createClient(URL2, CHAVE2, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } });
  return cliente;
}

// ── Respostas neste navegador ────────────────────────────────────────────────────────────
// Formato: { [pergunta_id]: { resposta, origem, respondido_em } }
export function lerRespostasLocais() {
  try { return JSON.parse(window.localStorage.getItem(CHAVE_LOCAL) || '{}') || {}; } catch { return {}; }
}
// Avisa as páginas abertas (o questionário) que as respostas deste navegador mudaram, por
// exemplo porque desceram do perfil depois do login em outro aparelho.
export const EVENTO_RESPOSTAS = 'lume:respostas';
function gravarLocais(mapa) {
  try { window.localStorage.setItem(CHAVE_LOCAL, JSON.stringify(mapa)); } catch { /* bloqueado: segue sem */ }
  try { window.dispatchEvent(new CustomEvent(EVENTO_RESPOSTAS)); } catch { /* sem window */ }
}
export function limparRespostasLocais() {
  try { window.localStorage.removeItem(CHAVE_LOCAL); } catch { /* nada */ }
}

// Valida antes de gravar em qualquer lugar: pergunta que existe, resposta e origem conhecidas.
function validar({ pergunta_id, resposta, origem }) {
  if (!perguntaPorId(pergunta_id)) throw new Error(`pergunta desconhecida: ${pergunta_id}`);
  if (!RESPOSTAS_VALIDAS.includes(resposta)) throw new Error(`resposta inválida: ${resposta}`);
  if (!['escolha', 'ia_confirmada', 'ia_corrigida'].includes(origem)) throw new Error(`origem inválida: ${origem}`);
}

// ── Sessão ───────────────────────────────────────────────────────────────────────────────
export async function sessaoAtual() {
  const b = banco();
  if (!b) return null;
  const { data } = await b.auth.getSession();
  return data.session || null;
}

// Entrar por link no e-mail: sem senha para guardar nem vazar. `voltarPara` é a página aberta.
export async function entrarComEmail(email, voltarPara) {
  const b = banco();
  if (!b) throw new Error('perfil indisponível');
  const { error } = await b.auth.signInWithOtp({ email, options: { emailRedirectTo: voltarPara } });
  if (error) throw error;
}

// Entrar com Google (26/09/2026). O Google devolve a pessoa para `voltarPara`, que precisa
// estar na lista de endereços permitidos do Supabase (Authentication, URL Configuration).
export async function entrarComGoogle(voltarPara) {
  const b = banco();
  if (!b) throw new Error('perfil indisponível');
  const { error } = await b.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: voltarPara } });
  if (error) throw error;
}

// Avisa quem estiver ouvindo (o botão do cabeçalho, a página do perfil) quando a pessoa entra
// ou sai. Devolve a função que para de ouvir.
export function aoMudarSessao(cb) {
  const b = banco();
  if (!b) return () => {};
  const { data } = b.auth.onAuthStateChange((_evento, sessao) => cb(sessao || null));
  return () => data?.subscription?.unsubscribe();
}

export async function atualizarUf(uf) {
  const b = banco();
  const s = await sessaoAtual();
  if (!b || !s) return;
  const { error } = await b.from('perfis').update({ uf: uf ? String(uf).toUpperCase() : null }).eq('id', s.user.id);
  if (error) throw error;
}

// SAIR LIMPA O APARELHO (26/09/2026). Com a sincronização, as respostas e os favoritos do perfil
// descem para o navegador de qualquer aparelho em que a pessoa entrar, inclusive um computador
// emprestado. Ao sair, se estava tudo guardado no perfil (autorização em dia), a cópia local é
// apagada: dado político não fica para o próximo que usar o aparelho. Sem autorização, a cópia
// local é a ÚNICA que existe, e fica.
export async function sair() {
  const b = banco();
  if (!b) return;
  const guardadoNoPerfil = await consentimentoEmDia().catch(() => false);
  await b.auth.signOut();
  if (guardadoNoPerfil) {
    limparRespostasLocais();
    try {
      ['lume:favoritos', 'lume:favoritos:sinc'].forEach((k) => window.localStorage.removeItem(k));
      window.dispatchEvent(new CustomEvent('lume:favoritos'));
      window.dispatchEvent(new CustomEvent(EVENTO_RESPOSTAS));
    } catch { /* nada */ }
  }
}

// ── Perfil e consentimento ───────────────────────────────────────────────────────────────
export async function lerPerfil() {
  const b = banco();
  const s = await sessaoAtual();
  if (!b || !s) return null;
  const { data, error } = await b.from('perfis').select('uf, consentimento_em, consentimento_versao').eq('id', s.user.id).maybeSingle();
  if (error) throw error;
  return data;
}

export async function consentimentoEmDia() {
  const p = await lerPerfil();
  return Boolean(p?.consentimento_em && p.consentimento_versao >= VERSAO_CONSENTIMENTO);
}

// Sem isto o banco recusa gravar respostas (política do SQL). Chamar só depois de a pessoa
// marcar o aceite na tela, com o texto da versão VERSAO_CONSENTIMENTO à vista.
export async function registrarConsentimento({ uf = null } = {}) {
  const b = banco();
  const s = await sessaoAtual();
  if (!b || !s) throw new Error('é preciso entrar primeiro');
  const { error } = await b.from('perfis').upsert({
    id: s.user.id,
    uf: uf ? String(uf).toUpperCase() : null,
    consentimento_em: new Date().toISOString(),
    consentimento_versao: VERSAO_CONSENTIMENTO,
  });
  if (error) throw error;
}

// ── Respostas ────────────────────────────────────────────────────────────────────────────
// Grava onde der: no perfil, se houver sessão com consentimento; senão, só no navegador.
// Devolve onde gravou, para a tela poder dizer isso.
export async function salvarResposta({ pergunta_id, resposta, origem }) {
  validar({ pergunta_id, resposta, origem });
  const respondido_em = new Date().toISOString();
  const locais = lerRespostasLocais();
  locais[pergunta_id] = { resposta, origem, respondido_em };
  gravarLocais(locais);

  const b = banco();
  const s = await sessaoAtual();
  if (!b || !s) return 'navegador';
  const { error } = await b.from('respostas_afinidade').upsert({ user_id: s.user.id, pergunta_id, resposta, origem, respondido_em });
  if (error) return 'navegador'; // ex.: sem consentimento ainda. O navegador guardou.
  return 'perfil';
}

export async function lerRespostas() {
  const b = banco();
  const s = await sessaoAtual();
  if (!b || !s) return lerRespostasLocais();
  const { data, error } = await b.from('respostas_afinidade').select('pergunta_id, resposta, origem, respondido_em');
  if (error) return lerRespostasLocais();
  const mapa = {};
  for (const r of data || []) mapa[r.pergunta_id] = { resposta: r.resposta, origem: r.origem, respondido_em: r.respondido_em };
  return mapa;
}

// SINCRONIZAR RESPOSTAS NOS DOIS SENTIDOS (26/09/2026). Antes só SUBIA (no momento da
// autorização) e nunca DESCIA: quem respondeu no celular e entrou no computador via o
// questionário vazio, porque a página do questionário lê só este navegador. Agora, com sessão e
// autorização em dia, junta os dois lados e em conflito fica a resposta MAIS NOVA.
export async function sincronizarRespostas() {
  const b = banco();
  const s = await sessaoAtual();
  if (!b || !s) return { subiram: 0, desceram: 0 };
  const { data, error } = await b.from('respostas_afinidade').select('pergunta_id, resposta, origem, respondido_em');
  if (error) throw error;
  const remotas = Object.fromEntries((data || []).map((r) => [r.pergunta_id, r]));
  const locais = lerRespostasLocais();
  const subir = Object.entries(locais)
    .filter(([id, r]) => perguntaPorId(id) && (!remotas[id] || remotas[id].respondido_em < r.respondido_em))
    .map(([pergunta_id, r]) => ({ user_id: s.user.id, pergunta_id, resposta: r.resposta, origem: r.origem, respondido_em: r.respondido_em }));
  if (subir.length) {
    const { error: e2 } = await b.from('respostas_afinidade').upsert(subir);
    if (e2) throw e2;
  }
  let desceram = 0;
  for (const [id, r] of Object.entries(remotas)) {
    if (!perguntaPorId(id)) continue;
    if (!locais[id] || locais[id].respondido_em < r.respondido_em) {
      locais[id] = { resposta: r.resposta, origem: r.origem, respondido_em: r.respondido_em };
      desceram++;
    }
  }
  if (desceram) gravarLocais(locais);
  return { subiram: subir.length, desceram };
}

// Depois do login: sobe o que estava no navegador. Em conflito, fica a resposta MAIS NOVA.
export async function levarRespostasLocaisProPerfil() {
  const b = banco();
  const s = await sessaoAtual();
  if (!b || !s) return 0;
  const locais = lerRespostasLocais();
  const doPerfil = await lerRespostas();
  const subir = Object.entries(locais)
    .filter(([id, r]) => perguntaPorId(id) && (!doPerfil[id] || doPerfil[id].respondido_em < r.respondido_em))
    .map(([pergunta_id, r]) => ({ user_id: s.user.id, pergunta_id, resposta: r.resposta, origem: r.origem, respondido_em: r.respondido_em }));
  if (!subir.length) return 0;
  const { error } = await b.from('respostas_afinidade').upsert(subir);
  if (error) throw error;
  return subir.length;
}

// Apaga respostas e perfil no banco e no navegador. A conta de login em si sai por outro
// caminho (servidor, chave de serviço), ainda a construir.
export async function apagarMeusDados() {
  limparRespostasLocais();
  try { ['lume:favoritos', 'lume:favoritos:sinc'].forEach((k) => window.localStorage.removeItem(k)); window.dispatchEvent(new CustomEvent('lume:favoritos')); } catch { /* nada */ }
  const b = banco();
  const s = await sessaoAtual();
  if (!b || !s) return;
  const { error } = await b.rpc('apagar_meus_dados');
  if (error) throw error;
}
