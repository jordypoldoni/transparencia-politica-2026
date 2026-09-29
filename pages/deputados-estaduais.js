import ListaParlamentares from '../components/ListaParlamentares';
import { carregarParlamentares } from '../src/servicos/carregar_parlamentares';
const UF_VALIDA = /^(AC|AL|AP|AM|BA|CE|DF|ES|GO|MA|MT|MS|MG|PA|PB|PR|PE|PI|RJ|RN|RS|RO|RR|SC|SP|SE|TO)$/;
import { COOKIE_UF } from '../src/lib/perfilUsuario';

// Deputados estaduais: UMA pagina, igual a dos federais (29/09/2026, decisao do Jordy). No topo o
// ranking de gastos do pais inteiro (todas as assembleias que o site tem); abaixo dele a busca por
// nome ou partido e o campo de estado, que filtram so a lista de parlamentares.
//
// ESTADO PADRAO = o do perfil da pessoa (cookie lume_uf, que a sincronizacao do perfil atualiza),
// ?uf= na URL vence. Sem estado, todos.
export default function PaginaDeputadosEstaduais(props) {
  return <ListaParlamentares {...props} />;
}

export async function getServerSideProps({ query, req }) {
  const ufCookie = String(req.cookies?.[COOKIE_UF] || '').toUpperCase();
  const ufDaUrl = String(query.uf || '').toUpperCase();
  // Desde 29/09 a lista tem os 27 estados (os sem cadastro vêm com os eleitos de 2022).
  const ufPadrao = UF_VALIDA.test(ufCookie) ? ufCookie : '';
  const uf = UF_VALIDA.test(ufDaUrl) ? ufDaUrl : ufPadrao;
  return { props: await carregarParlamentares({ query: { ...query, uf }, req, casaFixa: 'Estaduais' }) };
}
