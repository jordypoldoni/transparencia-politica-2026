import ServicoAPI from '../../src/servicos/servico_api';

// URL legada: redireciona para a URL amigável /deputado/[slug] (canônica, boa para SEO).
export default function Redirecionando() {
  return null;
}

export async function getServerSideProps({ params }) {
  const slug = await ServicoAPI.slugPorId(params.id);
  if (!slug) return { notFound: true };
  return { redirect: { destination: `/deputado/${slug}`, permanent: true } };
}
