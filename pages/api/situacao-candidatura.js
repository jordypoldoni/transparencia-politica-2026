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
        headers: { 'User-Agent': 'Mozilla/5.0', Accept: 'application/json' },
      });
      if (!r.ok) throw new Error(`TSE respondeu ${r.status} no cargo ${cargo}`);
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
    console.error('situacao-candidatura:', e.message);
    if (cache.dados) {
      res.setHeader('X-Cache', 'stale');
      return res.status(200).json({ ...cache.dados, degradado: true });
    }
    return res.status(200).json({ consultadoEm: null, situacoes: {}, indisponivel: true });
  }
}
