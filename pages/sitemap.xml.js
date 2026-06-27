import ServicoAPI from '../src/servicos/servico_api';

function gerarXml(base, slugs) {
  const fixas = ['', '/comecar', '/deputados', '/votacoes', '/entenda', '/sobre'];
  const urls = [
    ...fixas.map((p) => `<url><loc>${base}${p}</loc><changefreq>weekly</changefreq></url>`),
    ...slugs.map((s) => `<url><loc>${base}/deputado/${s}</loc><changefreq>weekly</changefreq></url>`),
  ];
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>`;
}

export default function Sitemap() { return null; }

export async function getServerSideProps({ res, req }) {
  const proto = req.headers['x-forwarded-proto'] || 'http';
  const base = `${proto}://${req.headers.host}`;
  let slugs = [];
  try { slugs = await ServicoAPI.listarSlugs(); } catch (e) { console.error('sitemap:', e.message); }

  res.setHeader('Content-Type', 'text/xml');
  res.write(gerarXml(base, slugs));
  res.end();
  return { props: {} };
}
