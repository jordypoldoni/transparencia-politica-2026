import ListaParlamentares from '../components/ListaParlamentares';
import { carregarParlamentares } from '../src/servicos/carregar_parlamentares';

// A lista de senadores morava em /deputados?casa=senado: uma pagina intitulada "Senadores",
// com 89 senadores, servida numa rota chamada "deputados". A tela e a mesma de /deputados;
// aqui so a casa que abre e fixa.
export default function PaginaSenadores(props) {
  return <ListaParlamentares {...props} />;
}

export async function getServerSideProps({ query, req }) {
  return { props: await carregarParlamentares(query, 'Senado', req) };
}
