import ListaParlamentares from '../components/ListaParlamentares';
import { carregarParlamentares } from '../src/servicos/carregar_parlamentares';

// Deputados federais. Os estaduais tem pagina propria desde 29/09/2026: /deputados-estaduais.
// Pagina fina de proposito: nada de export extra alem do default e do getServerSideProps.
export default function PaginaDeputados(props) {
  return <ListaParlamentares {...props} />;
}

export async function getServerSideProps({ query, req }) {
  // Enderecos antigos com a casa na query passam a ter destino proprio.
  const c = String(query.casa || '').toLowerCase();
  if (c.includes('sen')) return { redirect: { destination: '/senadores', permanent: true } };
  if (c.includes('alergs') || c === 'rs') return { redirect: { destination: '/deputados-estaduais?uf=RS', permanent: true } };
  if (c.includes('alesp') || c === 'sp') return { redirect: { destination: '/deputados-estaduais?uf=SP', permanent: true } };
  if (c.includes('estad') || c.includes('assembleia')) return { redirect: { destination: '/deputados-estaduais', permanent: true } };
  return { props: await carregarParlamentares({ query, req }) };
}
