// Enriquece o CONTEXTO das votações do SENADO (situação, autor, ementa real, assuntos)
// a partir da API de Processo Legislativo do Senado. Traz o Senado ao mesmo nível da Câmara.
// Roda LOCAL (o sandbox não alcança o Senado): node coletores/backfill_votacoes_senado.js
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const API = 'https://legis.senado.leg.br/dadosabertos';
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

// "PEC 66/2023 (fase 2)" → { sigla:'PEC', numero:'66', ano:'2023' }
function parseTitulo(titulo) {
  const limpo = String(titulo || '').replace(/\s*\(.*\)\s*$/, '').trim();
  const m = limpo.match(/^([A-Za-zÇç]+)\s+(\d+)\/(\d{4})$/);
  return m ? { sigla: m[1].toUpperCase(), numero: m[2], ano: m[3] } : null;
}

// Primeiro autor + "e outros" quando há mais de um.
function primeiroAutor(autoria) {
  if (!autoria) return null;
  const m = autoria.match(/^[^)]+\)/);
  const primeiro = (m ? m[0] : autoria.split(',')[0]).trim();
  const varios = (autoria.match(/\)/g) || []).length > 1 || (!m && autoria.includes(','));
  return primeiro ? (varios ? `${primeiro} e outros` : primeiro) : null;
}

// "  ALTERAÇÃO ,  CONSTITUIÇÃO FEDERAL , EDUCAÇÃO ." → "Alteração, Constituição Federal, Educação"
function limparIndexacao(idx) {
  if (!idx) return null;
  const termos = idx.split(',').map((s) => s.replace(/\.$/, '').trim().toLowerCase()).filter(Boolean)
    .map((s) => s.split(/\s+/).map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w)).join(' '));
  const uniq = [...new Set(termos)];
  return uniq.length ? uniq.join(', ') : null;
}

async function main() {
  const { data } = await supabase.from('votacoes')
    .select('votacao_id_externa, proposicao_titulo')
    .not('proposicao_titulo', 'is', null);
  const senado = (data || []).filter((v) => !/^\d+-\d+$/.test(v.votacao_id_externa || ''));

  // Agrupa por título → lista de ids (para atualizar só as linhas do Senado, sem tocar na Câmara).
  const porTitulo = new Map();
  for (const v of senado) {
    if (!porTitulo.has(v.proposicao_titulo)) porTitulo.set(v.proposicao_titulo, []);
    porTitulo.get(v.proposicao_titulo).push(v.votacao_id_externa);
  }
  console.log(`🏛️  ${porTitulo.size} matérias do Senado a enriquecer (${senado.length} votações).`);

  let ok = 0, semDados = 0, comKw = 0;
  for (const [titulo, ids] of porTitulo) {
    const p = parseTitulo(titulo);
    if (!p) { semDados++; console.warn(`  ? título não parseável: ${titulo}`); continue; }
    try {
      const lista = await getJson(`${API}/processo?sigla=${encodeURIComponent(p.sigla)}&numero=${p.numero}&ano=${p.ano}`);
      const proc = Array.isArray(lista) ? lista[0] : null;
      if (!proc) { semDados++; console.log(`  ∅ ${titulo} — não encontrado no Senado`); await sleep(200); continue; }

      const upd = {
        situacao: proc.situacaoAtual || null,
        autor_nome: primeiroAutor(proc.autoria),
        url_inteiro_teor: proc.urlDocumento || null,
      };
      if (proc.ementa && proc.ementa.trim()) upd.ementa = proc.ementa.trim();

      // Detalhe → indexação (assuntos/keywords)
      if (proc.id) {
        try {
          const det = await getJson(`${API}/processo/${proc.id}`);
          const d = Array.isArray(det) ? det[0] : det;
          const kw = limparIndexacao(d && d.documento && d.documento.indexacao);
          if (kw) { upd.keywords = kw; comKw++; }
        } catch (e) { /* keywords é best-effort */ }
      }

      const { error } = await supabase.from('votacoes').update(upd).in('votacao_id_externa', ids);
      if (error) { console.warn(`  ⚠️  ${titulo}: ${error.message}`); }
      else { ok++; console.log(`  ✓ ${titulo} — ${upd.situacao || '?'} · ${ids.length} votações${upd.keywords ? ' · assuntos' : ''}`); }
    } catch (e) {
      semDados++;
      console.warn(`  ⚠️  ${titulo}: ${e.message}`);
    }
    await sleep(220);
  }
  console.log(`✅ ${ok} matérias enriquecidas (${comKw} com assuntos), ${semDados} sem dados.`);
}

main().catch((e) => { console.error(e); process.exit(1); });
