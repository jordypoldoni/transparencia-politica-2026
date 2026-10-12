// CPIs e pedidos de CPI, buscados ao vivo nas fontes oficiais (ideia I1, 12/10/2026).
//
// NADA E GUARDADO NO BANCO. A pagina /cpis chama estas funcoes no servidor e o resultado fica
// em cache na borda por 1 hora (Cache-Control em pages/cpis.js).
//
// O QUE CADA FONTE ENTREGA (testado em 12/10/2026)
// - Senado, /comissao/lista/CPI: so as CPIs EM ATIVIDADE (a propria API descreve a lista assim).
//   Traz nome, sigla, data de inicio, finalidade e o requerimento. A ficha da comissao traz a
//   quantidade de titulares e suplentes e os cargos (presidente, vice, relator), hoje "VAGO".
// - Camara, proposicoes do tipo RCP ("Requerimento de Instituicao de CPI"): texto, data de
//   apresentacao, situacao, ultimo despacho e a lista de assinantes.
// - A Camara NAO diz se uma CPI/CPMI esta ativa (o cadastro de orgaos nao tem situacao nem
//   datas), entao esta pagina nao afirma "CPI da Camara em andamento". Diz so o que a fonte diz.
// - Pedidos de CPI do Senado (requerimentos do tipo RQS) ficam de fora desta versao.

const SENADO = 'https://legis.senado.leg.br/dadosabertos';
const CAMARA = 'https://dadosabertos.camara.leg.br/api/v2';
const TIMEOUT_MS = 12000;
const PRIMEIRO_ANO = 2023; // inicio da legislatura atual (2023 a 2026)

async function buscar(url, tipo = 'json') {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const r = await fetch(url, {
      signal: ctrl.signal,
      headers: { Accept: tipo === 'json' ? 'application/json' : 'application/xml' },
    });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return tipo === 'json' ? r.json() : r.text();
  } finally {
    clearTimeout(timer);
  }
}

// ---------- XML do Senado (sem dependencia: so precisamos de tags simples) ----------
const entidades = (s) => s
  .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'")
  .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
  .replace(/&amp;/g, '&');

