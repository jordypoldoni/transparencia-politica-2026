// Coletor do "Em alta" (07/11/2026). Roda a cada poucas horas pelo GitHub Actions
// (.github/workflows/coletar_em_alta.yml). Lê as buscas em alta do Google no Brasil e as
// manchetes do Google Notícias das últimas 24 horas, cruza com os termos de cada matéria da
// lista "Mais importante" e reescreve public.em_alta_votacoes.
// Se as DUAS fontes falharem, não mexe na tabela: o site esconde a seção sozinho quando o
// registro passa de 12 horas (VALIDADE_HORAS), em vez de mostrar ranking velho como se fosse de agora.
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import { lerTendencias, lerManchetes, avaliarEmAlta } from '../src/lib/emAlta.js';

const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const UA = { 'User-Agent': 'Mozilla/5.0 (compatible; LumeCidadao/1.0; +https://www.lumecidadao.com.br)' };

async function baixar(url) {
  for (let i = 0; i < 3; i++) {
    try {
      const r = await fetch(url, { headers: UA });
      if (r.ok) return await r.text();
    } catch { /* tenta de novo */ }
    await sleep(2000 * (i + 1));
  }
  return null;
}

const { data: destaques, error } = await sb.from('destaques_votacoes').select('casa, proposicao_id, termos');
if (error) { console.error('destaques:', error.message); process.exit(1); }

const xmlT = await baixar('https://trends.google.com/trending/rss?geo=BR');
const tendencias = xmlT ? lerTendencias(xmlT) : null;
console.log('Google buscas em alta:', tendencias ? `${tendencias.length} termos` : 'FALHOU');

// Uma consulta de notícias por assunto (o primeiro termo), mesmo que duas casas o compartilhem.
const manchetes = {};
let noticiasOk = false;
for (const termo of new Set((destaques || []).map((d) => (d.termos || [])[0]).filter(Boolean))) {
  const xml = await baixar(`https://news.google.com/rss/search?q=${encodeURIComponent(`"${termo}" when:1d`)}&hl=pt-BR&gl=BR&ceid=BR:pt-419`);
  if (xml) { manchetes[termo] = lerManchetes(xml); noticiasOk = true; }
  await sleep(600);
}
console.log('Google Notícias:', noticiasOk ? `${Object.keys(manchetes).length} assuntos` : 'FALHOU');

if (!tendencias && !noticiasOk) { console.error('As duas fontes falharam: tabela intacta.'); process.exit(1); }

const linhas = avaliarEmAlta({ destaques, tendencias, manchetes: noticiasOk ? manchetes : null });
const agora = new Date().toISOString();
const { error: e1 } = await sb.from('em_alta_votacoes').delete().neq('proposicao_id', '');
if (e1) { console.error('limpar:', e1.message); process.exit(1); }
if (linhas.length) {
  const { error: e2 } = await sb.from('em_alta_votacoes').insert(linhas.map((l) => ({ ...l, atualizado_em: agora })));
  if (e2) { console.error('gravar:', e2.message); process.exit(1); }
}
console.log(`Em alta agora: ${linhas.length}`, linhas.map((l) => `${l.casa}:${l.proposicao_id} [${l.fontes.join('+')}]`).join(' | ') || '(nada)');
