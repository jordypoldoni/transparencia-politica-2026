// A prévia do replay virou a visão "Replay" de Eleições (22/10/2026, D-077). Este endereço só redireciona.
export default function ApuracaoReplayAntiga() { return null; }
export async function getServerSideProps() {
  return { redirect: { destination: '/eleicoes?visao=replay', permanent: false } };
}
