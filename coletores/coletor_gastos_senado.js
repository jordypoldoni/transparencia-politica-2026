// Coletor de gastos do Senado (CEAPS) — CSV oficial, anual.
// Idempotente: apaga as despesas do Senado do ano e reinsere.
// Casa por NOME (CEAPS não traz código), com normalização de acentos/caixa.
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import { registrarStatus, ultimaEmissao } from './_status.js';
import { lerCeaps } from './_ceaps.js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const DRY = process.argv.includes('--dry'); // so le e confere, nao grava
const ANO = parseInt(process.argv.find((a) => /^\d{4}$/.test(a)) || process.env.ANO || '2026', 10); // uso: node coletor_gastos_senado.js 2025 [--dry]
// URL configurável (a CEAPS publica um CSV por ano)
const CEAPS_URL = process.env.CEAPS_URL || `https://www.senado.gov.br/transparencia/LAI/verba/despesa_ceaps_${ANO}.csv`;

if (!SUPABASE_URL || !SUPABASE_KEY) { console.error('❌ Faltam credenciais Supabase.'); process.exit(1); }
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const norm = (s) => (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9 ]/g, '').trim();

function categoria(tipo) {
  const x = (tipo || '').toLowerCase();
  if (x.includes('passagem') || x.includes('hospedag') || x.includes('aérea') || x.includes('aerea')) return 'Viagens e Estadias';
  if (x.includes('locomo') || x.includes('combust') || x.includes('veícul') || x.includes('veicul') || x.includes('aluguel de veículos')) return 'Transporte e Mobilidade';
  if (x.includes('aliment')) return 'Alimentação';
  if (x.includes('divulga') || x.includes('publicid')) return 'Publicidade e Marketing';
  if (x.includes('aluguel') || x.includes('escritório') || x.includes('escritorio') || x.includes('material') || x.includes('telefon') || x.includes('postal')) return 'Escritório e Apoio';
  if (x.includes('consultor') || x.includes('pesquisa') || x.includes('técnic') || x.includes('tecnic')) return 'Serviços Técnicos';
  if (x.includes('seguran')) return 'Segurança';
  return 'Outros Operacionais';
}

const valor = (v) => parseFloat(String(v || '0').replace(/\./g, '').replace(',', '.')) || 0;
// DATA NO FUTURO VIRA VAZIA (17/10/2026). O CSV do Senado traz 4 lancamentos com ano de emissao
// errado (ex.: referencia 12/2025 com data 29/12/2026). O coletor copia a data sem mexer, entao a
// nota aparecia como se fosse de dezembro de 2026. Nota nao pode ser emitida depois de hoje:
// grava vazio, e a nota segue contada no mes de referencia (colunas ano/mes, que sao outras).
// NAO usar "data fora do mes de referencia" como regra: isso e normal (nota emitida num mes e
// reembolsada em outro; 13% do Senado e 8% da Camara).
const data = (d) => { // dd/mm/aaaa -> aaaa-mm-dd
  const m = String(d || '').match(/(\d{2})\/(\d{2})\/(\d{4})/);
  if (!m) return null;
  const iso = `${m[3]}-${m[2]}-${m[1]}`;
  return iso > new Date().toISOString().slice(0, 10) ? null : iso;
};

