// coletor_mandato_senado.js — preenche mandato (Titular/Suplente + legislatura) dos SENADORES.
// O endpoint de DETALHE do Senado não traz titular/suplente; isso vive em /senador/{cod}/mandatos.
// Este coletor separado só toca as colunas `mandato` (jsonb) e `condicao_eleitoral` dos senadores.
//
// Rodar LOCAL. Precisa de .env com SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY. Idempotente.
//
// ⚠️ CONCORRÊNCIA: o `coletor_biografia.js` grava mandato=null para senador (código atual).
// Se rodar os dois em paralelo, RODE ESTE MAIS UMA VEZ depois que o coletor_biografia terminar,
// pra a última execução valer (senão o run principal pode sobrescrever de volta pra null).
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import { XMLParser } from 'fast-xml-parser';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SUPABASE_KEY) { console.error('❌ Faltam credenciais Supabase (.env).'); process.exit(1); }
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const SENADO = 'https://legis.senado.leg.br/dadosabertos';
const xml = new XMLParser({ ignoreAttributes: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const arr = (x) => (x == null ? [] : Array.isArray(x) ? x : [x]);
const cap = (s) => (s ? String(s).trim() : null);

async function getXML(url, tentativas = 4) {
  for (let i = 0; i < tentativas; i++) {
    try {
      const r = await fetch(url, { headers: { Accept: 'application/xml' } });
      if (r.ok) return xml.parse(await r.text());
      if (r.status === 429 || r.status >= 500) { await sleep(800 * Math.pow(2, i)); continue; }
      return null;
    } catch { await sleep(800 * Math.pow(2, i)); }
  }
  return null;
}

// Extrai o mandato ATUAL (maior legislatura) da lista de mandatos do senador.
function mandatoAtual(codigo, det) {
  const mandatos = arr(det?.MandatoParlamentar?.Parlamentar?.Mandatos?.Mandato);
  if (!mandatos.length) return null;
  // Ordena pela legislatura de início (desc) e pega o mais recente.
  const norm = mandatos.map((m) => {
    const prim = m.PrimeiraLegislaturaDoMandato || {};
    const seg = m.SegundaLegislaturaDoMandato || {};
    const leg = parseInt(seg.NumeroLegislatura || prim.NumeroLegislatura || '0', 10) || 0;
    return {
      participacao: cap(m.DescricaoParticipacao),           // Titular | 1º Suplente | 2º Suplente
      legislatura: prim.NumeroLegislatura || null,
      inicio: prim.DataInicio || null,
      uf: cap(m.UfParlamentar),
      _leg: leg,
    };
  }).sort((a, b) => b._leg - a._leg);
  const cur = norm[0];
  delete cur._leg;
  return (cur.participacao || cur.legislatura) ? cur : null;
}

async function main() {
  console.log('🚀 Mandato/suplência dos senadores…');
  const { data: senadores, error } = await supabase
    .from('agentes_politicos')
    .select('id, id_externo_api, nome_urna')
    .ilike('fonte_api', '%senado%')
    .not('id_externo_api', 'is', null);
  if (error) { console.error(error.message); process.exit(1); }
  console.log(`📥 ${senadores.length} senadores.`);

  let ok = 0, vazio = 0;
  for (const s of senadores) {
    const cod = String(s.id_externo_api).split('-').pop();
    const det = await getXML(`${SENADO}/senador/${cod}/mandatos`);
    const m = det ? mandatoAtual(cod, det) : null;
    if (!m) { vazio++; console.log(`  ∅ ${s.nome_urna} — sem mandato`); await sleep(150); continue; }
    const { error: upErr } = await supabase.from('agentes_politicos')
      .update({ mandato: m, condicao_eleitoral: m.participacao }).eq('id', s.id);
    if (upErr) console.warn(`  ⚠️  ${s.nome_urna}: ${upErr.message}`);
    else { ok++; if (ok % 20 === 0) console.log(`  … ${ok} atualizados`); }
    await sleep(150);
  }
  console.log(`\n✅ Mandato dos senadores: ${ok} atualizados, ${vazio} sem dados.`);
}

main().catch((e) => { console.error('💥 Erro:', e.message); process.exit(1); });
