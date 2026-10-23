// Mapa do site para buscadores (18/10/2026).
//
// Até aqui havia UM arquivo só (/sitemap.xml), sem data de atualização, e ficavam de fora as votações
// individuais (/votacao/[id]), o painel fiscal (/ente/[cod]) e a /afinidade. Agora /sitemap.xml é um
// ÍNDICE que aponta para um arquivo por tipo de página. Por tipo, o Google e o Bing mostram no
// painel quantas páginas de cada tipo foram descobertas e quantas foram indexadas, o que é o jeito
// de medir se isto funcionou.
//
// Peça pura, sem rede nem banco: as páginas (pages/sitemap.xml.js e pages/sitemaps/[tipo].js) só
// buscam os dados e entregam para cá. Por isso tem teste.
//
// SOBRE `lastmod`: só entra onde existe uma data real POR LINHA e que acompanha o que a página
// mostra (perfil e votação). Fichas de candidato, páginas fixas e estados ficam sem a data de
// propósito: a data que temos para elas é a de um lote e não do conteúdo ao vivo (apuração,
// candidaturas), e uma data que mente faz o buscador confiar menos em todas as outras.

import { CASAS_VOTACAO, hrefPerfil } from './casa.js';
import { slugPedido } from './cpisRotas.js';

export const TIPOS = ['paginas', 'perfis', 'candidatos', 'votacoes', 'fiscal', 'cpis'];

export const LIMITE_POR_ARQUIVO = 50000; // limite do protocolo

// Páginas fixas. /presidenciaveis fica fora de propósito: redireciona para /candidatos-2026, e
// endereço que redireciona não deve estar no mapa. /afinidade entrou em 18/10/2026.
export const FIXAS = ['', '/comecar', '/deputados', '/senadores', '/votacoes', '/cpis', '/gastos-publicos', '/gastos-parlamentares', '/candidatos-2026', '/entenda', '/entenda/atualizacao', '/entenda/esquerda-e-direita', '/entenda/joguinho', '/afinidade', '/sobre', '/correcoes', '/privacidade'];

export const UFS = ['AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'];

export const escapar = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');

// Data no formato do protocolo (AAAA-MM-DD). Valor ausente ou inválido vira null: sem data é
// melhor que data errada.
export function dataIso(valor) {
  if (!valor) return null;
  const d = valor instanceof Date ? valor : new Date(valor);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 10);
}

const NS = 'http://www.sitemaps.org/schemas/sitemap/0.9';

// entradas: lista de textos (caminho) ou { caminho, lastmod }. Repetidos saem (vale o primeiro).
export function conjuntoDeUrls(base, entradas) {
  const vistos = new Set();
  const linhas = [];
  for (const e of entradas || []) {
    const caminho = typeof e === 'string' ? e : e && e.caminho;
    if (typeof caminho !== 'string' || caminho === '#' || vistos.has(caminho)) continue;
    vistos.add(caminho);
    const data = typeof e === 'string' ? null : dataIso(e.lastmod);
    linhas.push(`<url><loc>${escapar(base + caminho)}</loc>${data ? `<lastmod>${data}</lastmod>` : ''}</url>`);
    if (linhas.length >= LIMITE_POR_ARQUIVO) break;
  }
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="${NS}">\n${linhas.join('\n')}\n</urlset>`;
}

// Endereço público de cada arquivo por tipo: /sitemap-perfis.xml (a Vercel reescreve para
// /sitemaps/perfis, ver next.config.mjs).
export const caminhoDoTipo = (tipo) => `/sitemap-${tipo}.xml`;

export function indice(base, tipos = TIPOS) {
  const itens = tipos.map((tp) => `<sitemap><loc>${escapar(base + caminhoDoTipo(tp))}</loc></sitemap>`);
  return `<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="${NS}">\n${itens.join('\n')}\n</sitemapindex>`;
}

// `dados` traz o que cada tipo precisa (vem do banco, em pages/sitemaps/[tipo].js):
//   perfis:     [{ slug, cargo_atual, fonte_api, casa_legislativa, data_atualizacao }]
//   candidatos: ['/presidencial/slug', ...]
//   votacoes:   [{ votacao_id_externa, data_insercao }]
//   fiscal:     [{ cod_ibge }]  (entes com painel fiscal já coletado)
//   cpis:       [{ numero, ano, data_situacao }]  (pedidos de CPI da Câmara; lastmod = data da última movimentação)
export function entradasDoTipo(tipo, dados = {}) {
  switch (tipo) {
    case 'paginas':
      return [
        ...FIXAS,
        '/deputados-estaduais',
        ...CASAS_VOTACAO.map((c) => `/votacoes/${c.chave}`),
        ...UFS.map((uf) => `/estado/${uf}`),
      ];
    case 'perfis':
      return (dados.perfis || [])
        .map((p) => ({ caminho: hrefPerfil(p), lastmod: p.data_atualizacao }))
        .filter((e) => e.caminho && e.caminho !== '#');
    case 'candidatos':
      return dados.candidatos || [];
    case 'votacoes':
      return (dados.votacoes || [])
        .filter((v) => v && v.votacao_id_externa)
        .map((v) => ({ caminho: `/votacao/${encodeURIComponent(v.votacao_id_externa)}`, lastmod: v.data_insercao }));
    case 'fiscal':
      return (dados.fiscal || []).filter((e) => e && e.cod_ibge).map((e) => `/ente/${e.cod_ibge}`);
    case 'cpis':
      return (dados.cpis || []).filter((c) => c && c.numero && c.ano)
        .map((c) => ({ caminho: `/cpis/${slugPedido(c.numero, c.ano)}`, lastmod: c.data_situacao }));
    default:
      return null; // tipo desconhecido: a página responde 404
  }
}
