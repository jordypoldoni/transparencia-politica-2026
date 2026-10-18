// Dados estruturados (JSON-LD, schema.org) para buscadores e IAs que leem a página (18/10/2026).
//
// Peça pura: só monta objetos. O componente components/DadosEstruturados.jsx os coloca no <head>.
// Regra de conteúdo: nada aqui afirma o que a página não mostra. Sem nota, sem avaliação, sem
// adjetivo (D-003). Campo sem dado fica de fora, nunca vira texto de enchimento.

export const SITE = 'https://www.lumecidadao.com.br';
const ID_SITE = `${SITE}/#site`;
const ID_ORG = `${SITE}/#organizacao`;

const url = (caminho) => `${SITE}${caminho === '/' || caminho === '' ? '/' : caminho}`;
const limpo = (o) => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined && v !== null && v !== ''));

export function organizacao() {
  return limpo({
    '@type': 'Organization',
    '@id': ID_ORG,
    name: 'Lume Cidadão',
    alternateName: 'Lume',
    url: `${SITE}/`,
    logo: `${SITE}/icon-512.png`,
    description: 'Votos, gastos e candidatos dos políticos do Brasil, com dados oficiais abertos e link para a fonte de cada número. Sem nota e sem lado.',
    knowsLanguage: 'pt-BR',
  });
}

export function site() {
  return limpo({
    '@type': 'WebSite',
    '@id': ID_SITE,
    name: 'Lume Cidadão',
    alternateName: 'Lume',
    url: `${SITE}/`,
    inLanguage: 'pt-BR',
    description: 'Gastos, votos e candidatos 2026 dos políticos do Brasil, com dados oficiais e link para a fonte.',
    publisher: { '@id': ID_ORG },
  });
}

// itens: [{ nome, caminho }] do mais geral ao mais específico. O último é a página atual.
export function migalhas(itens) {
  const validos = (itens || []).filter((i) => i && i.nome && typeof i.caminho === 'string');
  return {
    '@type': 'BreadcrumbList',
    itemListElement: validos.map((i, n) => ({ '@type': 'ListItem', position: n + 1, name: i.nome, item: url(i.caminho) })),
  };
}

// Lista de páginas (ex.: as votações de uma casa). Limita a quantidade para não pesar o HTML.
export function lista({ nome, caminho, itens, max = 50 }) {
  const validos = (itens || []).filter((i) => i && i.nome && typeof i.caminho === 'string').slice(0, max);
  return {
    '@type': 'ItemList',
    name: nome,
    url: url(caminho),
    numberOfItems: validos.length,
    itemListElement: validos.map((i, n) => ({ '@type': 'ListItem', position: n + 1, name: i.nome, url: url(i.caminho) })),
  };
}

// Conjunto de dados publicado na página, com a fonte oficial. `fontes`: [{ nome, url }].
export function conjuntoDeDados({ nome, descricao, caminho, fontes }) {
  const origem = (fontes || []).filter((f) => f && f.nome && f.url);
  return limpo({
    '@type': 'Dataset',
    name: nome,
    description: descricao,
    url: url(caminho),
    inLanguage: 'pt-BR',
    isAccessibleForFree: true,
    creator: { '@id': ID_ORG },
    isBasedOn: origem.length ? origem.map((f) => ({ '@type': 'CreativeWork', name: f.nome, url: f.url })) : undefined,
  });
}

export function pagina({ nome, descricao, caminho, tipo = 'WebPage', extra = {} }) {
  return limpo({
    '@type': tipo,
    '@id': `${url(caminho)}#pagina`,
    name: nome,
    description: descricao,
    url: url(caminho),
    inLanguage: 'pt-BR',
    isPartOf: { '@id': ID_SITE },
    ...extra,
  });
}

export function grafo(...blocos) {
  const itens = blocos.flat().filter(Boolean);
  return { '@context': 'https://schema.org', '@graph': itens };
}

// JSON seguro para dentro de <script>: o caractere menor-que vira escape unicode, então um nome com
// a tag de fechamento do script não fecha o bloco.
export function jsonSeguro(obj) {
  return JSON.stringify(obj)
    .replace(/</g, '\\u003c')
    .replace(/[\u2028\u2029]/g, (c) => '\\u' + c.charCodeAt(0).toString(16));
}
