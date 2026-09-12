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
  // COLISAO DE NOMES, custou um bug em producao: o Next entrega o parametro da rota tambem
  // dentro de `query`, e `uf` ja era o parametro do FILTRO de estado da tela. Sem tirar daqui,
  // /deputados/rs abria a lista filtrada por "rs" minusculo contra dados em "RS" maiusculo, e
  // a grade de parlamentares aparecia vazia embaixo do ranking. Numa lista estadual so existe
  // um estado, entao o filtro nasce limpo.
  const { uf: _paramDaRota, ...queryLimpa } = query;
  return { props: await carregarParlamentares({ query: queryLimpa, req, casaFixa: a.casa }) };
}
