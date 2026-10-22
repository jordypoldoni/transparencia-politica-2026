// ESTIMATIVA DO RITMO DE CHEGADA (22/10/2026, D-074). O TSE publicou incompletos os boletins de urna de MS, RN, SE e TO (1º turno), então não há
// horário real de chegada desses estados. Os VOTOS FINAIS deles são os oficiais; só o RITMO é estimado: a curva é a média das curvas dos estados da
// mesma região que têm horário. Funções puras, usadas por scripts/replay/estimar_ufs_1t.mjs (e testadas).

// Média, minuto a minuto, da fração de urnas recebidas (acum/total) dos estados de referência. Cada item: { total, acum: [..] }.
export function curvaMedia(refs) {
  const n = Math.min(...refs.map((r) => r.acum.length));
  const out = new Array(n).fill(0);
  for (let i = 0; i < n; i++) {
    let soma = 0;
    for (const r of refs) soma += r.acum[i] / r.total;
    out[i] = soma / refs.length;
  }
  out[n - 1] = 1; // ao fim, 100% (o último minuto do arquivo fecha o estado)
  return out;
}

// Total de urnas estimado: eleitorado do estado × (urnas ÷ eleitorado) dos estados de referência somados. Cada ref: { te, total }.
export function estimarUrnas(te, refs) {
  const urnas = refs.reduce((a, r) => a + r.total, 0);
  const eleit = refs.reduce((a, r) => a + r.te, 0);
  return Math.round(te * (urnas / eleit));
}

// Distribui um valor final pela curva (acumulado por minuto, crescente, termina exatamente no valor final).
export function distribuir(final, curva) {
  const out = curva.map((f) => Math.round(final * f));
  out[out.length - 1] = final;
  for (let i = 1; i < out.length; i++) if (out[i] < out[i - 1]) out[i] = out[i - 1];
  return out;
}
