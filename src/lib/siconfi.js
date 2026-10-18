// SICONFI (Tesouro Nacional) — dados fiscais de União, estados, DF e municípios.
// Fonte única e padronizada de execução orçamentária (RREO). Sem captcha, JSON.
// Usada pelo coletor (coletores/coletor_siconfi.js) e pela busca sob demanda (páginas).
// Doc: https://apidatalake.tesouro.gov.br/docs/siconfi/

const BASE = 'https://apidatalake.tesouro.gov.br/ords/siconfi/tt';

// As 28 funções oficiais de governo (Portaria MOG 42/1999). Filtramos o Anexo 02
// por essa lista para pegar só o nível FUNÇÃO (ignorando subfunções e totais).
export const FUNCOES_OFICIAIS = [
  'Legislativa', 'Judiciária', 'Essencial à Justiça', 'Administração', 'Defesa Nacional',
  'Segurança Pública', 'Relações Exteriores', 'Assistência Social', 'Previdência Social',
  'Saúde', 'Trabalho', 'Educação', 'Cultura', 'Direitos da Cidadania', 'Urbanismo',
  'Habitação', 'Saneamento', 'Gestão Ambiental', 'Ciência e Tecnologia', 'Agricultura',
  'Organização Agrária', 'Indústria', 'Comércio e Serviços', 'Comunicações', 'Energia',
  'Transporte', 'Desporto e Lazer', 'Encargos Especiais',
];
const FUNCOES_SET = new Set(FUNCOES_OFICIAIS.map((f) => f.toLowerCase()));

// Sequência de tentativas para achar o período mais recente com dados publicados.
// RREO é bimestral (1..6); em meados do ano corrente os últimos bimestres ainda não saíram.
function candidatosPeriodo() {
  const anoAtual = new Date().getFullYear();
  const seq = [];
  for (const ano of [anoAtual, anoAtual - 1]) {
    for (const p of [6, 5, 4, 3, 2, 1]) seq.push([ano, p]);
  }
  return seq;
}

async function getJSON(url, tentativas = 3) {
  for (let i = 0; i < tentativas; i++) {
    try {
      const r = await fetch(url, { headers: { Accept: 'application/json' } });
      if (r.status === 429 || r.status >= 500) throw new Error('HTTP ' + r.status);
      if (!r.ok) return null;
      return await r.json();
    } catch (e) {
      if (i === tentativas - 1) return null;
      await new Promise((res) => setTimeout(res, 500 * (i + 1)));
    }
  }
  return null;
}

// Busca paginada (ORDS devolve { items, hasMore, offset, limit }).
async function getPaginado(url) {
  const todos = [];
  let offset = 0;
  for (let guard = 0; guard < 50; guard++) {
    const sep = url.includes('?') ? '&' : '?';
    const j = await getJSON(`${url}${sep}offset=${offset}`);
    if (!j || !Array.isArray(j.items)) break;
    todos.push(...j.items);
    if (!j.hasMore || j.items.length === 0) break;
    offset += j.items.length;
  }
  return todos;
}

// Lista mestra de entes (código IBGE, nome, uf, esfera, população...).
export async function listarEntes() {
  return getPaginado(`${BASE}/entes`);
}

export async function buscarEnte(codIbge) {
  const j = await getJSON(`${BASE}/entes?id_ente=${codIbge}`);
  return j && j.items && j.items[0] ? j.items[0] : null;
}

// O Distrito Federal é listado com esfera 'D' em /entes, mas publica o RREO como
// estadual (co_esfera 'E'). Mapeamos só na consulta; na nossa base o DF fica como 'D'.
const esferaRREO = (e) => (e === 'D' ? 'E' : e);

function rreoURL({ ano, periodo, anexo, idEnte, esfera }) {
  const noAnexo = encodeURIComponent(`RREO-Anexo ${String(anexo).padStart(2, '0')}`);
  return `${BASE}/rreo?an_exercicio=${ano}&nr_periodo=${periodo}`
    + `&co_tipo_demonstrativo=RREO&no_anexo=${noAnexo}`
    + `&id_ente=${idEnte}&co_esfera=${esferaRREO(esfera)}`;
}

async function rreoItems(params) {
  return getPaginado(rreoURL(params));
}

