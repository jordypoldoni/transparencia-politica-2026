// pages/presidenciaveis.js — Presidenciáveis 2026 agora mora dentro da página unificada
// /eleicoes (aba "Presidente"), ao lado dos candidatos a Deputado Federal (pedido do
// Jordy, 2026-08-22: "uma página só" para Presidente + Deputado Federal). Mantido aqui só como
// redirect permanente pra não quebrar links/bookmarks antigos que já apontam pra /presidenciaveis.
export async function getServerSideProps() {
  return { redirect: { destination: '/eleicoes?cargo=presidente', permanent: true } };
}

export default function PresidenciaveisRedirect() {
  return null;
}