async function main() {
  console.log(`🚀 Coletor CEAPS ${ANO} — ${CEAPS_URL}`);

  // 1) Mapa nome-normalizado -> agente (senadores)
  const { data: senadores, error } = await supabase
    .from('agentes_politicos')
    .select('id, nome_urna, nome_completo')
    .ilike('fonte_api', '%senado%');
  if (error) throw error;
  // Casamento por tokens: o nome curto da CEAPS deve estar contido no nome do senador
  const senTok = (senadores || []).map((s) => ({
    id: s.id,
    tokens: new Set(norm(`${s.nome_urna || ''} ${s.nome_completo || ''}`).split(/\s+/).filter(Boolean)),
  }));
  const cache = new Map();
  const matchSenador = (nome) => {
    const key = norm(nome);
    if (cache.has(key)) return cache.get(key);
    const toks = key.split(/\s+/).filter(Boolean);
    let melhor = null, menor = Infinity;
    if (toks.length) {
      for (const s of senTok) {
        if (toks.every((tk) => s.tokens.has(tk)) && s.tokens.size < menor) { melhor = s.id; menor = s.tokens.size; }
      }
    }
    // Fallback seguro: maior nº de tokens significativos em comum, SÓ se único (sem ambiguidade)
    if (!melhor) {
      const sig = toks.filter((tk) => tk.length >= 4);
      let max = 0, idMax = null, qtdMax = 0;
      for (const s of senTok) {
        let n = 0; for (const tk of sig) if (s.tokens.has(tk)) n++;
        if (n > max) { max = n; idMax = s.id; qtdMax = 1; }
        else if (n === max && n > 0) qtdMax++;
      }
      if (max >= 2 && qtdMax === 1) melhor = idMax;
    }
    cache.set(key, melhor);
    return melhor;
  };
  console.log(`👥 ${senadores.length} senadores no banco.`);

  // 2) Baixa e decodifica o CSV (latin-1, separado por ;)
  const resp = await fetch(CEAPS_URL);
  if (!resp.ok) throw new Error(`HTTP ${resp.status} ao baixar CEAPS`);
  const buf = Buffer.from(await resp.arrayBuffer());
  const texto = buf.toString('latin1');

  // Leitura em coletores/_ceaps.js (corrige o desvio de colunas das passagens aereas, 19/10/2026).
  const { lancamentos, anomalias, total } = lerCeaps(texto);
  console.log(`📄 ${total} lançamentos no arquivo; ${anomalias.length} ilegíveis.`);
  if (anomalias.length) console.warn('   ilegíveis (amostra):', anomalias.slice(0, 3));
  // Trava: mais de 0,5% ilegível = o formato do arquivo mudou. Nao apaga nem regrava nada.
  if (anomalias.length > Math.max(5, total * 0.005)) throw new Error(`CEAPS ${ANO}: ${anomalias.length} de ${total} lançamentos ilegíveis; nada foi gravado.`);

  const linhasOut = [];
  let semMatch = new Set();
  for (const r of lancamentos) {
    const agenteId = matchSenador(r.senador);
    if (!agenteId) { semMatch.add(r.senador); continue; }
    linhasOut.push({
      agente_id: agenteId,
      ano: parseInt(r.ano, 10) || ANO,
      mes: parseInt(r.mes, 10) || null,
      tipo_despesa: r.tipo || null,
      categoria_normalizada: categoria(r.tipo),
      fornecedor_nome: r.fornecedor || null,
      fornecedor_cnpj_cpf: r.cnpj || null,
      valor_liquido: valor(r.valor),
      data_emissao: data(r.data),
      id_externo_documento: r.cod || r.documento || null,
      casa_legislativa: 'Senado',
    });
  }
  console.log(`📊 ${linhasOut.length} lançamentos válidos; ${semMatch.size} senadores sem correspondência.`);
  if (semMatch.size) console.log('   sem match (amostra):', [...semMatch].slice(0, 5));

  // Assinatura do bug antigo (colunas deslocadas): passagem com valor 0 e o valor dentro do id.
  const passagens = linhasOut.filter((r) => /passagen/i.test(r.tipo_despesa || ''));
  const passZero = passagens.filter((r) => r.valor_liquido === 0).length;
  const idValor = linhasOut.filter((r) => /^\d+,\d{1,2}$/.test(r.id_externo_documento || '')).length;
  console.log(`🔎 passagens: ${passagens.length} (${passZero} com valor 0); ids que parecem valor: ${idValor}.`);
  if (idValor > 5 || (passagens.length > 20 && passZero / passagens.length > 0.5)) {
    throw new Error(`CEAPS ${ANO}: colunas parecem deslocadas (${idValor} ids que parecem valor, ${passZero}/${passagens.length} passagens zeradas); nada foi gravado.`);
  }
  if (DRY) {
    const alvo = norm(process.env.SENADOR_AMOSTRA || 'Paulo Paim');
    const dele = lancamentos.filter((r) => norm(r.senador).includes(alvo));
    const soma = dele.reduce((t, r) => t + valor(r.valor), 0);
    const somaPass = dele.filter((r) => /passagen/i.test(r.tipo)).reduce((t, r) => t + valor(r.valor), 0);
    const resumoDry = `DRY ${ANO}: ${linhasOut.length} lançamentos casados (${total} no arquivo, ${anomalias.length} ilegíveis, ${semMatch.size} senadores sem correspondência); passagens ${passagens.length} (${passZero} zeradas). ${process.env.SENADOR_AMOSTRA || 'Paulo Paim'}: ${dele.length} notas, total ${soma.toFixed(2)}, passagens ${somaPass.toFixed(2)}.`;
    if (process.env.GITHUB_ACTIONS) console.log(`::notice title=CEAPS ${ANO} (conferência)::${resumoDry}`);
    if (anomalias.length && process.env.GITHUB_ACTIONS) console.log(`::notice title=CEAPS ${ANO} ilegíveis::${anomalias.slice(0, 4).map((a) => `${a.motivo} [${a.valor ?? ''}] ${String(a.linha).replace(/[\r\n]+/g, ' ')}`).join(' || ')}`);
    // Diagnostico das linhas sem TIPO_DESPESA (19/10/2026): mostra o que o CSV realmente traz.
    const semTipo = lancamentos.filter((r) => !String(r.tipo || '').trim());
    const somaSemTipo = semTipo.reduce((t, r) => t + valor(r.valor), 0);
    if (process.env.GITHUB_ACTIONS) {
      console.log(`::notice title=CEAPS ${ANO} sem tipo::${semTipo.length} linhas, R$ ${somaSemTipo.toFixed(2)}, ${new Set(semTipo.map((r) => r.senador)).size} senadores`);
      const amostra = semTipo.filter((r) => /CHIOVATO|HOTUR|WT ADMIN/i.test(r.fornecedor || '')).slice(0, 3).concat(semTipo.slice(0, 3));
      console.log(`::notice title=CEAPS ${ANO} sem tipo amostra::${amostra.map((r) => [r.senador, r.mes, r.fornecedor, r.documento, r.detalhamento, r.valor].join(' / ')).join(' || ')}`);
      const crua = texto.split(/\r?\n/).filter((l) => /CHIOVATO/i.test(l)).slice(0, 2);
      console.log(`::notice title=CEAPS ${ANO} linha crua::${crua.join(' || ')}`);
    }
    const porTipo = {};
    for (const r of dele) { const k = String(r.tipo).slice(0, 40); porTipo[k] = porTipo[k] || { n: 0, v: 0 }; porTipo[k].n++; porTipo[k].v += valor(r.valor); }
    const linhaTipos = Object.entries(porTipo).map(([k, x]) => `${JSON.stringify(k)}=${x.n}/${x.v.toFixed(2)}`).join(' | ');
    if (process.env.GITHUB_ACTIONS) console.log(`::notice title=CEAPS ${ANO} por tipo::${linhaTipos}`);
    console.log(`DRY ${ANO}: ${linhasOut.length} lançamentos casados. ${process.env.SENADOR_AMOSTRA || 'Paulo Paim'}: ${dele.length} notas, total ${soma.toFixed(2)}, passagens ${somaPass.toFixed(2)}.`);
    return;
  }

  // 3) Idempotência: limpa o Senado deste ano e reinsere.
  // 19/10/2026: o apagar antigo era UM delete do ano inteiro (~23 mil linhas) e o erro era ignorado.
  // Na regravacao de 2025 ele nao apagou nada, o insert seguiu, e o ano ficou DUPLICADO (total dobrado).
  // Agora: apaga mes a mes (lotes pequenos), confere o erro de cada um, confere que o ano ficou vazio
  // antes de inserir, e confere a contagem final. Qualquer divergencia derruba a execucao.
  for (const mes of [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, null]) {
    let q = supabase.from('despesas_parlamentares').delete().eq('casa_legislativa', 'Senado').eq('ano', ANO);
    q = mes === null ? q.is('mes', null) : q.eq('mes', mes);
    const { error: eDel } = await q;
    if (eDel) throw new Error(`CEAPS ${ANO}: falha ao apagar o mês ${mes ?? 'vazio'}: ${eDel.message}`);
  }
  const contar = async () => {
    const { count, error: eCount } = await supabase.from('despesas_parlamentares').select('id', { count: 'exact', head: true }).eq('casa_legislativa', 'Senado').eq('ano', ANO);
    if (eCount) throw new Error(`CEAPS ${ANO}: falha ao contar: ${eCount.message}`);
    return count;
  };
  const sobrou = await contar();
  if (sobrou !== 0) throw new Error(`CEAPS ${ANO}: depois de apagar ainda há ${sobrou} linhas; nada foi inserido.`);
  for (let i = 0; i < linhasOut.length; i += 500) {
    const { error: e } = await supabase.from('despesas_parlamentares').insert(linhasOut.slice(i, i + 500));
    if (e) throw new Error(`CEAPS ${ANO}: falha ao inserir o lote ${i}: ${e.message}`);
  }
  const final = await contar();
  if (final !== linhasOut.length) throw new Error(`CEAPS ${ANO}: gravadas ${linhasOut.length} mas o banco tem ${final}.`);
  console.log(`✅ ${linhasOut.length} despesas do Senado gravadas.`);
  if (process.env.GITHUB_ACTIONS) console.log(`::notice title=CEAPS ${ANO} gravado::${linhasOut.length} despesas gravadas (${passagens.length} passagens, ${passZero} zeradas).`);
  await registrarStatus(supabase, { fonte: 'gastos_senado', dadosAte: await ultimaEmissao(supabase, 'Senado', ANO), linhas: linhasOut.length });
}

import { refreshRadar } from './refresh_radar.js';
main()
  .then(() => refreshRadar())
  .catch((e) => { console.error('💥 Erro:', e.message); process.exit(1); });
