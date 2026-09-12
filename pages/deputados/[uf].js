import ListaParlamentares from '../../components/ListaParlamentares';
import { carregarParlamentares } from '../../src/servicos/carregar_parlamentares';
import { assembleiaPorUf } from '../../src/lib/assembleias';

// Deputados estaduais de um estado: /deputados/sp, /deputados/rs.
// So responde para estado com assembleia coletada; o resto e 404, para nao existir uma
// pagina vazia por estado do Brasil inteiro.
export default function PaginaDeputadosEstaduais(props) {
  return <ListaParlamentares {...props} />;
}

export async function getServerSideProps({ params, query, req }) {
  const a = assembleiaPorUf(params.uf);
  if (!a) return { notFound: true };
  // A URL canonica e minuscula: /deputados/SP e /deputados/sp seriam duas para o Google.
  if (params.uf !== a.uf.toLowerCase()) {
    return { redirect: { destination: `/deputados/${a.uf.toLowerCase()}`, permanent: true } };
  }
  return { props: await carregarParlamentares({ query, req, casaFixa: a.casa }) };
}
