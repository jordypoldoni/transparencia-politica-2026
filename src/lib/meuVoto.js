// MEU VOTO (27/09/2026, pedido do Jordy). A pessoa marca, na cédula e nas fichas, em quem pretende
// votar em cada cargo. É preferência política declarada, dado SENSÍVEL: mesma regra dos favoritos.
// - sem login: só neste navegador (localStorage), nada sai do aparelho;
// - com login e autorização na versão que cita o voto (VERSAO_CONSENTIMENTO >= 2026-09-27):
//   também no perfil (banco 2, tabela meu_voto, supabase/banco2/004_meu_voto.sql).
//
// VAGAS POR CARGO, como na urna de 4/10/2026: um nome para deputado federal, estadual, governador
// e presidente; DOIS para senador (em 2026 cada estado renova dois terços do Senado).
// Cargo de uma vaga TROCA ao escolher outro nome; senador com as duas vagas cheias recusa até a
// pessoa desmarcar um. Cada escolha guarda o estado (o voto é no estado onde a pessoa vota);
// presidente não tem estado.
//
// Sincroniza entre aparelhos igual aos favoritos (comparação de três pontas) e, depois de juntar,
// respeita as vagas: se dois aparelhos escolheram nomes diferentes para o mesmo cargo, fica o
// escolhido por último.
import { useEffect, useState, useCallback } from 'react';
import { sessaoAtual, banco } from './perfilUsuario';

export const CARGOS_VOTO = [
  { cargo: 'deputado-federal', rotulo: 'Deputado Federal', vagas: 1, rota: '/deputado-federal', ordem: 1 },
  { cargo: 'deputado-estadual', rotulo: 'Deputado Estadual', vagas: 1, rota: '/candidato-estadual', ordem: 2 },
  { cargo: 'senador', rotulo: 'Senador', vagas: 2, rota: '/candidato-senador', ordem: 3 },
  { cargo: 'governador', rotulo: 'Governador', vagas: 1, rota: '/candidato-governador', ordem: 4 },
  { cargo: 'presidente', rotulo: 'Presidente', vagas: 1, rota: '/presidencial', ordem: 5, nacional: true },
];
export const cargoVoto = (cargo) => CARGOS_VOTO.find((c) => c.cargo === cargo) || null;
export const cargoPelaRota = (rota) => CARGOS_VOTO.find((c) => c.rota === rota)?.cargo || null;

const CHAVE_LOCAL = 'lume:meuvoto';
const CHAVE_SINC = 'lume:meuvoto:sinc';
const EVENTO = 'lume:meuvoto';
const id = (cargo, chave) => `${cargo}|${chave}`;
const grupo = (v) => `${v.cargo}|${cargoVoto(v.cargo)?.nacional ? '' : (v.uf || '')}`;

export function lerVotos() {
  try { return JSON.parse(window.localStorage.getItem(CHAVE_LOCAL) || '{}') || {}; } catch { return {}; }
}
function gravar(mapa) {
  try { window.localStorage.setItem(CHAVE_LOCAL, JSON.stringify(mapa)); } catch { /* bloqueado */ }
  try { window.dispatchEvent(new CustomEvent(EVENTO)); } catch { /* sem window */ }
}
function lerSinc() {
  try { return new Set(JSON.parse(window.localStorage.getItem(CHAVE_SINC) || '[]')); } catch { return new Set(); }
}
function gravarSinc(conj) {
  try { window.localStorage.setItem(CHAVE_SINC, JSON.stringify([...conj])); } catch { /* nada */ }
}
export function limparVotosLocais() {
  try { [CHAVE_LOCAL, CHAVE_SINC].forEach((k) => window.localStorage.removeItem(k)); window.dispatchEvent(new CustomEvent(EVENTO)); } catch { /* nada */ }
}

// Quantos já escolhidos no mesmo cargo (e estado).
export function escolhidosNoCargo(cargo, uf, mapa = lerVotos()) {
  const g = grupo({ cargo, uf });
  return Object.values(mapa).filter((v) => grupo(v) === g);
}

async function espelhar(acao, v) {
  const b = banco();
  const s = await sessaoAtual().catch(() => null);
  if (!b || !s) return;
  const k = id(v.cargo, v.chave);
  const sinc = lerSinc();
  if (acao === 'remover') {
    const { error } = await b.from('meu_voto').delete().match({ user_id: s.user.id, cargo: v.cargo, chave: v.chave });
    if (!error) { sinc.delete(k); gravarSinc(sinc); }
  } else {
    // Sem UPDATE na tabela: ignorar duplicado (ON CONFLICT DO NOTHING), como nos favoritos.
    const { error } = await b.from('meu_voto').upsert(
      { user_id: s.user.id, cargo: v.cargo, chave: v.chave, uf: v.uf || null, rotulo: v.rotulo, detalhe: v.detalhe || null, escolhido_em: v.escolhido_em },
      { onConflict: 'user_id,cargo,chave', ignoreDuplicates: true });
    if (!error) { sinc.add(k); gravarSinc(sinc); }
  }
}