export function tagXml(xml, nome) {
  const m = new RegExp(`<${nome}(?:\\s[^>]*)?>([\\s\\S]*?)</${nome}>`, 'i').exec(xml || '');
  if (!m) return null;
  const v = entidades(m[1].replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')).replace(/\s+/g, ' ').trim();
  return v || null;
}

export function blocosXml(xml, nome) {
  const re = new RegExp(`<${nome}(?:\\s[^>]*)?>[\\s\\S]*?</${nome}>`, 'gi');
  return (xml || '').match(re) || [];
}

// 'dd/mm/aaaa' (ficha) ou 'aaaa-mm-dd' (lista) -> 'aaaa-mm-dd'
const dataIso = (v) => {
  if (!v) return null;
  const br = /^(\d{2})\/(\d{2})\/(\d{4})/.exec(v);
  if (br) return `${br[3]}-${br[2]}-${br[1]}`;
  return /^\d{4}-\d{2}-\d{2}/.test(v) ? v.slice(0, 10) : null;
};

// ---------- Senado: CPIs em atividade ----------
export async function cpisSenado() {
  const xml = await buscar(`${SENADO}/comissao/lista/CPI`, 'xml');
  const itens = blocosXml(xml, 'colegiado')
    .map((b) => ({
      codigo: tagXml(b, 'CodigoColegiado'),
      nome: tagXml(b, 'NomeColegiado'),
      sigla: tagXml(b, 'SiglaColegiado'),
      requerimento: tagXml(b, 'DescricaoSubtitulo'),
      finalidade: tagXml(b, 'TextoFinalidade'),
      inicio: dataIso(tagXml(b, 'DataInicio')),
      tipo: tagXml(b, 'SiglaTipoColegiado'),
    }))
    .filter((c) => c.codigo && c.nome && /^CPM?I$/i.test(c.tipo || 'CPI'));

  // Ficha de cada CPI: quantos membros o cadastro informa e quem ocupa os cargos.
  // Falha numa ficha nao derruba a lista: a CPI aparece sem esse detalhe.
  await Promise.all(itens.map(async (c) => {
    try {
      const f = await buscar(`${SENADO}/comissao/${c.codigo}`, 'xml');
      c.titulares = Number(tagXml(f, 'SenadoresTitulares')) || null;
      c.suplentes = Number(tagXml(f, 'SenadoresSuplentes')) || null;
      const cargos = blocosXml(f, 'Cargo').map((x) => ({
        cargo: tagXml(x, 'TipoCargo'),
        nome: tagXml(x, 'NomeParlamentar'),
      })).filter((x) => x.cargo);
      c.cargos = cargos;
      c.cargosPreenchidos = cargos.filter((x) => x.nome && !/^vago/i.test(x.nome));
      c.nomesNoCadastro = blocosXml(f, 'NomeParlamentar').length - cargos.length;
    } catch (e) {
      c.cargos = null;
    }
  }));
  return itens.sort((a, b) => (b.inicio || '').localeCompare(a.inicio || ''));
}

// ---------- Camara: pedidos de CPI (RCP) ----------
async function emLotes(lista, tamanho, fn) {
  const saida = [];
  for (let i = 0; i < lista.length; i += tamanho) {
    saida.push(...await Promise.all(lista.slice(i, i + tamanho).map(fn)));
  }
  return saida;
}

export async function pedidosCamara(anoAtual = new Date().getFullYear()) {
  const anos = [];
  for (let a = PRIMEIRO_ANO; a <= anoAtual; a++) anos.push(a);
  const listas = await Promise.all(anos.map((a) =>
    buscar(`${CAMARA}/proposicoes?siglaTipo=RCP&ano=${a}&itens=100&ordem=DESC&ordenarPor=id`)
      .then((j) => j?.dados || [])));
  const base = listas.flat();

  const itens = await emLotes(base, 5, async (p) => {
    const item = {
      id: p.id,
      numero: p.numero,
      ano: p.ano,
      ementa: String(p.ementa || '').replace(/\s+/g, ' ').trim() || null,
      data: null, situacao: null, despacho: null, dataSituacao: null,
      assinaturas: null, primeiro: null, inteiroTeor: null,
      ficha: `https://www.camara.leg.br/proposicoesWeb/fichadetramitacao?idProposicao=${p.id}`,
    };
    // Detalhe e assinantes sao independentes: se um falhar, o outro ainda aparece.
    const [det, aut] = await Promise.allSettled([
      buscar(`${CAMARA}/proposicoes/${p.id}`),
      buscar(`${CAMARA}/proposicoes/${p.id}/autores`),
    ]);
    if (det.status === 'fulfilled') {
      const d = det.value?.dados || {};
      const s = d.statusProposicao || {};
      item.data = d.dataApresentacao ? String(d.dataApresentacao).slice(0, 10) : null;
      item.situacao = s.descricaoSituacao || null;
      item.despacho = s.despacho ? String(s.despacho).replace(/\s+/g, ' ').trim() : null;
      item.dataSituacao = s.dataHora ? String(s.dataHora).slice(0, 10) : null;
      item.inteiroTeor = d.urlInteiroTeor || null;
    }
    if (aut.status === 'fulfilled') {
      const autores = aut.value?.dados || [];
      const deputados = autores.filter((x) => x.codTipo === 10000);
      item.assinaturas = (deputados.length ? deputados : autores).length;
      const primeiro = autores.find((x) => x.proponente === 1) || autores.find((x) => x.ordemAssinatura === 1);
      item.primeiro = primeiro?.nome || null;
    }
    return item;
  });

  return itens.sort((a, b) => (b.ano - a.ano) || (b.numero - a.numero));
}
