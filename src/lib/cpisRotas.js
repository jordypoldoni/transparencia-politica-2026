// Endereco e nomes da pagina de cada pedido de CPI da Camara (19/10/2026).
// Funcoes puras (testadas em tests/cpisRotas.test.mjs). O endereco usa a sigla oficial do pedido:
// RCP 1/2026 -> /cpis/rcp-1-2026.

export const slugPedido = (numero, ano) => `rcp-${Number(numero)}-${Number(ano)}`;

// 'rcp-1-2026' -> { numero: 1, ano: 2026 }. Qualquer outra forma devolve null (a pagina responde 404
// sem ir ao banco).
export function lerSlug(slug) {
  const m = /^rcp-(\d{1,4})-(20\d{2})$/.exec(String(slug || ''));
  if (!m) return null;
  return { numero: Number(m[1]), ano: Number(m[2]) };
}

// Orgaos que aparecem na tramitacao (nomes conferidos na API de orgaos da Camara em 19/10/2026).
// Sigla desconhecida aparece como veio da fonte: nunca some e nunca e inventada.
const ORGAOS = {
  MESA: 'Mesa Diretora',
  PLEN: 'Plenário',
  CPIPIRAM: 'CPI das Pirâmides Financeiras',
  CPIFUTE: 'CPI da Manipulação de Resultados no Futebol',
  CPIMST: 'CPI do MST',
  CPIAMERI: 'CPI da Americanas',
};
export const nomeOrgao = (sigla) => (sigla ? (ORGAOS[String(sigla).toUpperCase()] || String(sigla)) : null);

// 'aaaa-mm-ddThh:mm:ss' (hora de Brasilia, sem fuso) -> 'hh:mm'; sem hora devolve null.
export function horaDe(dataHora) {
  const m = /T(\d{2}):(\d{2})/.exec(String(dataHora || ''));
  return m ? `${m[1]}h${m[2]}` : null;
}
