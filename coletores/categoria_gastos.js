// Normaliza o tipo de despesa cru (Câmara) em categorias de cidadão.
// Vive em arquivo próprio desde 20/09/2026 porque DOIS coletores a usam:
// coletor_gastos.js (API por deputado) e coletor_gastos_arquivo.js (arquivo anual).
// Duas cópias da mesma lista de palavras-chave seriam duas para manter em sincronia.
export function categoria(tipo) {
  const t = (tipo || '').toLowerCase();
  if (t.includes('combust') || t.includes('veícul') || t.includes('veicul') || t.includes('táxi') || t.includes('taxi') || t.includes('passagem') === false && t.includes('locomo')) return 'Transporte e Mobilidade';
  if (t.includes('passagem') || t.includes('hospedag') || t.includes('aérea') || t.includes('aerea')) return 'Viagens e Estadias';
  if (t.includes('aliment')) return 'Alimentação';
  if (t.includes('divulga') || t.includes('publicid')) return 'Publicidade e Marketing';
  if (t.includes('escritório') || t.includes('escritorio') || t.includes('telefon') || t.includes('internet') || t.includes('postal') || t.includes('correio')) return 'Escritório e Apoio';
  if (t.includes('consultor') || t.includes('pesquisa') || t.includes('técnic') || t.includes('tecnic')) return 'Serviços Técnicos';
  if (t.includes('seguran')) return 'Segurança';
  return 'Outros Operacionais';
}
