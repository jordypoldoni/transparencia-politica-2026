// 01/10/2026: o endereço da Vercel (hub-politico.vercel.app) servia o site inteiro em paralelo ao
// domínio, cada página com o canônico apontando para si mesma. Para o Google eram dois sites
// iguais disputando a mesma busca. Agora ele redireciona (308, permanente) para o domínio.
// O endereço sem www já redireciona para o www pela configuração de domínios da Vercel.
const nextConfig = {
  async redirects() {
    return [
      {
        source: '/:caminho*',
        has: [{ type: 'host', value: 'hub-politico.vercel.app' }],
        destination: 'https://www.lumecidadao.com.br/:caminho*',
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
