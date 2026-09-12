import ListaParlamentares from '../components/ListaParlamentares';
import { carregarParlamentares } from '../src/servicos/carregar_parlamentares';

// A lista de senadores morava em /deputados?casa=senado: uma pagina intitulada "Senadores",
// com 89 senadores, servida numa rota chamada "deputados".
export default function PaginaSenadores(props) {
  return <ListaParlamentares {...props} />;
}

export async function getServerSideProps({ query, req }) {
  return { props: await carregarParlamentares({ query, req, casaFixa: 'Senado' }) };
}
