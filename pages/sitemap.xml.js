import ServicoAPI from '../src/servicos/servico_api';
import { hrefPerfil } from '../src/lib/casa';

// Páginas fixas do site. Até 12/09/2026 faltavam aqui /gastos-publicos, /candidatos-2026
// e /presidenciaveis, que existem e são públicas.
const FIXAS = ['', '/comecar', '/deputados', '/senadores', '/votacoes', '/gastos-publicos', '/candidatos-2026', '/presidenciaveis', '/entenda', '/sobre'];

const UFS = ['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'];

const escapar = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function gerarXml(base, perfis) {
  const caminhos = [
    ...FIXAS,
    ...UFS.map((uf) => `/estado/${uf}`),
    // hrefPerfil manda senador para /senador/ e o resto para /deputado/. Escrever
    // '/deputado/' na mão aqui era o que colocava senador na URL errada dentro do sitemap.
    ...perfis.map(hrefPerfil).filter((c) => c !== '#'),
  ];
  const urls = caminhos.map((c) => `<url><loc>${escapar(base + c)}</loc><changefreq>weekly</changefreq></url>`);
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>`;
}

export default function Sitemap() { return null; }

export async function getServerSideProps({ res, req }) {
  const proto = req.headers['x-forwarded-proto'] || 'http';
  const base = `${proto}://${req.headers.host}`;
  let perfis = [];
  try { perfis = await ServicoAPI.listarPerfisParaSitemap(); } catch (e) { console.error('sitemap:', e.message); }

  res.setHeader('Content-Type', 'text/xml');
  res.write(gerarXml(base, perfis));
  res.end();
  return { props: {} };
}
