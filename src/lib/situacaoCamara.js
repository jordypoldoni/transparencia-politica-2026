// Situação de um pedido de CPI como a Câmara informa (19/10/2026, I1). Alguns registros trazem um texto cru de sistema,
// como "<Não Definido>", que não deve aparecer na tela. Devolve o texto limpo ou null quando a fonte não informa.
export function situacaoLegivel(texto) {
  const s = String(texto == null ? '' : texto).trim();
  if (!s) return null;
  if (/^<[^>]*>$/.test(s)) return null; // "<Não Definido>", "<null>" e parecidos
  return s;
}
