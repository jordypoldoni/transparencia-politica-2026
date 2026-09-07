// Coletor de gastos da cota parlamentar (Câmara) — fonte da verdade completa do ano.
// Idempotente: para cada deputado, apaga o ano e reinsere (sempre reflete o oficial).
//
// ⚠️ TRAVAS DE SEGURANCA (07/09/2026) — por que existem:
// O endpoint /deputados/{id}/despesas da Camara passou a devolver LISTA VAZIA para todos os
// anos (bug aberto deles: issues 382 e 383 do repo CamaraDosDeputados/dados-abertos). Como este
// coletor apagava o ano ANTES de inserir, rodar com a API quebrada APAGAVA os dados bons e nao
// repunha nada. Foi o que zerou 2026. Se tivesse rodado com ANO=2025 teria apagado 215 mil
// linhas. As tres travas abaixo impedem que isso volte a acontecer:
//   1. SONDA: testa alguns deputados antes de escrever qualquer coisa. Se TODOS vierem vazios,
//      aborta sem apagar nada (API fora do ar nao pode virar exclusao em massa).
//   2. NAO APAGA NO VAZIO: um deputado sem despesa retornada tem o ano PRESERVADO, em vez de
//      apagado. Perde-se o caso raro de estorno total; ganha-se nao perder o historico.
//   3. TETO DE LINHAS: aborta se a execucao passar de MAX_LINHAS lancamentos, para nao estourar
//      o limite de 500 MB do plano free do Supabase por um retorno anomalo da API.
// A protecao contra DUPLICATA continua sendo o delete+insert por (agente, ano), agora executado
// apenas quando ha dados novos para colocar no lugar.
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ANO = parseInt(process.argv[2] || process.env.ANO || '2026', 10); // uso: node coletor_gastos.js 2025
const SONDA = parseInt(process.env.SONDA || '8', 10);            // deputados testados antes de escrever
const MAX_LINHAS = parseInt(process.env.MAX_LINHAS || '400000', 10); // teto de lancamentos por execucao

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ Faltam SUPABASE_URL e/ou SUPABASE_SERVICE_ROLE_KEY.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const API = 'https://dadosabertos.camara.leg.br/api/v2';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Normaliza o "tipoDespesa" cru da Câmara em categorias de cidadão
function categoria(tipo) {
  const t = (tipo || '').toLowerCase();
  if (t.includes('combust') || t.includes('veícul') || t.includes('veicul') || t.includes('táxi') || t.includes('taxi') || t.includes('passagem') === false && t.includes('locomo')) return 'Transporte e Mobilidade';
  if (t.includes('passagem') || t.includes('hospedag') || t.includes('aérea') || t.includes('aerea')) return 'Viagens e Estadias';
  if (t.includes('aliment')) return 'Alimentação';
  if (t.includes('divulga') || t.includes('publicid')) return 'Publicidade e Marketing';
  if (t.includes('escritório') || t.includes('escritorio') || t.includes('telefon') || t.includes('internet') || t.includes('postal') || t.includes('correio')) return 'Escritório e Apoio';
  if (t.includes('consultor') || t.includes('pesquisa') || t.includes('técnic') || t.includes('tecnic')) return 'Serviços Técnicos';
  if (t.includes('seguran')) return 'Segurança';
  return 'Outros Operacionais';
}

async function getJson(url, tentativas = 4) {
  for (let t = 0; t < tentativas; t++) {
    const res = await fetch(url, { headers: { Accept: 'application/json' } });
    if (res.ok) return res.json();
    if (res.status >= 500 && t < tentativas - 1) {
      const espera = (t + 1) * 15000;
      console.warn(`⚠️  HTTP ${res.status} (tentativa ${t + 1}/${tentativas}) — aguardando ${espera / 1000}s...`);
      await sleep(espera);
      continue;
    }
    throw new Error(`HTTP ${res.status}`);
  }
}

async function despesasDoDeputado(idExterno) {
  let url = `${API}/deputados/${idExterno}/despesas?ano=${ANO}&itens=100&ordem=DESC&ordenarPor=dataDocumento`;
  const todas = [];
  for (let p = 0; p < 12 && url; p++) {
    const r = await getJson(url);
    todas.push(...(r.dados || []));
    url = (r.links || []).find((l) => l.rel === 'next')?.href || null;
    await sleep(120);
  }
  return todas;
}

