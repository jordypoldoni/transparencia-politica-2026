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
// 2026-09-27: passou a citar os CANDIDATOS ESCOLHIDOS na cédula (supabase/banco2/004_meu_voto.sql).
export const VERSAO_CONSENTIMENTO = '2026-09-27';
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
export async function entrarComGoogle(voltarPara, { email } = {}) {
  const b = banco();
  if (!b) throw new Error('perfil indisponível');
  // ESCOLHER A CONTA SEMPRE (27/09/2026). Sem isto o Google entra direto com a conta já aberta
  // no navegador: quem saiu e quis entrar com outra conta caía de novo na mesma (Jordy chamou de
  // "problema com cookies"). prompt=select_account faz o Google perguntar qual conta usar.
  // Com `email` (a conta lembrada neste aparelho), vai direto para ela: login_hint.
  const queryParams = email ? { login_hint: email } : { prompt: 'select_account' };
  const { error } = await b.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: voltarPara, queryParams } });
  if (error) throw error;
}

// CONTA LEMBRADA NESTE APARELHO (27/09/2026, pedido do Jordy: "facilmente o usuário poderia
// esquecer que já tem uma conta e entrar com uma conta do Gmail diferente"). O seletor do Google
// mostra todas as contas do navegador e nada dizia qual foi usada antes; escolher outra cria um
// perfil novo e vazio. Agora o aparelho lembra o e-mail da última entrada: o /entrar oferece
// "Continuar com essa conta", e o /perfil avisa quando a conta acabou de ser criada e não é a
// lembrada. Fica só neste navegador; a tela mostra o e-mail mascarado. Sair não esquece (é o
// ponto: lembrar na próxima entrada); apagar a conta esquece.
const CHAVE_CONTA = 'lume:conta-lembrada';
const JANELA_CONTA_NOVA_MS = 15 * 60 * 1000;
export function contaLembrada() {
  try { const c = JSON.parse(window.localStorage.getItem(CHAVE_CONTA) || 'null'); return c?.email ? c : null; } catch { return null; }
}
export function lembrarConta(user) {
  if (!user?.email) return;
  try { window.localStorage.setItem(CHAVE_CONTA, JSON.stringify({ email: user.email })); } catch { /* nada */ }
}
export function esquecerConta() {
  try { window.localStorage.removeItem(CHAVE_CONTA); } catch { /* nada */ }
}
export function mascararEmail(email) {
  const [usuario, dominio] = String(email || '').split('@');
  if (!dominio) return String(email || '');
  return `${usuario.slice(0, 2)}•••@${dominio}`;
}
// A conta aberta acabou de ser criada e NÃO é a lembrada? Devolve a lembrada (provável engano);
// senão, null. Conta antiga com outro e-mail não conta: aí a pessoa só trocou de conta.
export function contaNovaDiferente(user) {
  const lembrada = contaLembrada();
  if (!user?.email || !lembrada) return null;
  if (lembrada.email.toLowerCase() === String(user.email).toLowerCase()) return null;
  const criada = Date.parse(user.created_at || '');
  if (!criada || Date.now() - criada > JANELA_CONTA_NOVA_MS) return null;
  return lembrada;
}
// Guarda a conta aberta como a lembrada, a não ser que ela seja o provável engano acima (aí quem
// decide é a pessoa, no aviso do /perfil).
export function lembrarSeNaoForEngano(user) {
  if (user && !contaNovaDiferente(user)) lembrarConta(user);
}

// Avisa quem estiver ouvindo (o botão do cabeçalho, a página do perfil) quando a pessoa entra
// ou sai. Devolve a função que para de ouvir.
export function aoMudarSessao(cb) {
  const b = banco();
  if (!b) return () => {};
  // TRAVA DO SUPABASE (27/09/2026). O Supabase chama este aviso DE DENTRO da trava da sessão e
  // ESPERA a função terminar. O /perfil passava uma função que devolvia promessa e, dentro dela,
  // lia a sessão de novo: a leitura esperava a trava, a trava esperava a leitura, e tudo que
  // dependia da sessão parava. Foi por isso que "Sair" não saía (Jordy, 27/09). A documentação do
  // Supabase manda exatamente isto: não chamar o Supabase dentro do aviso e adiar com setTimeout.
  // Adiando aqui, vale para todo mundo que usa aoMudarSessao, e nada é devolvido para ser esperado.
  const { data } = b.auth.onAuthStateChange((_evento, sessao) => {
    setTimeout(() => { try { cb(sessao || null); } catch (e) { console.error('[sessão]', e); } }, 0);
  });
  return () => data?.subscription?.unsubscribe();
}

export async function atualizarUf(uf) {
  const b = banco();
  const s = await sessaoAtual();
  if (!b || !s) return;
  const { error } = await b.from('perfis').update({ uf: uf ? String(uf).toUpperCase() : null }).eq('id', s.user.id);
  if (error) throw error;
}

