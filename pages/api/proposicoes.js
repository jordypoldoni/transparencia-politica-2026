// GET /api/proposicoes?id=<uuid do agente>
//
// Devolve a lista COMPLETA de proposicoes de um parlamentar, buscada na hora na fonte oficial.
//
// POR QUE NA HORA, E NAO NO BANCO (decidido em 11/09/2026)
// Os federais e senadores declaram 258.368 proposicoes somadas (media de 431 por parlamentar,
// maior individual: 4.292). Guardar tudo como JSONB daria ~112 MB, contra 213 MB livres no
// plano free do Supabase - e a tabela de despesas ja ocupa 211 MB. Entao: as 20 mais recentes
// continuam no banco (e o que o Google indexa e o que aparece sem depender de nada), e o resto
// vem por esta rota quando o leitor pede. Serve tambem para os proximos estados que entrarem.
//
// O conteudo e renderizado DENTRO do site. O unico link que leva para fora e o "ver na fonte"
// de cada proposicao, por escolha do Jordy.
//
// Cache: a resposta e guardada na borda por 6 horas. Proposicao de mandato nao muda de minuto
// em minuto, e isso evita bater na API oficial a cada clique.

import { createClient } from '@supabase/supabase-js';

const CAMARA = 'https://dadosabertos.camara.leg.br/api/v2';
const SENADO = 'https://legis.senado.leg.br/dadosabertos';
const MANDATO_INICIO = '2023-02-01';
const MAX_PAGINAS = 10;     // teto de seguranca: 10 x 100 = 1.000 proposicoes por parlamentar
const TIMEOUT_MS = 12000;

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const limpo = (t) => String(t ?? '').replace(/\s+/g, ' ').trim() || null;

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

// ---------- Camara dos Deputados ----------
async function proposicoesCamara(idDeputado) {
  const todas = [];
  for (let pag = 1; pag <= MAX_PAGINAS; pag++) {
    const j = await buscar(`${CAMARA}/proposicoes?idDeputadoAutor=${idDeputado}&dataApresentacaoInicio=${MANDATO_INICIO}&ordem=DESC&ordenarPor=id&itens=100&pagina=${pag}`);
    const lote = j?.dados || [];
    todas.push(...lote);
    if (lote.length < 100) break;
  }
  return todas.map((p) => ({
    tipo: limpo(p.siglaTipo),
    numero: p.numero ? String(p.numero) : null,
    ano: p.ano ? String(p.ano) : null,
    ementa: limpo(p.ementa),
    data: p.dataApresentacao ? String(p.dataApresentacao).slice(0, 10) : null,
    // O id ja vem nesta resposta - guardar so ele basta para montar a ficha de tramitacao,
    // sem nenhuma requisicao extra. Era exatamente isso que o coletor descartava.
    link: p.id ? `https://www.camara.leg.br/proposicoesWeb/fichadetramitacao?idProposicao=${p.id}` : null,
  })).filter((p) => p.ementa || p.tipo)
    // A consulta e ordenada por id (a API nao aceita ordenarPor=dataApresentacao, devolve 400).
    // A data vem no corpo, entao a ordem cronologica de verdade e feita aqui.
    .sort((a, b) => (b.data || '').localeCompare(a.data || ''));
}

// ---------- Senado Federal ----------
function comoArray(x) {
  return x == null ? [] : Array.isArray(x) ? x : [x];
}

async function proposicoesSenado(codigo) {
  // A API do Senado responde JSON quando o caminho termina em .json
  const j = await buscar(`${SENADO}/senador/${codigo}/autorias.json`);
  const raiz = j?.MateriasAutoriaParlamentar?.Parlamentar?.Autorias?.Autoria
    ?? j?.AutoriasParlamentar?.Parlamentar?.Autorias?.Autoria
    ?? j?.AutoriasParlamentar?.Autorias?.Autoria;
  return comoArray(raiz).map((a) => {
    const m = a?.Materia || {};
    return {
      tipo: limpo(m.Sigla),
      numero: m.Numero ? String(m.Numero) : null,
      ano: m.Ano ? String(m.Ano) : null,
      ementa: limpo(m.Ementa),
      // Campos reais: Materia { Codigo, Sigla, Numero, Ano, Ementa, Data }.
      data: m.Data ? String(m.Data).slice(0, 10) : null,
      link: m.Codigo
        ? `https://www25.senado.leg.br/web/atividade/materias/-/materia/${m.Codigo}`
        : null,
    };
  }).filter((p) => p.ementa || p.tipo)
    .sort((a, b) => (b.data || '').localeCompare(a.data || ''));
}

export default async function handler(req, res) {
  const { id } = req.query;
  if (!id) return res.status(400).json({ erro: 'informe o id do parlamentar' });

  try {
    const { data: p, error } = await supabase
      .from('agentes_politicos')
      .select('id_externo_api, fonte_api, proposicoes')
      .eq('id', id)
      .single();
    if (error || !p) return res.status(404).json({ erro: 'parlamentar não encontrado' });

    const fonte = (p.fonte_api || '').toLowerCase();
    const idExterno = String(p.id_externo_api || '').split('-').pop();
    let lista;

    if (fonte.includes('camara')) lista = await proposicoesCamara(idExterno);
    else if (fonte.includes('senado')) lista = await proposicoesSenado(idExterno);
    else {
      // Estaduais (ALRS hoje, outros depois): a lista completa ja esta no banco, porque o
      // volume e pequeno. Devolve o que temos, em vez de sair buscando a toa.
      lista = Array.isArray(p.proposicoes) ? p.proposicoes : [];
    }

    res.setHeader('Cache-Control', 's-maxage=21600, stale-while-revalidate=86400');
    return res.status(200).json({ total: lista.length, proposicoes: lista });
  } catch (e) {
    console.error('api/proposicoes:', e.message);
    // A fonte oficial caiu ou demorou. Dizemos isso ao leitor em vez de mostrar lista vazia,
    // que ele leria como "este parlamentar nao propos nada".
    return res.status(503).json({ erro: 'a fonte oficial não respondeu agora' });
  }
}
