// 01/10/2026: o endereço da Vercel (hub-politico.vercel.app) servia o site inteiro em paralelo ao
// domínio, cada página com o canônico apontando para si mesma. Para o Google eram dois sites
// iguais disputando a mesma busca. Agora ele redireciona (308, permanente) para o domínio.
// O endereço sem www já redireciona para o www pela configuração de domínios da Vercel.
// 12/10/2026 (T2, D-025): cabeçalhos de segurança em todas as rotas.
// Os quatro primeiros já valem. O CSP (política de conteúdo) entra só em modo "Report-Only": o
// navegador NÃO bloqueia nada, apenas lista no console (F12) o que bloquearia. Depois de uma
// semana sem aviso, trocar a chave para 'Content-Security-Policy' (exige OK do Jordy).
// Origens do que o navegador carrega: fontes do Google; fotos de câmara/senado/almg/al.rs/TSE e do
// storage do Supabase (banco 1); banco 2 e login (Supabase, por NEXT_PUBLIC_SUPABASE_URL_2).
// 'unsafe-inline' em script/estilo: o Next injeta script de hidratação e o site usa style inline.
const csp = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com data:",
  "img-src 'self' data: blob: https: http://www.senado.leg.br",
  "connect-src 'self' https://*.supabase.co wss://*.supabase.co",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join('; ');

const cabecalhosSeguranca = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=(), usb=()' },
  { key: 'Content-Security-Policy-Report-Only', value: csp },
];

// 12/10/2026: ao voltar (botão Voltar ou o do navegador), a página anterior abria rolada até o
// final. Causa: o Next desliga a restauração de rolagem do navegador e, sem esta chave, a página
// de destino herda a posição de rolagem da página que ficou para trás (a ficha, rolada até o fim).
// Com ela, o Next guarda a posição de cada página e a devolve ao voltar.
const nextConfig = {
  experimental: { scrollRestoration: true },
  async headers() {
    return [{ source: '/:path*', headers: cabecalhosSeguranca }];
  },
  // 18/10/2026: o mapa do site virou um índice (/sitemap.xml) com um arquivo por tipo de página,
  // servido em /sitemap-<tipo>.xml. A página é pages/sitemaps/[tipo].js.
  async rewrites() {
    return [{ source: '/sitemap-:tipo.xml', destination: '/sitemaps/:tipo' }];
  },
  async redirects() {
    return [
      // 23/10/2026: o joguinho passou a se chamar "jogo do mapa político"; o endereço antigo continua valendo.
      { source: '/entenda/joguinho', destination: '/entenda/jogo-do-mapa-politico', permanent: true },
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