async function main() {
  console.log(`🚀 Coletor de gastos ${ANO} iniciado.`);

  const { data: agentes, error } = await supabase
    .from('agentes_politicos')
    .select('id, id_externo_api, fonte_api')
    .ilike('fonte_api', '%camara%');
  if (error) throw error;

  const deputados = (agentes || []).filter((a) => a.id_externo_api);
  console.log(`👥 ${deputados.length} deputados.`);

  // ── TRAVA 1: sonda a API antes de tocar no banco ──────────────────────────────
  // Se a fonte estiver fora do ar (devolvendo listas vazias), abortamos AQUI, antes
  // de qualquer delete. Um unico deputado com despesa ja prova que a API responde.
  const amostra = deputados.slice(0, Math.max(1, SONDA));
  let encontrouAlguma = 0;
  for (const dep of amostra) {
    try {
      const d = await despesasDoDeputado(dep.id_externo_api);
      if (d.length > 0) encontrouAlguma++;
    } catch (e) {
      console.warn(`  ⚠️  sonda ${dep.id_externo_api}: ${e.message}`);
    }
  }
  if (encontrouAlguma === 0) {
    console.error(
      `🛑 ABORTADO: a API da Câmara devolveu ZERO despesas para os ${amostra.length} deputados testados (ano ${ANO}).\n` +
      `   Isso indica a fonte fora do ar, não ausência real de gastos. NADA foi apagado.\n` +
      `   Bug conhecido da Câmara: github.com/CamaraDosDeputados/dados-abertos issues 382 e 383.`
    );
    process.exit(1);
  }
  console.log(`🔎 Sonda: ${encontrouAlguma}/${amostra.length} deputados com despesa — API respondendo, seguindo.`);

  let totalLinhas = 0, processados = 0, preservados = 0;
  for (const dep of deputados) {
    let despesas = [];
    try {
      despesas = await despesasDoDeputado(dep.id_externo_api);
    } catch (e) {
      console.warn(`  ⚠️  ${dep.id_externo_api}: ${e.message}`);
      continue;
    }

    const linhas = despesas.map((d) => ({
      agente_id: dep.id,
      ano: d.ano,
      mes: d.mes,
      tipo_despesa: d.tipoDespesa || null,
      categoria_normalizada: categoria(d.tipoDespesa),
      fornecedor_nome: d.nomeFornecedor || null,
      fornecedor_cnpj_cpf: d.cnpjCpfFornecedor || null,
      valor_liquido: d.valorLiquido || 0,
      data_emissao: d.dataDocumento ? d.dataDocumento.slice(0, 10) : null,
      id_externo_documento: d.codDocumento ? String(d.codDocumento) : null,
      url_documento: d.urlDocumento || null,
      casa_legislativa: 'Câmara',
    }));

    // ── TRAVA 2: sem dados novos, não apaga ────────────────────────────────────
    // Antes o delete acontecia sempre. Um retorno vazio (falha pontual da API, deputado
    // licenciado, mudança de endpoint) apagava o histórico e não repunha nada.
    if (linhas.length === 0) {
      preservados++;
      processados++;
      await sleep(120);
      continue;
    }

    // ── TRAVA 3: teto de linhas por execução ───────────────────────────────────
    // Guarda contra retorno anômalo da API (duplicação em massa, por ex.) encher o
    // banco e estourar o limite do plano free.
    if (totalLinhas + linhas.length > MAX_LINHAS) {
      console.error(
        `🛑 ABORTADO: a execução passaria de ${MAX_LINHAS} lançamentos (teto de segurança).\n` +
        `   Já foram gravados ${totalLinhas}. Confira a fonte antes de continuar, ou suba MAX_LINHAS conscientemente.`
      );
      process.exit(1);
    }

    // Idempotência: limpa o ano deste deputado e reinsere (é o que evita duplicata).
    await supabase.from('despesas_parlamentares').delete().eq('agente_id', dep.id).eq('ano', ANO);
    for (let i = 0; i < linhas.length; i += 500) {
      const { error: errIns } = await supabase.from('despesas_parlamentares').insert(linhas.slice(i, i + 500));
      if (errIns) { console.warn(`  ⚠️  insert ${dep.id_externo_api}: ${errIns.message}`); break; }
    }
    totalLinhas += linhas.length;
    processados++;
    if (processados % 50 === 0) console.log(`  …${processados}/${deputados.length} (${totalLinhas} lançamentos)`);
    await sleep(120);
  }

  console.log(
    `✅ ${processados} deputados, ${totalLinhas} lançamentos gravados` +
    (preservados ? ` · ${preservados} deputados sem retorno da API tiveram o ano ${ANO} PRESERVADO (nada apagado)` : '') + '.'
  );
}

import { refreshRadar } from './refresh_radar.js';
main()
  .then(() => refreshRadar())
  .catch((e) => { console.error('💥 Erro:', e.message); process.exit(1); });
