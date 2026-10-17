// Formatacao de "dados ate" (T10). Arquivo separado e SEM import de servidor: o selo roda no
// navegador e nao pode puxar o cliente do Supabase junto (lição de 12/09/2026, ver ListaParlamentares).
const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

// "2026-07-31" -> "jul/2026" (fonte mensal) ou "31/07/2026". null quando a fonte nao informa.
export function formatarDadosAte(iso, mensal) {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso || '');
  if (!m) return null;
  return mensal ? `${MESES[Number(m[2]) - 1]}/${m[1]}` : `${m[3]}/${m[2]}/${m[1]}`;
}

