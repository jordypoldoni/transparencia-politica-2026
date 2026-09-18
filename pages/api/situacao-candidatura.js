// pages/api/situacao-candidatura.js — situação da candidatura, buscada AO VIVO no TSE.
//
// POR QUE AO VIVO E NÃO GUARDADA NO BANCO (decisão do Jordy, 16/09/2026)
// Este dado se mexe. "Pendente de julgamento" vira deferido ou indeferido a qualquer momento
// até a eleição de 04/10, e dado guardado envelhece em silêncio: o site passaria a afirmar uma
// situação que já mudou. Buscando na hora, a tela nunca mente sobre isso. É o mesmo desenho da
// /api/proposicoes: identidade no banco, status ao vivo.
//
// POR QUE ESTA FONTE E NÃO O CSV QUE JÁ BAIXAMOS
// O arquivo em lote (consulta_cand) traz DS_SITUACAO_CANDIDATURA como "#NE" em 100% das linhas,
// inclusive nos presidenciáveis. Chegamos a concluir que o TSE não publicava o dado. Publica:
// está no DivulgaCandContas, com valores reais (Deferido, Indeferido, Pendente de julgamento).
// Verificado em 16/09/2026 com coletores/_diag_vice4.mjs.
//
// POR QUE PASSA PELO SERVIDOR E NÃO PELO NAVEGADOR DO LEITOR
// Chamada direta do browser esbarraria em CORS, exporia o padrão de acesso do leitor ao TSE e
// multiplicaria requisições. Aqui é uma chamada por janela de cache, para todos os visitantes.

const BASE = 'https://divulgacandcontas.tse.jus.br/divulga/rest/v1/candidatura/listar';
const ANO = 2026;
const ID_ELEICAO = 6257;          // CD_ELEICAO do CSV de 2026
const CARGOS = { 1: 'Presidente', 2: 'Vice-Presidente' };
const TTL_MS = 15 * 60 * 1000;    // 15 min: o TSE não julga de minuto em minuto, e isso segura
                                  // uma rajada de acessos numa requisição só.

let cache = { em: 0, dados: null };

// Por que uma falha de rede precisa de tratamento próprio aqui (17/09/2026).
// Em produção as duas rotas do TSE passaram a devolver `indisponivel: true` enquanto em
// localhost funcionavam. O log não ajudou: quando o fetch do Node falha na conexão, a
// `message` é literalmente "fetch failed" e o motivo real mora em `e.cause` — que eu não
// estava lendo. Sem isso não dá para separar DNS, TLS, recusa de conexão e bloqueio por IP,
// que pedem correções diferentes. Também cortamos a espera em 9s: o limite da função na
// Vercel é 10s, e estourar ele devolve 504 em vez de uma mensagem legível.
function porQueFalhou(e) {
  const causa = e && e.cause;
  const partes = [e && e.message].filter(Boolean);
  if (causa) partes.push(causa.code || causa.message || String(causa));
  if (e && e.name === 'TimeoutError') partes.push('a fonte demorou mais de 9s');
  return partes.join(' \u00b7 ');
}
const PRAZO = () => (typeof AbortSignal !== 'undefined' && AbortSignal.timeout ? AbortSignal.timeout(9000) : undefined);

// PARAR DE DEDUZIR. (18/09/2026)
// Duas mudanças de região na Vercel e o cabeçalho x-vercel-id continua "gru1::iad1::…".
// Eu venho LENDO esse cabeçalho como "entrou em São Paulo, executou em Washington" — mas
// esse formato é suposição minha, e supor formato já me custou quatro diagnósticos nesta
// semana. A função sabe onde está: process.env.VERCEL_REGION. Então ela passa a dizer.
//
// E o 403 do TSE vem com corpo, que eu estava jogando fora ao lançar só o status. Um WAF
// costuma explicar no corpo o que barrou — ou ao menos deixa a assinatura de quem barrou
// nos cabeçalhos. Sem isso não dá para separar bloqueio por país de bloqueio por cliente.
const REGIAO = process.env.VERCEL_REGION || 'local';

async function motivoDaRecusa(r) {
  let corpo = '';
  try { corpo = (await r.text()).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 300); } catch { }
  const pistas = ['server', 'x-cache', 'cf-ray', 'x-akamai-transformed', 'x-iinfo']
    .map((h) => [h, r.headers.get(h)]).filter(([, v]) => v).map(([h, v]) => `${h}=${v}`);
  return `TSE respondeu ${r.status}${corpo ? ` — "${corpo}"` : ''}${pistas.length ? ` [${pistas.join(' ')}]` : ''}`;
}

export default async function handler(req, res) {
  const agora = Date.now();
  if (cache.dados && (agora - cache.em) < TTL_MS) {
    res.setHeader('X-Cache', 'hit');
    return res.status(200).json(cache.dados);
  }

  try {
    const situacoes = {};
    for (const cargo of Object.keys(CARGOS)) {
      const r = await fetch(`${BASE}/${ANO}/BR/${ID_ELEICAO}/${cargo}/candidatos`, {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; LumeCidadaoBot/1.0; +https://www.lumecidadao.com.br/sobre)', Accept: 'application/json' },
        signal: PRAZO(),
      });
      if (!r.ok) throw new Error(`${await motivoDaRecusa(r)} (cargo ${cargo})`);
      const j = await r.json();
      for (const c of j.candidatos || []) {
        if (!c?.id) continue;
        situacoes[String(c.id)] = {
          situacao: c.descricaoSituacao || null,
          apto: typeof c.candidatoApto === 'boolean' ? c.candidatoApto : null,
          totalizacao: c.descricaoTotalizacao || null,
        };
      }
    }

    const dados = {
      consultadoEm: new Date().toISOString(),
      fonte: 'https://divulgacandcontas.tse.jus.br/divulga/#/home',
      situacoes,
    };
    cache = { em: agora, dados };
    res.setHeader('X-Cache', 'miss');
    return res.status(200).json(dados);
  } catch (e) {
    // Falha do TSE NÃO pode derrubar a tela. Devolvemos o cache velho quando existe, e um
    // objeto vazio quando não: sem situação, a tela simplesmente não mostra o selo, que é o
    // comportamento de antes desta rota existir.
    const motivoTecnico = porQueFalhou(e);
    console.error('situacao-candidatura:', motivoTecnico);
    if (cache.dados) {
      res.setHeader('X-Cache', 'stale');
      return res.status(200).json({ ...cache.dados, degradado: true, motivoTecnico, regiao: REGIAO });
    }
    return res.status(200).json({ consultadoEm: null, situacoes: {}, indisponivel: true, motivoTecnico, regiao: REGIAO });
  }
}