// ESTADO DA PESSOA, UM SÓ (27/09/2026). O Jordy escolheu RS no perfil e o "Quem vota como você"
// abriu com "Escolha o estado": o perfil guardava a UF no banco, a cédula e o questionário liam o
// `prefs` do navegador, e nada ligava os dois. Agora toda escolha de estado passa por definirUf
// (grava no navegador e, com autorização em dia, no perfil) e a sincronização desce a UF do perfil
// para o navegador. O perfil ganha quando os dois divergem: toda troca feita com a conta aberta já
// sobe na hora, então ele é o mais recente.
export const EVENTO_UF = 'lume:uf';
const UF_VALIDA = /^[A-Z]{2}$/;
export function ufLocal() {
  try { const u = (JSON.parse(window.localStorage.getItem('prefs') || '{}') || {}).uf; return UF_VALIDA.test(u || '') ? u : ''; } catch { return ''; }
}
function gravarUfLocal(uf) {
  try {
    const p = JSON.parse(window.localStorage.getItem('prefs') || '{}') || {};
    window.localStorage.setItem('prefs', JSON.stringify({ ...p, uf }));
    window.dispatchEvent(new CustomEvent(EVENTO_UF));
  } catch { /* nada */ }
}
export async function definirUf(uf) {
  const u = String(uf || '').toUpperCase();
  if (!UF_VALIDA.test(u)) return;
  if (ufLocal() !== u) gravarUfLocal(u);
  if (await consentimentoEmDia().catch(() => false)) await atualizarUf(u);
}
export async function sincronizarUf() {
  const p = await lerPerfil();
  const local = ufLocal();
  if (p?.uf && p.uf !== local) { gravarUfLocal(p.uf); return { desceu: 1, subiu: 0 }; }
  if (!p?.uf && local) { await atualizarUf(local); return { desceu: 0, subiu: 1 }; }
  return { desceu: 0, subiu: 0 };
}

// SAIR LIMPA O APARELHO (26/09/2026). Com a sincronização, as respostas e os favoritos do perfil
// descem para o navegador de qualquer aparelho em que a pessoa entrar, inclusive um computador
// emprestado. Ao sair, se estava tudo guardado no perfil (autorização em dia), a cópia local é
// apagada: dado político não fica para o próximo que usar o aparelho. Sem autorização, a cópia
// local é a ÚNICA que existe, e fica.
export async function sair() {
  const b = banco();
  if (!b) return;
  // Se a consulta demorar, sai do mesmo jeito e mantém o que está no aparelho (o lado seguro:
  // nada se perde). Sair vale SÓ para este aparelho (scope local): o global derrubava também a
  // sessão do celular e dependia da rede para funcionar.
  const guardadoNoPerfil = await Promise.race([
    consentimentoEmDia().catch(() => false),
    new Promise((r) => setTimeout(() => r(false), 3000)),
  ]);
  await b.auth.signOut({ scope: 'local' });
  if (guardadoNoPerfil) {
    limparRespostasLocais();
    try {
      ['lume:favoritos', 'lume:favoritos:sinc', 'lume:meuvoto', 'lume:meuvoto:sinc'].forEach((k) => window.localStorage.removeItem(k));
      window.dispatchEvent(new CustomEvent('lume:favoritos'));
      window.dispatchEvent(new CustomEvent('lume:meuvoto'));
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
    const { error: e2 } = await b.from('respostas_afinidade').upsert(subir, { onConflict: 'user_id,pergunta_id' });
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

function limparAparelho() {
  limparRespostasLocais();
  try {
    ['lume:favoritos', 'lume:favoritos:sinc', 'lume:meuvoto', 'lume:meuvoto:sinc', 'prefs'].forEach((k) => window.localStorage.removeItem(k));
    window.dispatchEvent(new CustomEvent('lume:meuvoto'));
    window.sessionStorage.removeItem('lume:afinidade:tela');
    window.dispatchEvent(new CustomEvent('lume:favoritos'));
    window.dispatchEvent(new CustomEvent(EVENTO_RESPOSTAS));
  } catch { /* nada */ }
}

// APAGAR A CONTA (27/09/2026). Antes apagava respostas e perfil e deixava a conta de login de
// pé (e os favoritos no banco, que a função do SQL não cobria). Agora a rota do servidor apaga a
// conta inteira, e com ela tudo o que é da pessoa; aqui o navegador é limpo e a sessão encerrada.
export async function apagarMinhaConta() {
  const b = banco();
  const s = await sessaoAtual();
  if (!b || !s) { limparAparelho(); return; }
  const r = await fetch('/api/apagar-conta', { method: 'POST', headers: { Authorization: `Bearer ${s.access_token}` } });
  if (!r.ok) throw new Error(`apagar-conta ${r.status}`);
  limparAparelho();
  esquecerConta();
  await b.auth.signOut({ scope: 'local' }).catch(() => {});
}
export const apagarMeusDados = apagarMinhaConta; // nome antigo, mesmo efeito

// SESSÃO DE CONTA QUE NÃO EXISTE MAIS (27/09/2026). O navegador guarda a sessão; se a conta for
// apagada (pelo botão, em outro aparelho, ou no painel do Supabase), a sessão guardada continua
// parecendo válida: o site mostrava a pessoa logada numa conta fantasma, o /entrar mandava direto
// para o /perfil e não havia como entrar com outra conta. Aqui a sessão é conferida no servidor
// do Supabase; se a conta sumiu, a sessão local é encerrada.
export async function validarSessao() {
  const b = banco();
  if (!b) return null;
  const { data } = await b.auth.getSession();
  if (!data.session) return null;
  const { data: u, error } = await b.auth.getUser();
  if (error && (error.status === 401 || error.status === 403 || /not.?found|does not exist/i.test(error.message || ''))) {
    await b.auth.signOut({ scope: 'local' }).catch(() => {});
    return null;
  }
  return u?.user || data.session.user;
}
