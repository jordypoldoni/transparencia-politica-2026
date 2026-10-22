// A prévia do replay virou a visão "Replay" de Eleições 2026 (22/10/2026, D-077). Este endereço só redireciona.
export default function ApuracaoReplayAntiga() { return null; }
export async function getServerSideProps() {
  return { redirect: { destination: '/candidatos-2026?visao=replay', permanent: false } };
}
