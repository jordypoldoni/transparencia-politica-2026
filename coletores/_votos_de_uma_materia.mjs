// Coleta os votos NOMINAIS da Câmara de UMA proposição (qualquer data) e grava em `votacoes` + `votos_parlamentares`.
// Uso: node coletores/_votos_de_uma_materia.mjs <idProposicao>   (ex.: 2579832 = PL 5582/2025)
// Idempotente (upsert). Serve para votações antigas, fora da janela de 120 dias do coletor_votos.js.
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
const id = process.argv[2];
if (!id) { console.error('Informe o id da proposição.'); process.exit(1); }
const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const API = 'https://dadosabertos.camara.leg.br/api/v2';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function g(u) {
  for (let i = 0; i < 4; i++) {
    const r = await fetch(u, { headers: { Accept: 'application/json' } });
    if (r.ok) return r.json();
    await sleep(2000 * (i + 1));
  }
  throw new Error('falhou ' + u);
}
const { data: ags } = await sb.from('agentes_politicos').select('id, id_externo_api, fonte_api');
const mapa = new Map(ags.filter((a) => a.id_externo_api && (a.fonte_api || '').includes('camara')).map((a) => [String(a.id_externo_api), a.id]));
const prop = (await g(`${API}/proposicoes/${id}`)).dados;
const titulo = `${prop.siglaTipo} ${prop.numero}/${prop.ano}`;
const a0 = ((await g(`${API}/proposicoes/${id}/autores`)).dados || [])[0] || {};
const vs = (await g(`${API}/proposicoes/${id}/votacoes?ordem=ASC&ordenarPor=dataHoraRegistro`)).dados;
const nom = vs.filter((v) => /sim:\s*\d+/i.test(v.descricao || ''));
console.log(titulo, '|', vs.length, 'votações,', nom.length, 'nominais');
let totalVotos = 0;
for (const v of nom) {
  const det = (await g(`${API}/votacoes/${v.id}`)).dados;
  const votos = (await g(`${API}/votacoes/${v.id}/votos`)).dados || [];
  const data = det.dataHoraRegistro || v.data;
  const aprov = typeof v.aprovacao === 'number' ? v.aprovacao : null;
  const { error: e1 } = await sb.from('votacoes').upsert({
    votacao_id_externa: v.id, descricao: v.descricao, aprovacao: aprov, data_voto: data,
    proposicao_id: String(prop.id), proposicao_titulo: titulo, ementa: prop.ementa || null,
    resultado: (det.efeitosRegistrados || [])[0]?.descResultado || null,
    autor_nome: a0.nome || null, autor_tipo: a0.tipo || null,
  }, { onConflict: 'votacao_id_externa' });
  if (e1) throw e1;
  const linhas = votos.map((x) => ({ agente_id: mapa.get(String(x.deputado_?.id)), voto_tipo: x.tipoVoto || null, data_voto: data,
    ementa_resumida_voto: v.descricao, votacao_id_externa: v.id, descricao_votacao: v.descricao, aprovacao: aprov })).filter((l) => l.agente_id);
  for (let i = 0; i < linhas.length; i += 500) {
    const { error } = await sb.from('votos_parlamentares').upsert(linhas.slice(i, i + 500), { onConflict: 'votacao_id_externa,agente_id' });
    if (error) throw error;
  }
  totalVotos += linhas.length;
  console.log(v.id, linhas.length, 'votos');
  await sleep(250);
}
console.log('OK', nom.length, 'votações,', totalVotos, 'votos');
