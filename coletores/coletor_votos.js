// Coletor de votos nominais da Câmara dos Deputados.
// Roda via `node coletores/coletor_votos.js` (local) ou GitHub Actions (agendado).
// Idempotente: upsert com chave (votacao_id_externa, agente_id).
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const DIAS = parseInt(process.env.DIAS || '120', 10);        // janela para trás
const MAX_PAGINAS = parseInt(process.env.MAX_PAGINAS || '10', 10);

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ Faltam SUPABASE_URL e/ou SUPABASE_SERVICE_ROLE_KEY no ambiente.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const API = 'https://dadosabertos.camara.leg.br/api/v2';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
// Votação nominal tem "Sim: 154; Não: 245..." na descrição.
const EH_NOMINAL = /sim:\s*\d+/i;

async function getJson(url, tentativas = 4) {
  for (let t = 0; t < tentativas; t++) {
    const res = await fetch(url, { headers: { Accept: 'application/json' } });
    if (res.ok) return res.json();
    // 5xx = falha temporária do servidor — espera e tenta de novo
    if (res.status >= 500 && t < tentativas - 1) {
      const espera = (t + 1) * 15000; // 15s, 30s, 45s
      console.warn(`⚠️  HTTP ${res.status} (tentativa ${t + 1}/${tentativas}) — aguardando ${espera / 1000}s...`);
      await sleep(espera);
      continue;
    }
    throw new Error(`HTTP ${res.status} em ${url}`);
  }
}

// A API da Câmara rejeita intervalos largos; quebramos em janelas de ~30 dias.
function gerarJanelas(dias, tamanho = 30) {
  const fmt = (d) => d.toISOString().slice(0, 10);
  const janelas = [];
  let fim = new Date();
  let restante = dias;
  while (restante > 0) {
    const passo = Math.min(tamanho, restante);
    const ini = new Date(fim);
    ini.setDate(ini.getDate() - passo + 1);
    janelas.push({ dataInicio: fmt(ini), dataFim: fmt(fim) });
    fim = new Date(ini);
    fim.setDate(fim.getDate() - 1);
    restante -= passo;
  }
  return janelas;
}

async function main() {
  console.log('🚀 Coletor de votos iniciado.');

  // 1) Mapa deputado (id externo da Câmara) -> id do agente
  const { data: agentes, error: errAg } = await supabase
    .from('agentes_politicos')
    .select('id, id_externo_api, fonte_api');
  if (errAg) throw errAg;
  const mapa = new Map();
  for (const a of agentes) {
    if (a.id_externo_api && (a.fonte_api || '').includes('camara')) {
      mapa.set(String(a.id_externo_api), a.id);
    }
  }
  console.log(`👥 ${mapa.size} deputados mapeados.`);

  // 2) Coleta votações por janelas de 30 dias, paginando, e separa as nominais
  const janelas = gerarJanelas(DIAS, 30);
  console.log(`📅 ${janelas.length} janelas de até 30 dias (${DIAS} dias no total).`);
  const nominais = [];
  for (const j of janelas) {
    let url = `${API}/votacoes?dataInicio=${j.dataInicio}&dataFim=${j.dataFim}&ordem=DESC&ordenarPor=dataHoraRegistro&itens=100`;
    for (let pagina = 0; pagina < MAX_PAGINAS && url; pagina++) {
      const r = await getJson(url);
      for (const v of r.dados || []) {
        if (EH_NOMINAL.test(v.descricao || '')) nominais.push(v);
      }
      url = (r.links || []).find((l) => l.rel === 'next')?.href || null;
      await sleep(200);
    }
  }
  console.log(`🗳️  ${nominais.length} votações nominais encontradas.`);

  // 3) Para cada votação nominal: votos individuais + enriquecimento (assunto/autor)
  const linhas = [];
  const metas = [];
  for (const v of nominais) {
    let votos = [];
    try {
      const r = await getJson(`${API}/votacoes/${v.id}/votos`);
      votos = r.dados || [];
    } catch (e) {
      console.warn(`  ⚠️  votos de ${v.id} falharam: ${e.message}`);
    }
    for (const voto of votos) {
      const dep = voto.deputado_ || {};
      const agenteId = mapa.get(String(dep.id));
      if (!agenteId) continue;
      linhas.push({
        agente_id: agenteId,
        voto_tipo: voto.tipoVoto || null,
        data_voto: v.dataHoraRegistro || v.data || null,
        ementa_resumida_voto: v.descricao || null,
        votacao_id_externa: v.id,
        descricao_votacao: v.descricao || null,
        aprovacao: typeof v.aprovacao === 'number' ? v.aprovacao : null,
      });
    }

    // Enriquecimento via detalhe da votação: assunto (a lei), resultado em texto e autor
    const meta = {
      votacao_id_externa: v.id,
      descricao: v.descricao || null,
      aprovacao: typeof v.aprovacao === 'number' ? v.aprovacao : null,
      data_voto: v.dataHoraRegistro || v.data || null,
      proposicao_id: null, proposicao_titulo: null,
      ementa: null, descricao_tipo: null, keywords: null,
      resultado: null, autor_nome: null, autor_tipo: null,
    };
    try {
      const det = (await getJson(`${API}/votacoes/${v.id}`)).dados || {};
      const lei = (det.proposicoesAfetadas || [])[0];
      const obj = (det.objetosPossiveis || [])[0];
      const efeito = (det.efeitosRegistrados || [])[0];
      const principal = lei || obj; // a lei afetada é o "assunto" real
      if (principal) {
        meta.proposicao_id = String(principal.id);
        meta.ementa = principal.ementa || null;
        if (principal.siglaTipo) meta.proposicao_titulo = `${principal.siglaTipo} ${principal.numero}/${principal.ano}`;
      }
      meta.resultado = efeito?.descResultado || null;
      // Autor: quem levou à pauta (objeto votado); senão, autor da lei
      const autorAlvo = obj?.id || lei?.id;
      if (autorAlvo) {
        try {
          const a0 = ((await getJson(`${API}/proposicoes/${autorAlvo}/autores`)).dados || [])[0];
          if (a0) { meta.autor_nome = a0.nome || null; meta.autor_tipo = a0.tipo || null; }
        } catch (e) {}
      }
    } catch (e) {}
    metas.push(meta);
    await sleep(220);
  }
  console.log(`📊 ${linhas.length} votos · ${metas.length} votações com metadados.`);

  // Salva metadados das votações (assunto/autor) — idempotente
  for (let i = 0; i < metas.length; i += 200) {
    const { error } = await supabase.from('votacoes').upsert(metas.slice(i, i + 200), { onConflict: 'votacao_id_externa' });
    if (error) console.warn('votacoes upsert:', error.message);
  }

  if (linhas.length === 0) {
    console.log('Nenhum voto nominal novo. Fim.');
    return;
  }

  // 4) Upsert idempotente em lotes
  const TAM = 500;
  let gravados = 0;
  for (let i = 0; i < linhas.length; i += TAM) {
    const lote = linhas.slice(i, i + TAM);
    const { error } = await supabase
      .from('votos_parlamentares')
      .upsert(lote, { onConflict: 'votacao_id_externa,agente_id' });
    if (error) throw error;
    gravados += lote.length;
  }
  console.log(`✅ ${gravados} votos gravados/atualizados.`);
}

main().catch((e) => {
  console.error('💥 Erro no coletor:', e.message);
  process.exit(1);
});
