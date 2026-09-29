// DATAS NA TELA, SEM ERRO DE FUSO (29/09/2026). Fonte única: toda data mostrada no site passa
// por aqui.
//
// O ERRO QUE ISTO CORRIGE: `new Date("2026-05-19")` lê a data como meia-noite em UTC (Londres).
// No Brasil (UTC-3) isso ainda é 18/05, às 21h, e `toLocaleDateString` mostrava 18/05. Achado
// pelo Jordy numa nota do Bibo Nunes (CASCOL, emitida em 19/05, aparecia 18/05). O mesmo
// acontecia com:
//   - colunas `date` (notas fiscais, indicações, nascimento);
//   - as 588 votações do SENADO, gravadas como meia-noite UTC exata (00:00:00+00:00): todas
//     apareciam um dia antes. As da ALERGS estão em 03:00 UTC (meia-noite de Brasília) e já
//     saíam certas;
//   - o servidor da Vercel, que roda em UTC: a mesma data podia sair diferente no HTML e no
//     navegador.
//
// A REGRA:
//   1. Data sem hora ("2026-05-19"), data com hora mas sem fuso, ou meia-noite UTC EXATA: é uma
//      DATA, não um instante. Usa o dia escrito, sem conversão.
//   2. Qualquer outro instante com fuso (ex.: "2026-09-27T15:31:16Z"): mostrado no horário de
//      Brasília, igual no servidor e no navegador.
const FUSO = 'America/Sao_Paulo';
const RE = /^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2})(?::(\d{2})(?:\.\d+)?)?)?\s*(Z|[+-]\d{2}(?::?\d{2})?)?$/;

// { ano, mes, dia } da data, pela regra acima. null se não for data.
export function partesData(v) {
  if (v == null || v === '') return null;
  const s = String(v).trim();
  const m = s.match(RE);
  if (m) {
    const [, a, me, d, h, mi, se, zona] = m;
    const semZona = !zona;
    const meiaNoiteUtc = /^(Z|[+-]00(:?00)?)$/.test(zona || '') && !Number(h || 0) && !Number(mi || 0) && !Number(se || 0);
    if (semZona || meiaNoiteUtc) return { ano: Number(a), mes: Number(me), dia: Number(d) };
  }
  const dt = new Date(s);
  if (Number.isNaN(dt.getTime())) return null;
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-US', { timeZone: FUSO, year: 'numeric', month: 'numeric', day: 'numeric' })
    .formatToParts(dt).map((x) => [x.type, x.value]));
  return { ano: Number(p.year), mes: Number(p.month), dia: Number(p.day) };
}

// "19/05/2026"
export function dataBr(v) {
  const p = partesData(v);
  if (!p) return '';
  return `${String(p.dia).padStart(2, '0')}/${String(p.mes).padStart(2, '0')}/${p.ano}`;
}

// Só o ano (filtros e períodos).
export function anoDe(v) {
  return partesData(v)?.ano ?? null;
}

// Idade em anos cheios HOJE, no calendário de Brasília.
export function idadeEm(nascimento) {
  const n = partesData(nascimento);
  const h = partesData(new Date().toISOString());
  if (!n || !h) return null;
  let a = h.ano - n.ano;
  if (h.mes < n.mes || (h.mes === n.mes && h.dia < n.dia)) a--;
  return a >= 0 && a < 120 ? a : null;
}
