// Soma da região escolhida na apuração por estados (12/10/2026; extraída em 18/10/2026 para o computador e o celular
// usarem a MESMA conta). Votos de cada candidato, válidos, brancos, nulos e seções dos estados da região.
// A porcentagem é sobre os votos válidos da região; brancos e nulos sobre o total de votos (como o TSE faz por estado).
// Estado da região que o TSE ainda não publicou fica de fora e a lista `faltam` avisa que o total é parcial.
import { REGIOES } from './mapaRegioes.js';

const fmtPct = (v) => v.toFixed(2).replace('.', ',');
const chaveCand = (c) => `${c.numero}|${c.nome}`;

// estados: { UF: { votos, secoes, candidatos, ... } } (o `dados.estados` de /api/apuracao-estados)
// ufs: as UFs da região, na ordem em que a lista `faltam` deve sair.
export function somarRegiao(estados, regiao, ufs) {
  const com = ufs.filter((u) => estados[u]);
  const faltam = ufs.filter((u) => !estados[u]);
  const por = new Map(); let validos = 0; let brancos = 0; let nulos = 0; let tot = 0; let total = 0;
  for (const u of com) {
    const e = estados[u];
    validos += e.votos.validos; brancos += e.votos.brancos; nulos += e.votos.nulos;
    tot += e.secoes.totalizadas; total += e.secoes.total;
    for (const c of e.candidatos) {
      const k = chaveCand(c); const a = por.get(k);
      if (a) a.votos += c.votos; else por.set(k, { numero: c.numero, nome: c.nome, partido: c.partido, votos: c.votos });
    }
  }
  if (!com.length) return { regiao, nome: REGIOES[regiao].nome, nEstados: 0, faltam, e: null };
  const todos = validos + brancos + nulos;
  const candidatos = [...por.values()].sort((a, b) => b.votos - a.votos)
    .map((c) => ({ ...c, pct: fmtPct(validos ? (c.votos / validos) * 100 : 0) }));
  return {
    regiao, nome: REGIOES[regiao].nome, nEstados: com.length, faltam,
    e: {
      secoes: { totalizadas: tot, total, pct_totalizadas: fmtPct(total ? (tot / total) * 100 : 0) },
      votos: { validos, brancos, nulos, pct_brancos: fmtPct(todos ? (brancos / todos) * 100 : 0), pct_nulos: fmtPct(todos ? (nulos / todos) * 100 : 0) },
      candidatos,
    },
  };
}
