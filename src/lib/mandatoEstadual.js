// LIGAÇÃO CANDIDATO A DEPUTADO ESTADUAL → MANDATO NA ASSEMBLEIA (27/09/2026, saiu da rota da
// afinidade para ser usada também pela cédula). O TSE não traz ligação nenhuma com o mandato, então
// a ligação é pelo nome, com cuidado:
// - nome de urna igual, no mesmo estado (quando só um deputado tem aquele nome); ou
// - o nome do cadastro COMEÇANDO pelo da urna e o MESMO partido ("ADÃO PRETTO" na urna, "Adão
//   Pretto Filho" no cadastro, os dois do PT). Sem o partido batendo, o começo do nome sozinho
//   não liga: "João Silva" e "João Silva Santos" podem ser duas pessoas.
// Hoje o site tem o cadastro dos deputados estaduais do RS (ALERGS) e de SP (ALESP).
const nome = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().replace(/\s+/g, ' ').trim();
const sigla = (s) => nome(s).replace(/\s+/g, '');

export function mandatoEstadual(agentesDaUf, candidato) {
  const n = nome(candidato?.nome_urna);
  if (!n || !agentesDaUf?.length) return null;
  const exato = agentesDaUf.filter((a) => nome(a.nome_urna) === n);
  if (exato.length === 1) return exato[0];
  const prefixo = agentesDaUf.filter((a) => nome(a.nome_urna).startsWith(`${n} `) && sigla(a.partido_atual) === sigla(candidato.partido_sigla));
  return prefixo.length === 1 ? prefixo[0] : null;
}
