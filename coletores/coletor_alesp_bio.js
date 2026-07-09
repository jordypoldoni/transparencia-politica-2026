// coletor_alesp_bio.js — biografia dos deputados ESTADUAIS de SP (ALESP).
// Fonte: API interna do portal da ALESP (descoberta inspecionando a SPA):
//   https://legis-api-portal.pub.al.sp.gov.br/parlamentar-portal/detalhes/{matricula}
// Traz: gabinete (sala/andar/ramal), e-mail, situação, mandatos/legislaturas,
// histórico partidário (filiações), áreas de atuação, base eleitoral e a biografia
// em prosa escrita pelo próprio gabinete (guardada à parte, exibida com ressalva na UI).
//
// Rodar LOCAL (o sandbox não alcança a ALESP). Precisa de .env com SUPABASE_URL e
// SUPABASE_SERVICE_ROLE_KEY. Idempotente (só UPDATE por id). Só toca linhas 'alesp'.
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SUPABASE_KEY) { console.error('❌ Faltam credenciais Supabase (.env).'); process.exit(1); }
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const API = 'https://legis-api-portal.pub.al.sp.gov.br/parlamentar-portal/detalhes';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const cap = (s) => (s ? String(s).trim() : null);

async function getJSON(url, tentativas = 4) {
  for (let i = 0; i < tentativas; i++) {
    try {
      const r = await fetch(url, { headers: { Accept: 'application/json' } });
      if (r.ok) return await r.json();
      if (r.status === 429 || r.status >= 500) { await sleep(800 * Math.pow(2, i)); continue; }
      return null;
    } catch { await sleep(800 * Math.pow(2, i)); }
  }
  return null;
}

// HTML → texto legível: parágrafos viram quebras, tags somem, entidades básicas resolvidas.
function htmlParaTexto(html) {
  if (!html) return null;
  let s = String(html)
    .replace(/<\/(p|div|br|li)>/gi, '\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, '<').replace(/&gt;/gi, '>')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  return s || null;
}

// "Esportes;\nUrbanização; \nSaúde;" → ["Esportes","Urbanização","Saúde"]
function listaTemas(txt) {
  if (!txt) return [];
  return String(txt).split(/[;\n]+/).map((x) => x.trim()).filter(Boolean);
}

function mapear(d) {
  if (!d) return null;
  const bio = d.biografia || {};

  // Mandatos/legislaturas: nº total e a legislatura atual (maior idLegislatura).
  const mandatos = Array.isArray(d.listaMandatos) ? d.listaMandatos.slice() : [];
  mandatos.sort((a, b) => (a.idLegislatura || 0) - (b.idLegislatura || 0));
  const primeiro = mandatos[0];
  const atual = mandatos[mandatos.length - 1];
  const desdeAno = primeiro?.dtInicio ? String(primeiro.dtInicio).slice(0, 4) : null;
  const mandato = mandatos.length
    ? { numero_mandatos: mandatos.length, legislatura: cap(atual?.legislatura), desde: desdeAno }
    : null;

  // Histórico partidário (mais recente primeiro).
  const filiacoes = (Array.isArray(d.listaFiliacoes) ? d.listaFiliacoes : [])
    .map((f) => ({
      sigla: cap(f?.partido?.txSigla),
      nome: cap(f?.partido?.txNome),
      inicio: f?.dtInicio || null,
      fim: f?.dtFim || null,
    }))
    .filter((f) => f.sigla)
    .sort((a, b) => String(b.inicio || '').localeCompare(String(a.inicio || '')));

  // Redes sociais: campo às vezes nulo; aceita array de strings ou de objetos {url}.
  let redes = [];
  if (Array.isArray(bio.redesSociais)) {
    redes = bio.redesSociais.map((r) => cap(typeof r === 'string' ? r : (r?.url || r?.txUrl))).filter(Boolean);
  }

  const contato = {
    sala: cap(bio.nuSala), andar: cap(bio.nuAndar),
    telefone: cap(bio.nuRamal), email: cap(bio.txEmail),
  };
  const temContato = Object.values(contato).some(Boolean);

  return {
    situacao: d.isEmExercicio ? 'Exercício' : 'Fora de exercício',
    email_oficial: cap(bio.txEmail),
    website: cap(bio.txSite),
    redes_sociais: redes,
    contato: temContato ? contato : null,
    mandato,
    filiacoes,
    areas_atuacao: listaTemas(bio.txAreaAtuacao),
    base_eleitoral: cap((bio.txBaseEleitoral || '').replace(/;+\s*$/, '')),
    biografia_texto: htmlParaTexto(bio.txHistorico),
    bio_atualizada_em: new Date().toISOString(),
  };
}

async function main() {
  console.log('🚀 Biografia ALESP (deputados estaduais de SP)…');
  const { data: deps, error } = await supabase
    .from('agentes_politicos')
    .select('id, id_externo_api, nome_urna')
    .ilike('fonte_api', '%alesp%')
    .not('id_externo_api', 'is', null);
  if (error) { console.error(error.message); process.exit(1); }
  console.log(`📥 ${deps.length} deputados estaduais.`);

  let ok = 0, vazio = 0;
  for (const dep of deps) {
    const mat = String(dep.id_externo_api).split('-').pop();
    const d = await getJSON(`${API}/${mat}`);
    const reg = mapear(d);
    if (!reg) { vazio++; console.log(`  ∅ ${dep.nome_urna} — sem dados`); await sleep(150); continue; }
    const { error: upErr } = await supabase.from('agentes_politicos').update(reg).eq('id', dep.id);
    if (upErr) console.warn(`  ⚠️  ${dep.nome_urna}: ${upErr.message}`);
    else { ok++; if (ok % 20 === 0) console.log(`  … ${ok} atualizados`); }
    await sleep(150);
  }
  console.log(`\n✅ Biografia ALESP: ${ok} atualizados, ${vazio} sem dados.`);
}

main().catch((e) => { console.error('💥 Erro:', e.message); process.exit(1); });
