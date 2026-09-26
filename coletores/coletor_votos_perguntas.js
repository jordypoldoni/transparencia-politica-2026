// Votos da CÂMARA nas votações do questionário de afinidade ("Pra você"). (26/09/2026)
//
// POR QUE EXISTE: as perguntas (src/lib/perguntasAfinidade.js) são votações de 2019 a 2025, e o
// coletor diário da Câmara só olha os últimos 120 dias. Sem isto, deputado federal só seria
// comparado pelo partido. Este coletor busca exatamente as votações listadas no catálogo, nada mais.
//
// Só entram votos de quem está no cadastro do site (deputados em exercício): quem votou em 2021 e
// já saiu da Câmara não tem perfil aqui para receber o voto. É o mesmo mapa do coletor diário.
//
// Também PROCURA as duas votações da Câmara que faltam no catálogo (licenciamento e saneamento) e
// só IMPRIME o que achou: escolher qual delas é "o texto inteiro" é decisão, não automação.
//
// Uso:  node coletores/coletor_votos_perguntas.js            (simulação: lê e conta, não grava)
//       node coletores/coletor_votos_perguntas.js --gravar   (grava votos e metadados)
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import { PERGUNTAS_AFINIDADE } from '../src/lib/perguntasAfinidade.js';

const GRAVAR = process.argv.includes('--gravar');
const API = 'https://dadosabertos.camara.leg.br/api/v2';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function getJson(url, tent = 3) {
  for (let i = 0; i < tent; i++) {
    try {
      const r = await fetch(url, { headers: { Accept: 'application/json' } });
      if (r.status === 429 || r.status >= 500) throw new Error('HTTP ' + r.status);
      if (!r.ok) return null;
      return await r.json();
    } catch (e) {
      if (i === tent - 1) throw e;
      await sleep(700 * (i + 1));
    }
  }
  return null;
}

// Mesmo critério do coletor diário: agente da Câmara, pelo id externo.
async function mapaDeputados() {
  const mapa = new Map();
  for (let de = 0; ; de += 1000) {
    const { data, error } = await supabase.from('agentes_politicos').select('id, id_externo_api, fonte_api').range(de, de + 999);
    if (error) throw error;
    for (const a of data || []) if (a.id_externo_api && (a.fonte_api || '').includes('camara')) mapa.set(String(a.id_externo_api), a.id);
    if (!data || data.length < 1000) break;
  }
  return mapa;
}

async function procurar(rotulo, idProposicao) {
  console.log(`\n🔎 ${rotulo} (proposição ${idProposicao})`);
  const p = (await getJson(`${API}/proposicoes/${idProposicao}`))?.dados;
  if (p) console.log(`   é ${p.siglaTipo} ${p.numero}/${p.ano}: ${String(p.ementa || '').slice(0, 110)}`);
  const vots = ((await getJson(`${API}/proposicoes/${idProposicao}/votacoes`))?.dados || []).filter((v) => v.siglaOrgao === 'PLEN');
  if (!vots.length) console.log('   nenhuma votação de plenário nesta proposição');
  for (const v of vots) console.log(`   ${String(v.data).slice(0, 10)} · ${v.id} · ${String(v.descricao || '').replace(/\s+/g, ' ').slice(0, 140)}`);
}

async function main() {
  console.log(GRAVAR ? '💾 GRAVANDO' : '🧪 SIMULAÇÃO (nada é gravado; use --gravar)');
  const mapa = await mapaDeputados();
  console.log(`👥 ${mapa.size} deputados no cadastro do site`);

  const alvos = PERGUNTAS_AFINIDADE.flatMap((p) => p.votacoes.filter((v) => v.casa === 'camara').map((v) => ({ pergunta: p.id, ...v })));
  for (const alvo of alvos) {
    const det = (await getJson(`${API}/votacoes/${alvo.id}`))?.dados;
    if (!det) { console.log(`\n❌ ${alvo.pergunta}: votação ${alvo.id} não encontrada na Câmara`); continue; }
    const votos = (await getJson(`${API}/votacoes/${alvo.id}/votos`))?.dados || [];
    const linhas = [];
    let fora = 0;
    for (const voto of votos) {
      const agenteId = mapa.get(String(voto.deputado_?.id));
      if (!agenteId) { fora++; continue; }
      linhas.push({
        agente_id: agenteId,
        voto_tipo: voto.tipoVoto || null,
        data_voto: det.dataHoraRegistro || det.data || null,
        ementa_resumida_voto: det.descricao || null,
        votacao_id_externa: alvo.id,
        descricao_votacao: det.descricao || null,
        aprovacao: typeof det.aprovacao === 'number' ? det.aprovacao : null,
      });
    }
    const conta = (t) => linhas.filter((l) => (l.voto_tipo || '').toLowerCase() === t).length;
    console.log(`\n■ ${alvo.pergunta} · ${alvo.id} · ${String(det.dataHoraRegistro || det.data).slice(0, 10)}`);
    console.log(`   ${String(det.descricao || '').replace(/\s+/g, ' ').slice(0, 150)}`);
    console.log(`   ${votos.length} votos na fonte · ${linhas.length} de deputados do site (Sim ${conta('sim')}, Não ${conta('não')}) · ${fora} de quem não está no cadastro`);

    if (GRAVAR && linhas.length) {
      const lei = (det.proposicoesAfetadas || [])[0] || (det.objetosPossiveis || [])[0];
      const meta = {
        votacao_id_externa: alvo.id,
        descricao: det.descricao || null,
        aprovacao: typeof det.aprovacao === 'number' ? det.aprovacao : null,
        data_voto: det.dataHoraRegistro || det.data || null,
        proposicao_id: lei ? String(lei.id) : null,
        proposicao_titulo: lei?.siglaTipo ? `${lei.siglaTipo} ${lei.numero}/${lei.ano}` : null,
        ementa: lei?.ementa || null,
        resultado: (det.efeitosRegistrados || [])[0]?.descResultado || null,
      };
      const { error: e1 } = await supabase.from('votacoes').upsert(meta, { onConflict: 'votacao_id_externa' });
      if (e1) console.warn(`   ⚠ metadados: ${e1.message}`);
      const { error: e2 } = await supabase.from('votos_parlamentares').upsert(linhas, { onConflict: 'votacao_id_externa,agente_id' });
      if (e2) throw new Error(`votos de ${alvo.id}: ${e2.message}`);
      console.log(`   ✅ gravados`);
    }
    await sleep(300);
  }

  // As duas que faltam no catálogo: só imprime.
  await procurar('Licenciamento ambiental, PL 3729/2004 na Câmara', 257161);
  await procurar('Marco do saneamento, PL 4162/2019', 2213200);
}

main().catch((e) => { console.error('💥', e.message); process.exit(1); });
