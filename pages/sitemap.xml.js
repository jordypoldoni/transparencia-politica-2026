import ServicoAPI from '../src/servicos/servico_api';
import { hrefPerfil, CASAS_VOTACAO } from '../src/lib/casa';

// Páginas fixas do site. Até 12/09/2026 faltavam aqui /gastos-publicos, /candidatos-2026
// e /presidenciaveis, que existem e são públicas. Em 01/10/2026 /presidenciaveis saiu: hoje ela
// redireciona para /candidatos-2026, e endereço que redireciona não deve estar no sitemap.
const FIXAS = ['', '/comecar', '/deputados', '/senadores', '/votacoes', '/gastos-publicos', '/candidatos-2026', '/entenda', '/sobre'];

const UFS = ['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'];

const escapar = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function gerarXml(base, perfis, candidatos = []) {
  const caminhos = [
    ...FIXAS,
    // Deputados estaduais: uma pagina so desde 29/09/2026 (antes uma por assembleia, em
    // /deputados/sp e /deputados/rs, que agora redirecionam para ela).
    '/deputados-estaduais',
    // Uma lista de votacoes por casa, desde 19/09/2026. Antes /votacoes era uma lista unica
    // com as tres casas misturadas; agora e um painel, e a lista de cada casa e uma rota
    // propria. Sem estas linhas, as tres telas novas nao existiriam para o Google, que e
    // exatamente o que tinha acontecido com /deputados/rs ate 12/09.
    ...CASAS_VOTACAO.map((c) => `/votacoes/${c.chave}`),
    ...UFS.map((uf) => `/estado/${uf}`),
    // hrefPerfil manda senador para /senador/ e o resto para /deputado/. Escrever
    // '/deputado/' na mão aqui era o que colocava senador na URL errada dentro do sitemap.
    ...perfis.map(hrefPerfil).filter((c) => c !== '#'),
    // Fichas dos candidatos 2026 (presidência, governo, Senado, Câmara), desde 01/10/2026.
    ...candidatos,
  ];
  const urls = caminhos.map((c) => `<url><loc>${escapar(base + c)}</loc><changefreq>weekly</changefreq></url>`);
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>`;
}

export default function Sitemap() { return null; }

export async function getServerSideProps({ res, req }) {
  const proto = req.headers['x-forwarded-proto'] || 'http';
  const base = `${proto}://${req.headers.host}`;
  let perfis = [];
  let candidatos = [];
  try { perfis = await ServicoAPI.listarPerfisParaSitemap(); } catch (e) { console.error('sitemap:', e.message); }
  try { candidatos = await ServicoAPI.listarCandidatosParaSitemap(); } catch (e) { console.error('sitemap candidatos:', e.message); }

  res.setHeader('Content-Type', 'text/xml');
  // ~9 mil endereços e 12 consultas: guardado 1 dia na borda da Vercel, que é quem atende o Google.
  res.setHeader('Cache-Control', 'public, s-maxage=86400, stale-while-revalidate=3600');
  res.write(gerarXml(base, perfis, candidatos));
  res.end();
  return { props: {} };
}
