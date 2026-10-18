import ServicoAPI from '../../src/servicos/servico_api';
import { TIPOS, entradasDoTipo, conjuntoDeUrls } from '../../src/lib/sitemap.js';

// Um arquivo do mapa do site por tipo de página (18/10/2026). O endereço público é
// /sitemap-<tipo>.xml, reescrito para cá em next.config.mjs. Cada consulta ao banco falha
// sozinha: se uma cair, o arquivo sai vazio em vez de derrubar o mapa inteiro, e sem cache
// longo para o buscador voltar logo.
export default function SitemapDoTipo() { return null; }

const BUSCAS = {
  perfis: async () => ({ perfis: await ServicoAPI.listarPerfisParaSitemap() }),
  candidatos: async () => ({ candidatos: await ServicoAPI.listarCandidatosParaSitemap() }),
  votacoes: async () => ({ votacoes: await ServicoAPI.listarVotacoesParaSitemap() }),
  fiscal: async () => ({ fiscal: await ServicoAPI.listarEntesParaSitemap() }),
};

export async function getServerSideProps({ res, req, params }) {
  const tipo = String(params.tipo || '');
  if (!TIPOS.includes(tipo)) return { notFound: true };
  const proto = req.headers['x-forwarded-proto'] || 'http';
  const base = `${proto}://${req.headers.host}`;
  let dados = {};
  let falhou = false;
  if (BUSCAS[tipo]) {
    try { dados = await BUSCAS[tipo](); } catch (e) { falhou = true; console.error(`sitemap ${tipo}:`, e.message); }
  }
  res.setHeader('Content-Type', 'text/xml');
  res.setHeader('Cache-Control', falhou ? 'public, s-maxage=60' : 'public, s-maxage=86400, stale-while-revalidate=3600');
  res.write(conjuntoDeUrls(base, entradasDoTipo(tipo, dados)));
  res.end();
  return { props: {} };
}
