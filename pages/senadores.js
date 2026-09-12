import Parlamentares, { carregarParlamentares } from './deputados';

// A lista de senadores morava em /deputados?casa=senado: uma pagina intitulada "Senadores",
// com 89 senadores, servida numa rota chamada "deputados". Mesma familia do bug do perfil,
// uma camada acima. A tela e a mesma; aqui so a casa que abre e fixa.
export default function PaginaSenadores(props) {
  return <Parlamentares {...props} />;
}

export async function getServerSideProps({ query, req }) {
  return { props: await carregarParlamentares(query, 'Senado', req) };
}