// Marca ou desmarca. Devolve { marcado, trocou (nome que saiu, em cargo de uma vaga), cheio }.
export function alternarVoto({ cargo, chave, rotulo, detalhe = null, foto = null, uf = null }) {
  const cfg = cargoVoto(cargo);
  if (!cfg || !chave || !rotulo) return { marcado: false };
  const mapa = lerVotos();
  const k = id(cargo, chave);
  if (mapa[k]) {
    const v = mapa[k];
    delete mapa[k];
    gravar(mapa);
    espelhar('remover', v).catch(() => {});
    return { marcado: false };
  }
  const v = { cargo, chave, rotulo: String(rotulo).slice(0, 120), detalhe: detalhe ? String(detalhe).slice(0, 120) : null, foto, uf: cfg.nacional ? null : (uf || null), escolhido_em: new Date().toISOString() };
  const ja = escolhidosNoCargo(cargo, v.uf, mapa);
  let trocou = null;
  if (ja.length >= cfg.vagas) {
    if (cfg.vagas > 1) return { marcado: false, cheio: true };
    for (const antigo of ja) { delete mapa[id(antigo.cargo, antigo.chave)]; espelhar('remover', antigo).catch(() => {}); trocou = antigo.rotulo; }
  }
  mapa[k] = v;
  gravar(mapa);
  espelhar('adicionar', v).catch(() => {});
  return { marcado: true, trocou };
}

export function useMeuVoto(cargo, chave, uf) {
  const [estado, setEstado] = useState({ marcado: false, cheio: false });
  useEffect(() => {
    const atualizar = () => {
      const mapa = lerVotos();
      const cfg = cargoVoto(cargo);
      const marcado = Boolean(mapa[id(cargo, chave)]);
      const cheio = !marcado && cfg && cfg.vagas > 1 && escolhidosNoCargo(cargo, uf, mapa).length >= cfg.vagas;
      setEstado({ marcado, cheio: Boolean(cheio) });
    };
    atualizar();
    window.addEventListener(EVENTO, atualizar);
    window.addEventListener('storage', atualizar);
    return () => { window.removeEventListener(EVENTO, atualizar); window.removeEventListener('storage', atualizar); };
  }, [cargo, chave, uf]);
  return estado;
}

export function useVotos() {
  const [lista, setLista] = useState([]);
  const atualizar = useCallback(() => {
    setLista(Object.values(lerVotos()).sort((a, b) => (cargoVoto(a.cargo)?.ordem || 9) - (cargoVoto(b.cargo)?.ordem || 9) || String(a.escolhido_em).localeCompare(String(b.escolhido_em))));
  }, []);
  useEffect(() => {
    atualizar();
    window.addEventListener(EVENTO, atualizar);
    window.addEventListener('storage', atualizar);
    return () => { window.removeEventListener(EVENTO, atualizar); window.removeEventListener('storage', atualizar); };
  }, [atualizar]);
  return lista;
}

// Sincroniza (três pontas, ver src/lib/favoritos.js) e depois aplica as vagas.
export async function sincronizarMeuVoto() {
  const b = banco();
  const s = await sessaoAtual().catch(() => null);
  if (!b || !s) return { subiram: 0, desceram: 0 };
  const { data, error } = await b.from('meu_voto').select('cargo, chave, uf, rotulo, detalhe, escolhido_em');
  if (error) throw error;
  const locais = lerVotos();
  const antes = lerSinc();
  const remotos = Object.fromEntries((data || []).map((v) => [id(v.cargo, v.chave), v]));

  const subir = [];
  for (const [k, v] of Object.entries(locais)) {
    if (remotos[k]) continue;
    if (antes.has(k)) delete locais[k];
    else subir.push(v);
  }
  let desceram = 0;
  for (const [k, v] of Object.entries(remotos)) {
    if (locais[k]) continue;
    if (antes.has(k)) {
      await b.from('meu_voto').delete().match({ user_id: s.user.id, cargo: v.cargo, chave: v.chave });
      delete remotos[k];
      continue;
    }
    locais[k] = { ...v, foto: null };
    desceram++;
  }
  // Vagas: em cada cargo fica o mais recente. O que sobrar sai daqui e do perfil.
  const porGrupo = {};
  for (const v of Object.values(locais)) (porGrupo[grupo(v)] ||= []).push(v);
  for (const lista of Object.values(porGrupo)) {
    const cfg = cargoVoto(lista[0].cargo);
    lista.sort((a, b) => String(b.escolhido_em).localeCompare(String(a.escolhido_em)));
    for (const v of lista.slice(cfg?.vagas || 1)) {
      const k = id(v.cargo, v.chave);
      delete locais[k];
      if (remotos[k]) { await b.from('meu_voto').delete().match({ user_id: s.user.id, cargo: v.cargo, chave: v.chave }); delete remotos[k]; }
    }
  }
  const subirValidos = subir.filter((v) => locais[id(v.cargo, v.chave)])
    .map((v) => ({ user_id: s.user.id, cargo: v.cargo, chave: v.chave, uf: v.uf || null, rotulo: v.rotulo, detalhe: v.detalhe || null, escolhido_em: v.escolhido_em }));
  if (subirValidos.length) {
    const { error: e2 } = await b.from('meu_voto').upsert(subirValidos, { onConflict: 'user_id,cargo,chave', ignoreDuplicates: true });
    if (e2) throw e2;
  }
  gravar(locais);
  gravarSinc(new Set([...Object.keys(remotos), ...subirValidos.map((v) => id(v.cargo, v.chave))]));
  return { subiram: subirValidos.length, desceram };
}
