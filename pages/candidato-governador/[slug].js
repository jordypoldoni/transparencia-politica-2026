// Página do candidato a Governador 2026 (24/09/2026). Mesmo corpo das páginas de candidato a
// Deputado Federal e a Senador (components/FichaCandidatoLegislativo.jsx), com a seção do vice
// no lugar da dos suplentes.
//
// Rota /candidato-governador: não há /governador no site, mas o prefixo "candidato-" mantém o
// padrão do senador e deixa espaço para a página do governador EM EXERCÍCIO, se um dia existir.
import ServicoAPI from '../../src/servicos/servico_api';
import FichaCandidatoLegislativo from '../../components/FichaCandidatoLegislativo';

export default function PerfilCandidatoGovernador({ candidato, canonical }) {
  return <FichaCandidatoLegislativo candidato={candidato} canonical={canonical} cargo="governador" />;
}

export async function getServerSideProps({ params, req }) {
  const dados = await ServicoAPI.getCandidatoGovernadorPorSlug(params.slug);
  if (!dados) return { notFound: true };
  const proto = req.headers['x-forwarded-proto'] || 'http';
  const canonical = `${proto}://${req.headers.host}/candidato-governador/${params.slug}`;
  return { props: { candidato: JSON.parse(JSON.stringify(dados)), canonical } };
}
