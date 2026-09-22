// Página do candidato a Senador 2026 (22/09/2026). Mesmo corpo da página do candidato a Deputado
// Federal (components/FichaCandidatoLegislativo.jsx), com a seção de suplentes da chapa.
//
// Rota /candidato-senador e não /senador: /senador/[slug] já é o perfil do senador EM
// EXERCÍCIO, que é outra coisa (mandato, gastos, votos). 23 pessoas têm as duas páginas, ligadas
// entre si pelo botão "Ver o mandato em detalhe".
import ServicoAPI from '../../src/servicos/servico_api';
import FichaCandidatoLegislativo from '../../components/FichaCandidatoLegislativo';

export default function PerfilCandidatoSenador({ candidato, canonical }) {
  return <FichaCandidatoLegislativo candidato={candidato} canonical={canonical} cargo="senador" />;
}

export async function getServerSideProps({ params, req }) {
  const dados = await ServicoAPI.getCandidatoSenadorPorSlug(params.slug);
  if (!dados) return { notFound: true };
  const proto = req.headers['x-forwarded-proto'] || 'http';
  const canonical = `${proto}://${req.headers.host}/candidato-senador/${params.slug}`;
  return { props: { candidato: JSON.parse(JSON.stringify(dados)), canonical } };
}
