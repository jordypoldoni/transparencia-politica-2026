import ListaParlamentares from '../components/ListaParlamentares';
import { carregarParlamentares } from '../src/servicos/carregar_parlamentares';
import { ASSEMBLEIAS } from '../src/lib/assembleias';
import { COOKIE_UF } from '../src/lib/perfilUsuario';

// Deputados estaduais: UMA pagina, igual a dos federais (29/09/2026, decisao do Jordy). No topo o
// ranking de gastos do pais inteiro (todas as assembleias que o site tem); abaixo dele a busca por
// nome ou partido e o campo de estado, que filtram so a lista de parlamentares.
//
// ESTADO PADRAO = o do perfil da pessoa (cookie lume_uf, que a sincronizacao do perfil atualiza),
// se o site tem deputados estaduais daquele estado. Senao, todos os estados. ?uf= na URL vence.
export default function PaginaDeputadosEstaduais(props) {
  return <ListaParlamentares {...props} />;
}

export async function getServerSideProps({ query, req }) {
  const ufCookie = String(req.cookies?.[COOKIE_UF] || '').toUpperCase();
  const ufDaUrl = String(query.uf || '').toUpperCase();
  const ufPadrao = ASSEMBLEIAS.some((a) => a.uf === ufCookie) ? ufCookie : '';
  const uf = ASSEMBLEIAS.some((a) => a.uf === ufDaUrl) ? ufDaUrl : ufPadrao;
  return { props: await carregarParlamentares({ query: { ...query, uf }, req, casaFixa: 'Estaduais' }) };
}
