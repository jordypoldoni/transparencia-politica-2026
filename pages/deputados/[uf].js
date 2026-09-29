import { assembleiaPorUf } from '../../src/lib/assembleias';

// /deputados/sp e /deputados/rs foram as listas de cada Assembleia (12/09 a 29/09/2026). Desde
// 29/09 os estaduais sao uma pagina so, /deputados-estaduais, com o ranking do pais e o estado
// escolhido abaixo dele (decisao do Jordy). Os enderecos antigos levam para ela, ja no estado,
// com redirecionamento permanente: foram indexados e compartilhados.
export default function DeputadosDoEstadoAntigo() {
  return null;
}

export async function getServerSideProps({ params }) {
  const a = assembleiaPorUf(params.uf);
  if (!a) return { notFound: true };
  return { redirect: { destination: `/deputados-estaduais?uf=${a.uf}`, permanent: true } };
}
