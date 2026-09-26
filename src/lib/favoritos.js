// FAVORITOS (coração nos cartões). (26/09/2026)
//
// Favoritar político ou partido é preferência política, dado SENSÍVEL. Mesma regra das respostas:
// - sem login: só neste navegador (localStorage), nada sai do aparelho;
// - com login e consentimento na versão que cita favoritos: também no perfil (banco 2, RLS).
// Ver supabase/banco2/003_favoritos.sql e /privacidade.
//
// A tela nunca espera o banco: o coração muda na hora (navegador) e o perfil acompanha por trás.
// Todos os corações da página escutam o mesmo evento, então favoritar num cartão atualiza o mesmo
// político em qualquer outro lugar visível.
//
// Chave: o ENDEREÇO da página (perfil /senador/..., ficha /candidato-senador/...) ou a sigla do
// partido. Limite conhecido: quem tem mandato E é candidato tem duas páginas, e favoritar uma não
// marca a outra. Unificar pelo cadastro do parlamentar fica para depois.
import { useEffect, useState, useCallback } from 'react';
import { sessaoAtual, banco } from './perfilUsuario';

const CHAVE_LOCAL = 'lume:favoritos';
const EVENTO = 'lume:favoritos';
export const TIPOS = ['parlamentar', 'candidato', 'partido'];
const id = (tipo, chave) => `${tipo}|${chave}`;

export function lerFavoritos() {
  try { return JSON.parse(window.localStorage.getItem(CHAVE_LOCAL) || '{}') || {}; } catch { return {}; }
}
function gravar(mapa) {
  try { window.localStorage.setItem(CHAVE_LOCAL, JSON.stringify(mapa)); } catch { /* bloqueado: segue sem */ }
  try { window.dispatchEvent(new CustomEvent(EVENTO)); } catch { /* sem window */ }
}

async function espelharNoPerfil(acao, fav) {
  const b = banco();
  const s = await sessaoAtual().catch(() => null);
  if (!b || !s) return;
  if (acao === 'remover') {
    await b.from('favoritos').delete().match({ user_id: s.user.id, tipo: fav.tipo, chave: fav.chave });
  } else {
    // Sem consentimento na versão nova o banco recusa (política do SQL). O navegador já guardou.
    await b.from('favoritos').upsert({ user_id: s.user.id, tipo: fav.tipo, chave: fav.chave, rotulo: fav.rotulo, detalhe: fav.detalhe || null });
  }
}

export function alternarFavorito({ tipo, chave, rotulo, detalhe = null, foto = null }) {
  if (!TIPOS.includes(tipo) || !chave || !rotulo) return false;
  const mapa = lerFavoritos();
  const k = id(tipo, chave);
  const fav = { tipo, chave, rotulo: String(rotulo).slice(0, 120), detalhe: detalhe ? String(detalhe).slice(0, 120) : null, foto, criado_em: new Date().toISOString() };
  const agora = !mapa[k];
  if (agora) mapa[k] = fav; else delete mapa[k];
  gravar(mapa);
  espelharNoPerfil(agora ? 'adicionar' : 'remover', fav).catch(() => {});
  return agora;
}

// Hook para um coração: diz se está marcado e acompanha mudanças feitas em outros cartões.
export function useFavorito(tipo, chave) {
  const [marcado, setMarcado] = useState(false);
  useEffect(() => {
    const atualizar = () => setMarcado(Boolean(lerFavoritos()[id(tipo, chave)]));
    atualizar();
    window.addEventListener(EVENTO, atualizar);
    window.addEventListener('storage', atualizar); // outra aba
    return () => { window.removeEventListener(EVENTO, atualizar); window.removeEventListener('storage', atualizar); };
  }, [tipo, chave]);
  return marcado;
}

// Hook da lista inteira (seção "Seus favoritos").
export function useFavoritos() {
  const [lista, setLista] = useState([]);
  const atualizar = useCallback(() => {
    setLista(Object.values(lerFavoritos()).sort((a, b) => String(b.criado_em).localeCompare(String(a.criado_em))));
  }, []);
  useEffect(() => {
    atualizar();
    window.addEventListener(EVENTO, atualizar);
    window.addEventListener('storage', atualizar);
    return () => { window.removeEventListener(EVENTO, atualizar); window.removeEventListener('storage', atualizar); };
  }, [atualizar]);
  return lista;
}

// Depois do login com consentimento: junta os dois lados. O que só existe no navegador sobe para
// o perfil; o que só existe no perfil (marcado em outro aparelho) desce para o navegador.
// Devolve quantos subiram e quantos desceram, para a página do perfil dizer.
export async function sincronizarFavoritos() {
  const b = banco();
  const s = await sessaoAtual().catch(() => null);
  if (!b || !s) return { subiram: 0, desceram: 0 };
  const { data, error } = await b.from('favoritos').select('tipo, chave, rotulo, detalhe, criado_em');
  if (error) throw error;
  const locais = lerFavoritos();
  const remotos = Object.fromEntries((data || []).map((f) => [id(f.tipo, f.chave), f]));
  const subir = Object.entries(locais).filter(([k]) => !remotos[k]).map(([, f]) => ({ user_id: s.user.id, tipo: f.tipo, chave: f.chave, rotulo: f.rotulo, detalhe: f.detalhe || null }));
  if (subir.length) {
    const { error: e2 } = await b.from('favoritos').upsert(subir);
    if (e2) throw e2;
  }
  let desceram = 0;
  for (const [k, f] of Object.entries(remotos)) {
    if (!locais[k]) { locais[k] = { ...f, foto: null }; desceram++; }
  }
  if (desceram) gravar(locais);
  return { subiram: subir.length, desceram };
}
