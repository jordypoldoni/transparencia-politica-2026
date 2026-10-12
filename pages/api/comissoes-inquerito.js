// GET /api/comissoes-inquerito?id=<uuid do agente>
//
// Devolve as CPIs e CPMIs de que um SENADOR participou, buscadas na hora no Senado.
//
// POR QUE NA HORA, E NAO NO BANCO (decidido em 12/10/2026, ideia I1)
// O endpoint /senador/{codigo}/comissoes do Senado devolve o historico completo do senador,
// inclusive CPIs e CPMIs ja encerradas, com datas e papel (titular ou suplente). Sao poucas
// linhas por senador, entao nao ha o que guardar. Cache de 6 horas na borda.
//
// SO SENADO: a API da Camara nao expoe participacao em CPI nem em CPMI (testado em 12/10/2026
// com 4 deputados, incluindo o relator da CPMI do INSS). Para deputado esta rota responde
// { suportado: false } e a tela nao mostra a secao, em vez de afirmar que nao participou.
//
// O papel de presidente ou relator NAO vem neste endpoint (so Titular e Suplente). Nao inventamos.
// Participar de CPI nao significa ser investigado: a CPI e quem investiga. A tela diz isso.

import { createClient } from '@supabase/supabase-js';

const SENADO = 'https://legis.senado.leg.br/dadosabertos';
const TIMEOUT_MS = 12000;

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const comoArray = (x) => (x == null ? [] : Array.isArray(x) ? x : [x]);
const limpo = (t) => String(t ?? '').replace(/\s+/g, ' ').trim() || null;

// CPI e CPMI pelo nome oficial ou pela sigla. Subcomissoes e grupos de trabalho ficam de fora.
const ehInquerito = (sigla, nome) => {
  const s = String(sigla || '').trim().toUpperCase();
  const n = String(nome || '').toLowerCase();
  if (/^CPM?I\b/.test(s)) return true;
  return /^comiss[aã]o parlamentar (mista )?de inqu[eé]rito/.test(n) || /^cpm?i\b/.test(n);
};

async function buscar(url) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const r = await fetch(url, { signal: ctrl.signal, headers: { Accept: 'application/json' } });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return await r.json();
  } finally {
    clearTimeout(timer);
  }
}

export default async function handler(req, res) {
  const { id } = req.query;
  if (!id) return res.status(400).json({ erro: 'informe o id do parlamentar' });

  try {
    const { data: p, error } = await supabase
      .from('agentes_politicos')
      .select('id_externo_api, fonte_api')
      .eq('id', id)
      .single();
    if (error || !p) return res.status(404).json({ erro: 'parlamentar não encontrado' });

    if (!(p.fonte_api || '').toLowerCase().includes('senado')) {
      res.setHeader('Cache-Control', 's-maxage=21600, stale-while-revalidate=86400');
      return res.status(200).json({ suportado: false, comissoes: [] });
    }

    const codigo = String(p.id_externo_api || '').split('-').pop();
    const j = await buscar(`${SENADO}/senador/${codigo}/comissoes.json`);
    const bruto = comoArray(j?.MembroComissaoParlamentar?.Parlamentar?.MembroComissoes?.Comissao);

    // Um senador pode ter varios registros da mesma CPI (trocas de vaga). Junta por codigo.
    const porCodigo = new Map();
    for (const c of bruto) {
      const ident = c?.IdentificacaoComissao || {};
      const sigla = limpo(ident.SiglaComissao);
      const nome = limpo(ident.NomeComissao);
      if (!ehInquerito(sigla, nome)) continue;
      const cod = String(ident.CodigoComissao || `${sigla}-${nome}`);
      const periodo = {
        papel: limpo(c.DescricaoParticipacao),
        inicio: c.DataInicio ? String(c.DataInicio).slice(0, 10) : null,
        fim: c.DataFim ? String(c.DataFim).slice(0, 10) : null,
      };
      if (!porCodigo.has(cod)) {
        porCodigo.set(cod, {
          codigo: cod,
          sigla,
          nome,
          casa: limpo(ident.SiglaCasaComissao), // 'SF' (Senado) ou 'CN' (Congresso, mista)
          periodos: [],
        });
      }
      porCodigo.get(cod).periodos.push(periodo);
    }

    const comissoes = [...porCodigo.values()].map((c) => {
      c.periodos.sort((a, b) => (a.inicio || '').localeCompare(b.inicio || ''));
      c.inicio = c.periodos[0]?.inicio || null;
      // Sem DataFim em nenhum periodo: a fonte nao registra fim. Isso NAO prova que a CPI
      // esta ativa, por isso a tela diz "sem data de fim registrada".
      c.fim = c.periodos.some((x) => !x.fim) ? null : c.periodos[c.periodos.length - 1].fim;
      return c;
    }).sort((a, b) => (b.inicio || '').localeCompare(a.inicio || ''));

    res.setHeader('Cache-Control', 's-maxage=21600, stale-while-revalidate=86400');
    return res.status(200).json({ suportado: true, total: comissoes.length, comissoes });
  } catch (e) {
    console.error('api/comissoes-inquerito:', e.message);
    // Fonte fora do ar: dizemos isso, em vez de lista vazia que o leitor leria como "nunca participou".
    return res.status(503).json({ erro: 'a fonte oficial não respondeu agora' });
  }
}
