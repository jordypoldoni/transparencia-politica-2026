// Sincroniza os senadores em exercício a partir da API oficial do Senado (XML).
// Corrige nome_urna para o NOME PARLAMENTAR (curto), mantém a lista atual,
// e assim a CEAPS casa por nome exato. Idempotente (update por código, insert se novo).
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import { XMLParser } from 'fast-xml-parser';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SUPABASE_KEY) { console.error('❌ Faltam credenciais Supabase.'); process.exit(1); }
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const API = 'https://legis.senado.leg.br/dadosabertos/senador/lista/atual';
const slugify = (s) => (s || '')
  .normalize('NFD').replace(/[̀-ͯ]/g, '')
  .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

async function main() {
  console.log('🚀 Sincronizando senadores em exercício…');

  const xml = await (await fetch(API, { headers: { Accept: 'application/xml' } })).text();
  const parser = new XMLParser({ ignoreAttributes: true });
  const data = parser.parse(xml);

  let lista = data?.ListaParlamentarEmExercicio?.Parlamentares?.Parlamentar || [];
  if (!Array.isArray(lista)) lista = [lista];
  console.log(`📥 ${lista.length} senadores na lista oficial.`);
  if (lista.length === 0) { console.error('Nada retornado — estrutura do XML pode ter mudado.'); return; }

  // Senadores já existentes, indexados por código
  const { data: existentes } = await supabase
    .from('agentes_politicos').select('id, id_externo_api, slug').ilike('fonte_api', '%senado%');
  const mapa = new Map((existentes || []).map((e) => [String(e.id_externo_api), e]));

  let atualizados = 0, inseridos = 0;
  for (const p of lista) {
    const ip = p.IdentificacaoParlamentar || {};
    const codigo = String(ip.CodigoParlamentar || '').trim();
    if (!codigo) continue;
    const reg = {
      nome_urna: ip.NomeParlamentar || null,
      nome_completo: ip.NomeCompletoParlamentar || ip.NomeParlamentar || null,
      partido_atual: ip.SiglaPartidoParlamentar || null,
      uf_sede: ip.UfParlamentar || null,
      foto_url: ip.UrlFotoParlamentar || null,
      cargo_atual: 'Senador(a)',
      id_externo_api: codigo,
      fonte_api: ip.UrlPaginaParlamentar || `https://www25.senado.leg.br/web/senadores (senado:${codigo})`,
    };
    const ex = mapa.get(codigo);
    if (ex) {
      await supabase.from('agentes_politicos').update(reg).eq('id', ex.id);
      atualizados++;
    } else {
      reg.slug = `${slugify(reg.nome_urna)}-${(reg.uf_sede || 'br').toLowerCase()}-s${codigo}`;
      const { error } = await supabase.from('agentes_politicos').insert(reg);
      if (error) { console.warn(`insert ${reg.nome_urna}: ${error.message}`); continue; }
      inseridos++;
    }
  }

  console.log(`✅ Senadores sincronizados: ${atualizados} atualizados, ${inseridos} novos.`);
}

main().catch((e) => { console.error('💥 Erro:', e.message); process.exit(1); });
