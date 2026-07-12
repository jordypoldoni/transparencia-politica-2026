// Enriquece a tabela `votacoes` (assunto/ementa, resultado, autor) das votações da CÂMARA,
// resolvendo a MATÉRIA (proposicao_titulo) que serve de chave de agrupamento por processo.
// Roda LOCAL (o sandbox não alcança a API da Câmara): node coletores/backfill_votacoes.js
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import { resolverMateria } from '../src/lib/votacao.js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const API = 'https://dadosabertos.camara.leg.br/api/v2';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function getJson(url, tent = 3) {
  for (let i = 0; i < tent; i++) {
    try {
      const res = await fetch(url, { headers: { Accept: 'application/json' } });
      if (res.status === 429 || res.status >= 500) throw new Error('HTTP ' + res.status);
      if (!res.ok) return null;
      return await res.json();
    } catch (e) {
      if (i === tent - 1) throw e;
      await sleep(600 * (i + 1));
    }
  }
  return null;
}

// Cache de detalhes da proposição (várias votações compartilham a mesma matéria).
const propCache = new Map();
async function getProp(id) {
  if (propCache.has(id)) return propCache.get(id);
  const j = await getJson(`${API}/proposicoes/${id}`);
  const p = (j && j.dados) || null;
  propCache.set(id, p);
  return p;
}

async function main() {
  // ids distintos a partir dos votos — só CÂMARA (formato "12345-67"; Senado é "SF-...").
  const ids = new Set();
  let de = 0;
  for (;;) {
    const { data, error } = await supabase
      .from('votos_parlamentares').select('votacao_id_externa')
      .not('votacao_id_externa', 'is', null).range(de, de + 999);
    if (error) throw error;
    if (!data || data.length === 0) break;
    for (const r of data) if (/^\d+-\d+$/.test(r.votacao_id_externa || '')) ids.add(r.votacao_id_externa);
    if (data.length < 1000) break;
    de += 1000;
  }
  const lista = [...ids];
  console.log(`🗳️  ${lista.length} votações da Câmara a enriquecer.`);

  const metas = [];
  let i = 0, comMateria = 0, comEmenta = 0, comAutor = 0, comSituacao = 0, falhas = 0;
  for (const vid of lista) {
    i++;
    try {
      const j = await getJson(`${API}/votacoes/${vid}`);
      // Se a chamada falhou, NÃO grava (evita sobrescrever dados bons com nulos).
      if (!j || !j.dados) { falhas++; console.warn(`  ⚠️  ${vid}: sem dados da API`); await sleep(180); continue; }
      const det = j.dados;

      const meta = {
        votacao_id_externa: vid,
        descricao: det.descricao || null,
        aprovacao: typeof det.aprovacao === 'number' ? det.aprovacao : null,
        data_voto: det.dataHoraRegistro || det.data || null,
        proposicao_id: null, proposicao_titulo: null, ementa: null, descricao_tipo: null,
        keywords: null, resultado: null, autor_nome: null, autor_tipo: null,
        situacao: null, ementa_detalhada: null, regime: null, url_inteiro_teor: null,
      };

      const efeito = (det.efeitosRegistrados || [])[0];
      meta.resultado = efeito?.descResultado
        || (typeof det.aprovacao === 'number' ? (det.aprovacao === 1 ? 'Aprovada' : 'Rejeitada') : null);

      // Matéria = chave de agrupamento (título) + ementa + id quando houver.
      const materia = resolverMateria(det);
      if (materia) {
        meta.proposicao_titulo = materia.titulo || null;   // ex.: "PL 5490/2025"
        meta.ementa = materia.ementa || null;
        meta.proposicao_id = materia.id || null;
        meta.descricao_tipo = materia.sigla || null;
        if (meta.proposicao_titulo) comMateria++;
        if (meta.ementa) comEmenta++;
        // Autor da própria matéria (não do requerimento) — só se temos o id interno.
        if (materia.id) {
          try {
            const a = await getJson(`${API}/proposicoes/${materia.id}/autores`);
            const a0 = ((a && a.dados) || [])[0];
            if (a0) { meta.autor_nome = a0.nome || null; meta.autor_tipo = a0.tipo || null; if (a0.nome) comAutor++; }
          } catch (e) { /* autor é best-effort */ }
          // Contexto da matéria: assuntos (keywords), situação atual, regime e link do texto.
          try {
            const p = await getProp(materia.id);
            if (p) {
              const sp = p.statusProposicao || {};
              meta.keywords = p.keywords || null;
              meta.situacao = sp.descricaoSituacao || null;
              meta.regime = sp.regime || null;
              meta.url_inteiro_teor = p.urlInteiroTeor || sp.url || null;
              if (p.ementaDetalhada && p.ementaDetalhada.trim() && p.ementaDetalhada !== meta.ementa) meta.ementa_detalhada = p.ementaDetalhada;
              if (!meta.ementa && p.ementa) meta.ementa = p.ementa;
              if (sp.descricaoSituacao) comSituacao++;
            }
          } catch (e) { /* contexto é best-effort */ }
        }
      }

      metas.push(meta);
    } catch (e) {
      falhas++;
      console.warn(`  ⚠️  ${vid}: ${e.message}`);
    }
    if (i % 20 === 0) console.log(`  ...${i}/${lista.length}`);
    await sleep(180);
  }

  for (let j = 0; j < metas.length; j += 200) {
    const { error } = await supabase.from('votacoes').upsert(metas.slice(j, j + 200), { onConflict: 'votacao_id_externa' });
    if (error) console.warn('upsert:', error.message);
  }
  console.log(`✅ ${metas.length} gravadas — ${comMateria} com matéria, ${comEmenta} com ementa, ${comAutor} com autor, ${comSituacao} com situação. ${falhas} falhas (não sobrescritas).`);
}
main().catch((e) => { console.error(e); process.exit(1); });
