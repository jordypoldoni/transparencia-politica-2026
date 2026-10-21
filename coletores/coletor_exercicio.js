// coletor_exercicio.js: períodos de exercício dos parlamentares (Câmara e Senado) em exercicio_parlamentar.
// (21/10/2026)
//
// POR QUE EXISTE: o ranking de verba justo divide o gasto pelos meses EM EXERCÍCIO, não pelos meses do
// calendário. Sem data de posse, licença e retorno não dá para saber quantos meses cada um trabalhou
// (suplentes que assumiram no meio do ano, licenciados, titulares que voltaram). A regra do mês fica na
// função SQL meses_em_exercicio: o mês conta se houve exercício em 15 dias ou mais.
//
// FONTES:
//   Câmara: /deputados/{id}/historico (eventos com data, situação e condição eleitoral).
//   Senado: /senador/{cod}/mandatos, bloco Mandato/Exercicios/Exercicio (já em intervalos).
//
// TRAVAS (mesmo padrão dos coletores de gasto):
//   1. NÃO APAGA NO VAZIO: se a fonte falha ou devolve vazio para um parlamentar, o que já está no banco fica.
//   2. SUBSTITUIÇÃO POR PARLAMENTAR: o delete e o insert de cada um acontecem juntos.
//   3. Quem não responde é contado e dito em voz alta no fim (nunca em silêncio).
//
// Uso:  node coletores/coletor_exercicio.js              (Câmara e Senado)
//       node coletores/coletor_exercicio.js camara       (só Câmara)
//       node coletores/coletor_exercicio.js senado       (só Senado)
//       node coletores/coletor_exercicio.js --dry-run    (não escreve nada)
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import { XMLParser } from 'fast-xml-parser';
import { intervalosCamara, intervalosSenado } from './exercicio_intervalos.js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const args = process.argv.slice(2);
const DRY = args.includes('--dry-run');
const SO_CAMARA = args.includes('camara');
const SO_SENADO = args.includes('senado');
const FAZ_CAMARA = !SO_SENADO;
const FAZ_SENADO = !SO_CAMARA;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ Faltam SUPABASE_URL e/ou SUPABASE_SERVICE_ROLE_KEY.');
  process.exit(1);
}
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const CAMARA = 'https://dadosabertos.camara.leg.br/api/v2';
const SENADO = 'https://legis.senado.leg.br/dadosabertos';
const xml = new XMLParser({ ignoreAttributes: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const arr = (x) => (x == null ? [] : Array.isArray(x) ? x : [x]);

// null = falhou (rede, 5xx, 404). Lista vazia vem como [] e é tratada à parte.
async function buscar(url, tipo, tentativas = 4) {
  for (let i = 0; i < tentativas; i++) {
    try {
      const r = await fetch(url, { headers: { Accept: tipo === 'json' ? 'application/json' : 'application/xml' } });
      if (r.ok) return tipo === 'json' ? await r.json() : xml.parse(await r.text());
      if (r.status === 429 || r.status >= 500) { await sleep(800 * Math.pow(2, i)); continue; }
      return null;
    } catch { await sleep(800 * Math.pow(2, i)); }
  }
  return null;
}

const idNumerico = (v) => {
  const m = String(v || '').trim().match(/(\d+)\s*$/);
  return m ? m[1] : null;
};

async function gravar(agente, casa, intervalos, resumo) {
  if (!intervalos.length) { resumo.vazios.push(agente.nome_urna); return; }
  if (DRY) { resumo.gravados++; resumo.linhas += intervalos.length; return; }
  const linhas = intervalos.map((i) => ({ ...i, agente_id: agente.id, casa }));
  const { error: errDel } = await supabase.from('exercicio_parlamentar').delete().eq('agente_id', agente.id);
  if (errDel) { resumo.erros.push(`${agente.nome_urna} (delete): ${errDel.message}`); return; }
  const { error: errIns } = await supabase.from('exercicio_parlamentar').insert(linhas);
  if (errIns) { resumo.erros.push(`${agente.nome_urna} (insert): ${errIns.message}`); return; }
  resumo.gravados++; resumo.linhas += linhas.length;
}

function relatorio(titulo, total, resumo) {
  console.log(`\n✅ ${titulo}: ${resumo.gravados}/${total} gravados, ${resumo.linhas} intervalos.`);
  if (resumo.falhas.length) console.warn(`⚠️  ${resumo.falhas.length} sem resposta da fonte (o que já havia no banco foi mantido): ${resumo.falhas.slice(0, 20).join(', ')}${resumo.falhas.length > 20 ? ' …' : ''}`);
  if (resumo.vazios.length) console.warn(`⚠️  ${resumo.vazios.length} com histórico vazio (nada foi apagado): ${resumo.vazios.slice(0, 20).join(', ')}${resumo.vazios.length > 20 ? ' …' : ''}`);
  if (resumo.erros.length) console.warn(`⚠️  ${resumo.erros.length} erros ao gravar:\n   ${resumo.erros.slice(0, 20).join('\n   ')}`);
}

async function camara() {
  const { data: deps, error } = await supabase.from('agentes_politicos')
    .select('id, id_externo_api, nome_urna').ilike('cargo_atual', '%deputad%federal%');
  if (error) throw error;
  const lista = (deps || []).map((a) => ({ ...a, cod: idNumerico(a.id_externo_api) })).filter((a) => a.cod);
  const semId = (deps || []).length - lista.length;
  console.log(`🏛️  Câmara: ${lista.length} deputados com id${semId ? ` (${semId} sem id externo, de fora)` : ''}.`);
  const resumo = { gravados: 0, linhas: 0, falhas: [], vazios: [], erros: [] };
  let n = 0;
  for (const a of lista) {
    const j = await buscar(`${CAMARA}/deputados/${a.cod}/historico`, 'json');
    if (!j) resumo.falhas.push(a.nome_urna);
    else await gravar(a, 'Câmara', intervalosCamara(j.dados), resumo);
    if (++n % 100 === 0) console.log(`  …${n}/${lista.length}`);
    await sleep(120);
  }
  relatorio('Câmara', lista.length, resumo);
  return resumo;
}

async function senado() {
  const { data: sens, error } = await supabase.from('agentes_politicos')
    .select('id, id_externo_api, nome_urna').or('cargo_atual.ilike.senador%,fonte_api.ilike.%senado%');
  if (error) throw error;
  const lista = (sens || []).map((a) => ({ ...a, cod: idNumerico(a.id_externo_api) })).filter((a) => a.cod);
  const semId = (sens || []).length - lista.length;
  console.log(`🏛️  Senado: ${lista.length} senadores com código${semId ? ` (${semId} sem código, de fora)` : ''}.`);
  const resumo = { gravados: 0, linhas: 0, falhas: [], vazios: [], erros: [] };
  let n = 0;
  for (const a of lista) {
    const j = await buscar(`${SENADO}/senador/${a.cod}/mandatos`, 'xml');
    if (!j) resumo.falhas.push(a.nome_urna);
    else {
      const mandatos = arr(j?.MandatoParlamentar?.Parlamentar?.Mandatos?.Mandato);
      await gravar(a, 'Senado', intervalosSenado(mandatos), resumo);
    }
    if (++n % 25 === 0) console.log(`  …${n}/${lista.length}`);
    await sleep(150);
  }
  relatorio('Senado', lista.length, resumo);
  return resumo;
}

async function main() {
  console.log(`🚀 Exercício parlamentar${DRY ? ' (SIMULAÇÃO, nada será gravado)' : ''}.`);
  const r1 = FAZ_CAMARA ? await camara() : null;
  const r2 = FAZ_SENADO ? await senado() : null;
  // Câmara com quase tudo falhando = fonte fora do ar: falha barulhenta para o Actions avisar.
  for (const [nome, r] of [['Câmara', r1], ['Senado', r2]]) {
    if (r && r.gravados === 0) {
      const msg = `nenhum parlamentar do(a) ${nome} foi gravado. Fonte fora do ar ou formato mudou.`;
      console.error(`\n🛑 ${msg}`);
      if (process.env.GITHUB_ACTIONS) console.log(`::warning title=exercicio nao coletado::${msg}`);
      process.exit(1);
    }
  }
}

main().catch((e) => { console.error('💥 Erro:', e.message); process.exit(1); });
