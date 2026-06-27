// Backfill único: popula a tabela `votacoes` (assunto/ementa, resultado, autor)
// para as votações que já existem em votos_parlamentares.
// Roda: node coletores/backfill_votacoes.js
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const API = 'https://dadosabertos.camara.leg.br/api/v2';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function getJson(url) {
  const res = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

async function main() {
  // ids distintos a partir dos votos
  const ids = new Set();
  let de = 0;
  for (;;) {
    const { data, error } = await supabase
      .from('votos_parlamentares')
      .select('votacao_id_externa')
      .not('votacao_id_externa', 'is', null)
      .range(de, de + 999);
    if (error) throw error;
    if (!data || data.length === 0) break;
    for (const r of data) ids.add(r.votacao_id_externa);
    if (data.length < 1000) break;
    de += 1000;
  }
  const lista = [...ids];
  console.log(`🗳️  ${lista.length} votações distintas a enriquecer.`);

  const metas = [];
  let i = 0;
  for (const vid of lista) {
    i++;
    const meta = {
      votacao_id_externa: vid, descricao: null, aprovacao: null, data_voto: null,
      proposicao_id: null, proposicao_titulo: null, ementa: null, descricao_tipo: null,
      keywords: null, resultado: null, autor_nome: null, autor_tipo: null,
    };
    try {
      const det = (await getJson(`${API}/votacoes/${vid}`)).dados || {};
      meta.descricao = det.descricao || null;
      meta.aprovacao = typeof det.aprovacao === 'number' ? det.aprovacao : null;
      meta.data_voto = det.dataHoraRegistro || det.data || null;
      const lei = (det.proposicoesAfetadas || [])[0];
      const obj = (det.objetosPossiveis || [])[0];
      const efeito = (det.efeitosRegistrados || [])[0];
      const principal = lei || obj;
      if (principal) {
        meta.proposicao_id = String(principal.id);
        meta.ementa = principal.ementa || null;
        if (principal.siglaTipo) meta.proposicao_titulo = `${principal.siglaTipo} ${principal.numero}/${principal.ano}`;
      }
      meta.resultado = efeito?.descResultado || null;
      const autorAlvo = obj?.id || lei?.id;
      if (autorAlvo) {
        try {
          const a0 = ((await getJson(`${API}/proposicoes/${autorAlvo}/autores`)).dados || [])[0];
          if (a0) { meta.autor_nome = a0.nome || null; meta.autor_tipo = a0.tipo || null; }
        } catch (e) {}
      }
    } catch (e) {
      console.warn(`  ⚠️  ${vid}: ${e.message}`);
    }
    metas.push(meta);
    if (i % 20 === 0) console.log(`  ...${i}/${lista.length}`);
    await sleep(180);
  }

  for (let j = 0; j < metas.length; j += 200) {
    const { error } = await supabase.from('votacoes').upsert(metas.slice(j, j + 200), { onConflict: 'votacao_id_externa' });
    if (error) console.warn('upsert:', error.message);
  }
  console.log(`✅ ${metas.length} votações gravadas em 'votacoes'.`);
}
main().catch((e) => { console.error(e); process.exit(1); });
