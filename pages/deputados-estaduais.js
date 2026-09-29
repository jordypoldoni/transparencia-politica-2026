import { ASSEMBLEIAS, caminhoDaCasa } from '../src/lib/assembleias';
import { COOKIE_UF } from '../src/lib/perfilUsuario';

// Deputados estaduais: entrada do menu Parlamentares (29/09/2026, decisão do Jordy: federais,
// estaduais e senadores em páginas separadas).
//
// POR ENQUANTO SÓ REDIRECIONA para a lista de um estado com Assembleia coletada (SP e RS): a
// página que reúne os 27 estados, com os eleitos de 2022 da tabela deputados_estaduais_eleitos,
// é o passo seguinte. Redirecionamento temporário (302) de propósito: quando a página existir,
// este endereço passa a ser ela, e o Google não pode ter guardado o desvio como definitivo.
//
// Estado da pessoa (cookie lume_uf, gravado quando ela escolhe um estado no site) manda, se for
// um dos coletados; senão, o primeiro da lista.
export default function DeputadosEstaduais() {
  return null;
}

export async function getServerSideProps({ req }) {
  const ufCookie = String(req.cookies?.[COOKIE_UF] || '').toUpperCase();
  const casa = ASSEMBLEIAS.find((a) => a.uf === ufCookie) || ASSEMBLEIAS[0];
  return { redirect: { destination: caminhoDaCasa(casa.casa), permanent: false } };
}
