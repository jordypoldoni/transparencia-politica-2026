// Coletor de VOTAÇÕES NOMINAIS do Senado (dados abertos).
// API por intervalo de datas: /plenario/lista/votacao/AAAAMMDD/AAAAMMDD.json
// Idempotente: upsert por (votacao_id_externa, agente_id) e por votacao_id_externa.
// Uso: node coletores/coletor_votos_senado.js 2025   (default: 2026)
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ANO = parseInt(process.argv[2] || process.env.ANO || '2026', 10);
if (!SUPABASE_URL || !SUPABASE_KEY) { console.error('Faltam SUPABASE_URL / SERVICE_ROLE_KEY.'); process.exit(1); }

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const API = 'https://legis.senado.leg.br/dadosabertos';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const arr = (x) => (Array.isArray(x) ? x : (x ? [x] : []));
const fmt = (d) => d.toISOString().slice(0, 10).replace(/-/g, ''); // AAAAMMDD

async function getJson(url) {
  const res = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

function normVoto(v) {
  const s = String(v || '').trim();
  const l = s.toLowerCase();
  if (l === 'sim') return 'Sim';
  if (l === 'não' || l === 'nao') return 'Não';
  if (l.startsWith('absten')) return 'Abstenção';
  if (l.startsWith('obstru')) return 'Obstrução';
  return s || 'Outro';
}

// Rótulo do voto em linguagem oficial.
// Para Sim/Não/Abstenção mantém o termo simples (usado também nos índices).
// Para os códigos de ausência/situação (AP, LS, P-NRV, MIS, NCom, LP, LAP, NA...),
// usa a DESCRIÇÃO OFICIAL que a própria API do Senado fornece — sem inventar nada.
function rotularVotoSenado(sigla, descricao) {
  const base = normVoto(sigla);
  if (base === 'Sim' || base === 'Não' || base === 'Abstenção' || base === 'Obstrução') return base;
  const d = String(descricao || '').trim();
  return d || base;
}

async function main() {
  console.log(`🟦 Coletor de votos do Senado — ${ANO}`);

  // 1) Mapa CodigoParlamentar -> agente_id (senadores)
  const { data: sens } = await supabase.from('agentes_politicos').select('id, id_externo_api').ilike('fonte_api', '%senado%');
  const mapa = new Map((sens || []).map((s) => [String(s.id_externo_api), s.id]));
  console.log(`👥 ${mapa.size} senadores mapeados.`);

  const linhas = [];
  const metas = [];
  const hoje = new Date();

  // 2) Percorre o ano mês a mês (a API é por intervalo de datas)
  for (let m = 1; m <= 12; m++) {
    const ini = new Date(Date.UTC(ANO, m - 1, 1));
    const fim = new Date(Date.UTC(ANO, m, 0));
    if (ini > hoje) break;
    let data;
    try {
      data = await getJson(`${API}/plenario/lista/votacao/${fmt(ini)}/${fmt(fim)}.json`);
    } catch (e) { console.warn(`  ⚠️  ${ANO}-${String(m).padStart(2, '0')}: ${e.message}`); await sleep(200); continue; }

    const votacoes = arr(data?.ListaVotacoes?.Votacoes?.Votacao);
    for (const v of votacoes) {
      if (String(v.Secreta).toUpperCase() === 'S') continue; // secreta não tem voto nominal
      const votos = arr(v?.Votos?.VotoParlamentar);
      if (votos.length === 0) continue;

      const vid = `SF-${v.CodigoSessaoVotacao}`;
      const res = String(v.Resultado || '').toLowerCase();
      const aprov = /provad/.test(res) ? 1 : /ejeit/.test(res) ? 0 : null;
      const dataVoto = v.DataSessao || null;

      for (const voto of votos) {
        const id = voto?.IdentificacaoParlamentar || voto; // campos podem vir direto ou aninhados
        const cod = String(id?.CodigoParlamentar ?? '');
        const aid = mapa.get(cod);
        if (!aid) continue;
        linhas.push({
          agente_id: aid,
          voto_tipo: rotularVotoSenado(voto.Voto ?? voto.SiglaVoto, voto.DescricaoVoto),
          data_voto: dataVoto,
          ementa_resumida_voto: v.DescricaoVotacao || null,
          votacao_id_externa: vid,
          descricao_votacao: v.DescricaoVotacao || null,
          aprovacao: aprov,
        });
      }

      const mat = v.Materia || {};
      const titulo = (mat.SiglaMateria && mat.NumeroMateria) ? `${mat.SiglaMateria} ${mat.NumeroMateria}/${mat.AnoMateria}` : (v.DescricaoIdentificacaoMateria || null);
      metas.push({
        votacao_id_externa: vid,
        descricao: v.DescricaoVotacao || null,
        aprovacao: aprov,
        data_voto: dataVoto,
        proposicao_id: mat.CodigoMateria ? String(mat.CodigoMateria) : null,
        proposicao_titulo: titulo,
        ementa: mat.DescricaoIdentificacaoMateria || v.DescricaoVotacao || null,
        descricao_tipo: null,
        resultado: v.Resultado || null,
        autor_nome: null,
      });
    }
    await sleep(200);
  }

  console.log(`🗳️  ${metas.length} votações nominais · ${linhas.length} votos a gravar.`);

  // 3) Upsert idempotente
  for (let i = 0; i < metas.length; i += 200) {
    const { error } = await supabase.from('votacoes').upsert(metas.slice(i, i + 200), { onConflict: 'votacao_id_externa' });
    if (error) console.warn('votacoes:', error.message);
  }
  for (let i = 0; i < linhas.length; i += 500) {
    const { error } = await supabase.from('votos_parlamentares').upsert(linhas.slice(i, i + 500), { onConflict: 'votacao_id_externa,agente_id' });
    if (error) throw error;
  }
  console.log(`✅ Concluído: ${metas.length} votações e ${linhas.length} votos do Senado (${ANO}).`);
}

main().catch((e) => { console.error('ERRO:', e.message); process.exit(1); });
