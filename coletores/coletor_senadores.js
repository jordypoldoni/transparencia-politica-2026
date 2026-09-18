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

  const codigosAtuais = new Set();
  let atualizados = 0, inseridos = 0;
  for (const p of lista) {
    const ip = p.IdentificacaoParlamentar || {};
    const codigo = String(ip.CodigoParlamentar || '').trim();
    if (!codigo) continue;
    codigosAtuais.add(codigo);
    const reg = {
      nome_urna: ip.NomeParlamentar || null,
      nome_completo: ip.NomeCompletoParlamentar || ip.NomeParlamentar || null,
      partido_atual: ip.SiglaPartidoParlamentar || null,
      uf_sede: ip.UfParlamentar || null,
      foto_url: ip.UrlFotoParlamentar || null,
      cargo_atual: 'Senador(a)',
      em_exercicio: true,
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

  // ---------------------------------------------------------------------------
  // O QUE FALTAVA, E QUE FEZ O SITE DIZER 89. (18/09/2026)
  //
  // Este coletor inseria e atualizava, mas nunca desativava ninguém. Quando um titular vira
  // ministro e o 1º suplente assume, a fonte passa a listar o suplente — e a nossa tabela
  // ficava com os DOIS, para sempre. Nenhum erro aparecia: a linha velha continua dizendo
  // "Exercício", porque ninguém a atualizou desde que a pessoa saiu. O total foi subindo em
  // silêncio até 90 linhas para 81 cadeiras.
  //
  // A lista do Senado é a única coisa que sabe quem está em exercício HOJE. Quem não está
  // nela vira `em_exercicio = false` — não apagamos a linha: o histórico de votos e gastos
  // daquele mandato continua valendo, e o perfil segue existindo. O que muda é a contagem e
  // a lista de quem está lá agora.
  const { data: todos } = await supabase
    .from('agentes_politicos')
    .select('id, nome_urna, uf_sede, id_externo_api, em_exercicio')
    .ilike('fonte_api', '%senado%');

  const saiu = (todos || []).filter((x) => !codigosAtuais.has(String(x.id_externo_api)));
  if (saiu.length) {
    const { error } = await supabase
      .from('agentes_politicos')
      .update({ em_exercicio: false })
      .in('id', saiu.map((x) => x.id));
    if (error) console.warn(`⚠ não consegui marcar os que saíram: ${error.message}`);
    else {
      console.log(`\n🔻 ${saiu.length} fora da lista de exercício (mantidos no banco, ocultos da lista):`);
      for (const x of saiu) console.log(`   ${x.nome_urna} (${x.uf_sede || '?'})`);
    }
  }

  console.log(`\n✅ Senadores sincronizados: ${atualizados} atualizados, ${inseridos} novos, ${codigosAtuais.size} em exercício.`);
  if (codigosAtuais.size !== 81) {
    // 81 é constitucional: 3 por estado × 26 + 3 do Distrito Federal. Qualquer outro número
    // é sinal de que a fonte mudou de formato ou veio incompleta — e é melhor gritar aqui do
    // que a tela publicar o número errado, que foi exatamente o que aconteceu.
    console.warn(`⚠ ATENÇÃO: a fonte devolveu ${codigosAtuais.size} senadores, e o Brasil tem 81. Conferir antes de confiar na tela.`);
  }
}

main().catch((e) => { console.error('💥 Erro:', e.message); process.exit(1); });
