import PerfilSEO from '../../components/PerfilSEO';
import ServicoAPI from '../../src/servicos/servico_api';
import { casaDoPerfil } from '../../src/lib/casa';

export default function PaginaSenador(props) {
  return <PerfilSEO {...props} />;
}

export async function getServerSideProps({ params, req }) {
  const dados = await ServicoAPI.getPoliticoPorSlug(params.slug);
  if (!dados) return { notFound: true };
  // Espelho da regra de /deputado/: quem nao e senador volta para la. Sem isso o mesmo
  // perfil responderia em dois enderecos, que para o Google e conteudo duplicado.
  if (!casaDoPerfil(dados.perfil).ehSenado) {
    return { redirect: { destination: `/deputado/${params.slug}`, permanent: true } };
  }
  const proto = req.headers['x-forwarded-proto'] || 'http';
  const canonical = `${proto}://${req.headers.host}/senador/${params.slug}`;
  return { props: { dados: JSON.parse(JSON.stringify(dados)), canonical } };
}
