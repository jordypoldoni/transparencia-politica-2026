// Página do candidato a Deputado Federal. O corpo mora em components/FichaCandidatoLegislativo.jsx
// desde 22/09/2026, compartilhado com a página do candidato a Senador.
import ServicoAPI from '../../src/servicos/servico_api';
import FichaCandidatoLegislativo from '../../components/FichaCandidatoLegislativo';

export default function PerfilDeputadoFederal({ candidato, canonical }) {
  return <FichaCandidatoLegislativo candidato={candidato} canonical={canonical} cargo="deputado-federal" />;
}

export async function getServerSideProps({ params, req }) {
  const dados = await ServicoAPI.getCandidatoDeputadoFederalPorSlug(params.slug);
  if (!dados) return { notFound: true };
  const proto = req.headers['x-forwarded-proto'] || 'http';
  const canonical = `${proto}://${req.headers.host}/deputado-federal/${params.slug}`;
  return { props: { candidato: JSON.parse(JSON.stringify(dados)), canonical } };
}
