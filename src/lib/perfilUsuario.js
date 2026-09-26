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

export const VERSAO_CONSENTIMENTO = '2026-09-25';
const CHAVE_LOCAL = 'lume:afinidade';

const URL2 = process.env.NEXT_PUBLIC_SUPABASE_URL_2;
const CHAVE2 = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY_2;
export const perfilDisponivel = Boolean(URL2 && CHAVE2);

let cliente = null;
function banco() {
  if (!perfilDisponivel || typeof window === 'undefined') return null;
  if (!cliente) cliente = createClient(URL2, CHAVE2, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } });
  return cliente;
}

// ── Respostas neste navegador ────────────────────────────────────────────────────────────
// Formato: { [pergunta_id]: { resposta, origem, respondido_em } }
export function lerRespostasLocais() {
  try { return JSON.parse(window.localStorage.getItem(CHAVE_LOCAL) || '{}') || {}; } catch { return {}; }
}
function gravarLocais(mapa) {
  try { window.localStorage.setItem(CHAVE_LOCAL, JSON.stringify(mapa)); } catch { /* bloqueado: segue sem */ }
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

export async function sair() {
  const b = banco();
  if (b) await b.auth.signOut();
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
  const b = banco();
  const s = await sessaoAtual();
  if (!b || !s) return;
  const { error } = await b.rpc('apagar_meus_dados');
  if (error) throw error;
}
