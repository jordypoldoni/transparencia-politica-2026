import ListaParlamentares from '../components/ListaParlamentares';
import { carregarParlamentares } from '../src/servicos/carregar_parlamentares';

// Pagina fina de proposito: nada de export extra aqui alem do componente e do
// getServerSideProps. Foi um export a mais neste arquivo que arrastou o cliente do Supabase
// para dentro do pacote do navegador em 12/09/2026. Ver components/ListaParlamentares.jsx.
export default function PaginaDeputados(props) {
  return <ListaParlamentares {...props} />;
}

export async function getServerSideProps({ query, req }) {
  // A lista de senadores tem rota propria. Chamar de "/deputados" uma pagina intitulada
  // "Senadores" e o mesmo erro que /deputado/ para o perfil de um senador.
  if (String(query.casa || '').toLowerCase().includes('sen')) {
    return { redirect: { destination: '/senadores', permanent: true } };
  }
  return { props: await carregarParlamentares(query, null, req) };
}
