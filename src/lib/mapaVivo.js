// MAPA QUE ENCHE NA APURAÇÃO AO VIVO (25/10/2026, pedido do Jordy): mesma animação do replay (estado enche de baixo para cima
// conforme as seções chegam), alimentada por /api/apuracao-estados. Funções puras (testadas em tests/mapaVivo.test.mjs).

const num = (v) => { const n = Number(v); return Number.isFinite(n) ? n : 0; };

// { UF: 0 a 1 } = parte das seções do estado já apuradas. Estado sem dado ou sem seções fica em 0 (cinza).
export function fracaoPorUf(estados) {
  const out = {};
  for (const [uf, e] of Object.entries(estados || {})) {
    const total = num(e && e.secoes && e.secoes.total);
    const feitas = num(e && e.secoes && e.secoes.totalizadas);
    out[uf] = total > 0 ? Math.min(1, Math.max(0, feitas / total)) : 0;
  }
  return out;
}

// Estados que ainda estão recebendo seções agora (começou e não terminou): contorno pulsando.
export function ufsRecebendo(fracao) {
  return Object.keys(fracao || {}).filter((uf) => fracao[uf] > 0 && fracao[uf] < 1);
}

// Ordem FIXA por número de urna, nunca por votos (regra de neutralidade 1 do replay, D-074).
export function candidatosOrdemFixa(candidatos) {
  return [...(candidatos || [])].sort((a, b) => num(a.numero) - num(b.numero));
}

// Mesma regra do resto da apuração: 10 s com seções sendo apuradas, 30 s quando ainda não começou ou já fechou.
export function intervaloMapaMs(estados) {
  let total = 0; let feitas = 0;
  for (const e of Object.values(estados || {})) { total += num(e && e.secoes && e.secoes.total); feitas += num(e && e.secoes && e.secoes.totalizadas); }
  return feitas > 0 && feitas < total ? 10000 : 30000;
}

// "12,3" -> 12.3 (percentual do TSE em texto)
export function pctNumero(s) {
  const v = Number(String(s ?? '0').replace(/\./g, '').replace(',', '.'));
  return Number.isFinite(v) ? Math.max(0, Math.min(100, v)) : 0;
}