// Receita total realizada (Anexo 01, linha "RECEITAS (EXCETO INTRA-ORÇAMENTÁRIAS)").
function parseReceita(items) {
  const linha = items.find(
    (i) => /RECEITAS?\s*\(EXCETO INTRA/i.test(i.conta || '')
      && /até o bimestre/i.test(i.coluna || '')
  );
  return linha ? Number(linha.valor) : null;
}

// Escolhe a coluna de "despesa realizada no ano": liquidada ATÉ o bimestre (acumulado do ano),
// senão empenhada até o bimestre. Ignora colunas de % e de dotação.
// BUG corrigido em 17/10/2026: antes pegava a primeira coluna "liquidada" qualquer, que é a
// "No Bimestre" (só os 2 últimos meses). Resultado: despesa de 1 bimestre contra receita do ano
// inteiro (União mostrava R$ 884 bi em vez de ~R$ 2,9 tri e a diferença saía com o sinal trocado).
export function colunaDespesaRealizada(items) {
  const cols = [...new Set(items.map((i) => i.coluna || ''))];
  const ok = (c, termo) => new RegExp(termo, 'i').test(c) && /at[eé]\s+o\s+bimestre/i.test(c) && !c.includes('%');
  return cols.find((c) => ok(c, 'liquidad')) || cols.find((c) => ok(c, 'empenhad')) || null;
}

// Despesa total + despesa por função (Anexo 02).
export function parseDespesaEFuncoes(items) {
  const col = colunaDespesaRealizada(items);
  if (!col) return { despesa_total: null, funcoes: {} };
  const doCol = items.filter((i) => i.coluna === col);
  const totalLinha = doCol.find((i) => /DESPESAS?\s*\(EXCETO INTRA/i.test(i.conta || ''));
  const funcoes = {};
  for (const i of doCol) {
    const nome = (i.conta || '').trim();
    if (FUNCOES_SET.has(nome.toLowerCase())) {
      funcoes[nome] = (funcoes[nome] || 0) + Number(i.valor || 0);
    }
  }
  return { despesa_total: totalLinha ? Number(totalLinha.valor) : null, funcoes };
}

// ---------------------------------------------------------------------------------------------
// DETALHE (17/10/2026, página de gastos públicos v2): de onde veio a receita, resultado primário e
// nominal, juros, dívida e o que há dentro de "Encargos Especiais". Tudo em R$, valores acumulados
// no ano até o bimestre. Cada campo é nulo quando o ente não publica a linha (a página então cai
// no desenho simples). Nomes de conta conferidos na API da União, 4º bimestre de 2026.
const num = (v) => { const n = Number(v); return Number.isFinite(n) ? n : null; };
const soma = (...vs) => (vs.some((v) => v == null) ? null : vs.reduce((a, b) => a + b, 0));
const achar = (items, rx, colRx) => {
  const l = items.find((i) => rx.test(i.conta || '') && colRx.test(i.coluna || ''));
  return l ? num(l.valor) : null;
};

// Anexo 01: origem da receita (colunas "Até o Bimestre").
export function parseReceitaDetalhe(items) {
  const ate = /at[eé]\s+o\s+bimestre/i;
  const porCod = (cod) => {
    const l = items.find((i) => i.cod_conta === cod && ate.test(i.coluna || '') && !String(i.coluna).includes('%'));
    return l ? num(l.valor) : null;
  };
  return {
    tributaria: porCod('ReceitaTributaria'),            // impostos, taxas e contribuições de melhoria
    contribuicoes: porCod('ReceitaDeContribuicoes'),    // contribuições sociais e econômicas
    operacoes_credito: porCod('ReceitasDeOperacoesDeCredito'), // dívida nova, dentro da receita
    remuneracao_caixa: porCod('RemuneracaoDasDisponibilidadesDoTesouroOutrasReceitasDeCapital'),
  };
}

// Anexo 06: resultado primário e nominal, juros, dívida (União; outros entes podem não ter as linhas).
export function parseResultados(items) {
  const VALOR = /^VALOR$/i;
  const receitaPrimaria = achar(items, /^Receita prim[aá]ria total/i, /^RECEITAS REALIZADAS/i);
  const pagas = achar(items, /^DESPESA PRIM[AÁ]RIA TOTAL/i, /^DESPESAS PAGAS/i);
  const rpp = achar(items, /^DESPESA PRIM[AÁ]RIA TOTAL/i, /^RESTOS A PAGAR PROCESSADOS PAGOS/i);
  const rpnp = achar(items, /^DESPESA PRIM[AÁ]RIA TOTAL/i, /^PAGOS\s*\(c\)/i);
  const dividaLiq = (col) => achar(items, /^D[IÍ]VIDA CONSOLIDADA L[IÍ]QUIDA/i, col);
  return {
    receita_primaria: receitaPrimaria,
    // despesa primária PAGA no ano = paga do exercício + restos a pagar (processados e não processados) pagos
    despesa_primaria_paga: soma(pagas, rpp, rpnp),
    ajuste_metodologico: achar(items, /^AJUSTE METODOL[OÓ]GICO DO RESULTADO PRIM[AÁ]RIO\s*-\s*Acima/i, VALOR),
    resultado_primario: achar(items, /^RESULTADO PRIM[AÁ]RIO\s*-\s*Acima/i, VALOR),
    resultado_nominal: achar(items, /^RESULTADO NOMINAL\s*-\s*Acima/i, VALOR),
    juros_ativos: achar(items, /^Juros, Encargos e Varia[cç][oõ]es Monet[aá]rias Ativos/i, /^VALOR INCORRIDO/i),
    juros_passivos: achar(items, /^Juros, Encargos e Varia[cç][oõ]es Monet[aá]rias Passivos/i, /^VALOR INCORRIDO/i),
    divida_liquida_inicio: dividaLiq(/^Em 31\/12/i),
    divida_liquida_atual: dividaLiq(/^At[eé] o Bimestre/i),
  };
}

// Anexo 02: o que há dentro de "Encargos Especiais" (serviço da dívida, repasses, outros).
// As subfunções vêm logo depois da função na mesma coluna; lemos até a próxima função.
export function parseEncargos(items) {
  const col = colunaDespesaRealizada(items);
  if (!col) return null;
  const linhas = items.filter((i) => i.coluna === col);
  const ini = linhas.findIndex((i) => (i.conta || '').trim().toLowerCase() === 'encargos especiais');
  if (ini < 0) return null;
  const sub = {};
  for (const i of linhas.slice(ini + 1)) {
    const nome = (i.conta || '').trim();
    if (FUNCOES_SET.has(nome.toLowerCase())) break;
    if (/^DESPESAS\s*\(/i.test(nome)) break;
    if (!(nome in sub)) sub[nome] = num(i.valor);
  }
  const g = (n) => sub[n] ?? null;
  const out = {
    divida_interna: g('Serviço da Dívida Interna'),
    divida_externa: g('Serviço da Dívida Externa'),
    transferencias: g('Transferências'),
    outros: g('Outros Encargos Especiais'),
  };
  return Object.values(out).every((v) => v == null) ? null : out;
}

// Anexo 02: subfunções de cada função (ex.: Saúde -> Atenção Básica, Assistência Hospitalar...).
// As linhas vêm em sequência: a função e, logo abaixo, as subfunções dela. Lemos até a próxima função;
// paramos ao chegar nas despesas intra-orçamentárias ou em linhas de total. Devolve
// { "Saúde": [[nome, valor], ...] } só com valores positivos, ou null se o ente não detalha.
export function parseSubfuncoes(items) {
  const col = colunaDespesaRealizada(items);
  if (!col) return null;
  const canon = new Map(FUNCOES_OFICIAIS.map((f) => [f.toLowerCase(), f]));
  const out = {};
  let atual = null;
  for (const i of items.filter((x) => x.coluna === col)) {
    const nome = (i.conta || '').trim();
    if (/^DESPESAS\s*\(/i.test(nome)) { if (atual) break; continue; }
    if (/^(TOTAL|SUBTOTAL|SUPER[AÁ]VIT|D[EÉ]FICIT)/i.test(nome) || /^FU\d+/i.test(nome)) { if (atual) break; continue; }
    const f = canon.get(nome.toLowerCase());
    if (f) { atual = f; out[atual] = out[atual] || []; continue; }
    if (!atual) continue;
    const v = num(i.valor);
    if (v == null || v <= 0) continue;
    if (!out[atual].some((x) => x[0] === nome)) out[atual].push([nome, v]);
  }
  for (const k of Object.keys(out)) if (!out[k].length) delete out[k];
  return Object.keys(out).length ? out : null;
}

// Coleta o resumo fiscal de um ente para um (ano, período) específico.
export async function coletarEnteEmPeriodo({ idEnte, esfera, ano, periodo }) {
  const [a01, a02, a06] = await Promise.all([
    rreoItems({ ano, periodo, anexo: 1, idEnte, esfera }),
    rreoItems({ ano, periodo, anexo: 2, idEnte, esfera }),
    rreoItems({ ano, periodo, anexo: 6, idEnte, esfera }),
  ]);
  const receita_total = parseReceita(a01);
  const { despesa_total, funcoes } = parseDespesaEFuncoes(a02);
  if (receita_total == null && despesa_total == null && Object.keys(funcoes).length === 0) {
    return null; // sem dados nesse período
  }
  const detalhe = {
    receita: parseReceitaDetalhe(a01),
    resultados: parseResultados(a06),
    encargos: parseEncargos(a02),
    subfuncoes: parseSubfuncoes(a02),
  };
  return { ano, periodo, receita_total, despesa_total, funcoes, detalhe };
}

// Descobre automaticamente o período mais recente com dados e coleta.
export async function coletarEnteRecente({ idEnte, esfera }) {
  for (const [ano, periodo] of candidatosPeriodo()) {
    const dados = await coletarEnteEmPeriodo({ idEnte, esfera, ano, periodo });
    if (dados) return dados;
  }
  return null;
}

// Grava resumo + funções no banco (upsert idempotente).
export async function salvarResumo(supabase, ente, dados) {
  const receita = dados.receita_total;
  const despesa = dados.despesa_total;
  const resultado = (receita != null && despesa != null) ? receita - despesa : null;
  const { error: e1 } = await supabase.from('fiscal_resumo').upsert({
    cod_ibge: ente.cod_ibge, ano: dados.ano, periodo: dados.periodo, esfera: ente.esfera,
    populacao: ente.populacao, receita_total: receita, despesa_total: despesa,
    resultado, detalhe: dados.detalhe || null, fonte: 'SICONFI/RREO', atualizado_em: new Date().toISOString(),
  }, { onConflict: 'cod_ibge,ano' });
  if (e1) throw new Error('fiscal_resumo: ' + e1.message);

  const linhas = Object.entries(dados.funcoes).map(([funcao, valor]) => ({
    cod_ibge: ente.cod_ibge, ano: dados.ano, funcao, valor,
    atualizado_em: new Date().toISOString(),
  }));
  if (linhas.length) {
    const { error: e2 } = await supabase.from('fiscal_funcao')
      .upsert(linhas, { onConflict: 'cod_ibge,ano,funcao' });
    if (e2) throw new Error('fiscal_funcao: ' + e2.message);
  }
}

// Garante o resumo de um ente (usada sob demanda p/ municípios): se já existe no banco,
// devolve; senão busca no SICONFI, grava e devolve. Requer client com service_role (server-side).
export async function garantirResumo(supabase, codIbge) {
  const { data: existente } = await supabase
    .from('fiscal_resumo').select('*').eq('cod_ibge', codIbge).maybeSingle();
  if (existente) return existente;

  let { data: ente } = await supabase
    .from('entes_fiscais').select('*').eq('cod_ibge', codIbge).maybeSingle();
  if (!ente) {
    const raw = await buscarEnte(codIbge);
    if (!raw) return null;
    ente = {
      cod_ibge: Number(raw.cod_ibge), ente: raw.ente, esfera: raw.esfera, uf: raw.uf,
      regiao: raw.regiao, capital: String(raw.capital || '').trim() === '1',
      populacao: raw.populacao ? Number(raw.populacao) : null, cnpj: raw.cnpj,
    };
    await supabase.from('entes_fiscais').upsert(ente, { onConflict: 'cod_ibge' });
  }
  const dados = await coletarEnteRecente({ idEnte: ente.cod_ibge, esfera: ente.esfera });
  if (!dados) return null;
  await salvarResumo(supabase, ente, dados);
  const { data: novo } = await supabase
    .from('fiscal_resumo').select('*').eq('cod_ibge', codIbge).maybeSingle();
  return novo;
}
