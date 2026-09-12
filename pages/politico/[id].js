import ServicoAPI from '../../src/servicos/servico_api';
import { hrefPerfil } from '../../src/lib/casa';

// URL legada: redireciona para a URL amigável /deputado/[slug] (canônica, boa para SEO).
export default function Redirecionando() {
  return null;
}

export async function getServerSideProps({ params }) {
  const perfil = await ServicoAPI.perfilBasicoPorId(params.id);
  if (!perfil?.slug) return { notFound: true };
  // Ja sai na rota certa da casa: mandar todo mundo para /deputado/ faria o senador
  // encadear dois 301 (aqui e la), e cada salto perde um pouco de autoridade no Google.
  return { redirect: { destination: hrefPerfil(perfil), permanent: true } };
}
