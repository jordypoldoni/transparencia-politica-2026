// Frase de resposta direta sobre um parlamentar, só com fatos que a página mostra (18/10/2026).
// Serve de meta description e de descrição nos dados estruturados: é o trecho que buscadores e IAs
// citam. Cada parte só entra se o dado existe; nada de adjetivo, nota ou comparação (D-003).
//
// Antes, a descrição dizia "em 2026" fixo mesmo quando o ano de referência dos gastos era outro.

const brl = (v) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(v || 0);
const pct = (v) => `${Math.round(v)}%`;

export function descricaoDoPerfil(dados, casa) {
  const p = (dados && dados.perfil) || {};
  const nome = p.nome_urna || 'O parlamentar';
  const cargo = p.cargo_atual || (casa && casa.cargoPadrao) || 'Parlamentar';
  const sigla = [p.partido_atual, p.uf_sede].filter(Boolean).join('-');
  const abertura = `${nome} é ${cargo}${sigla ? ` (${sigla})` : ''}.`;

  const partes = [abertura];
  const ano = dados && dados.ano_referencia;
  const verba = (casa && casa.nomeVerba) || 'cota parlamentar';
  if (ano && dados.total_geral > 0) {
    const notas = casa && casa.temNotaFiscal === false ? '' : (dados.n_notas > 0 ? ` em ${dados.n_notas} ${dados.n_notas === 1 ? 'nota fiscal' : 'notas fiscais'}` : '');
    partes.push(`Em ${ano}, usou ${brl(dados.total_geral)} da ${verba}${notas}.`);
  }
  const pr = dados && dados.presenca;
  if (pr && pr.total > 0) partes.push(`Registrou voto em ${pr.compareceu} de ${pr.total} votações nominais (${pct(pr.percentual)}).`);
  const co = dados && dados.coerencia;
  if (co && Number.isFinite(co.percentual)) partes.push(`Acompanhou o próprio partido em ${pct(co.percentual)} das votações.`);
  if (casa && casa.fonteNome) partes.push(`Fonte: ${casa.fonteNome}.`);

  // Meta description longa demais é cortada pelo buscador: sai primeiro a parte menos útil.
  let texto = partes.join(' ');
  while (texto.length > 320 && partes.length > 2) {
    const i = partes.findIndex((x) => x.startsWith('Acompanhou'));
    partes.splice(i >= 0 ? i : partes.length - 2, 1);
    texto = partes.join(' ');
  }
  return texto;
}
