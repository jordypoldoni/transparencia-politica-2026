// REPLAY DA APURAÇÃO (22/10/2026, D-073 e D-074): lógica pura da página de prévia /apuracao-replay.
// Base de tempo: 17:00 de Brasília do dia da votação (o TSE passa a receber as urnas pouco depois). Cada passo é 1 minuto.
// Os dados vêm dos boletins de urna do TSE (DT_BU_RECEBIDO). Aqui só há tempo, velocidade e a lista de estados sem detalhe.

export const HORA_BASE = 17;          // 17:00
export const MINUTOS_TOTAIS = 600;    // até 03:00 (a última urna do 1º turno chegou às 02:58)

// Boletins de urna do TSE publicados incompletos na origem (hash não confere): estes estados têm votos finais OFICIAIS, mas ritmo de chegada ESTIMADO
// (src/lib/replayEstimativa.js). A lista que vale para a tela vem do arquivo de dados (`estimadas`); esta é a conferida em 22/10/2026.
export const UFS_ESTIMADAS = ['MS', 'RN', 'SE', 'TO'];

// "MS, RN, SE e TO"
export function listaE(itens) {
  const l = [...(itens || [])];
  return l.length < 2 ? l.join('') : `${l.slice(0, -1).join(', ')} e ${l[l.length - 1]}`;
}

// Minutos de apuração que passam por segundo real. Rótulo = o que a pessoa lê.
export const VELOCIDADES = [
  { chave: 'lenta', rotulo: '3 min/s', minPorSeg: 3 },
  { chave: 'media', rotulo: '10 min/s', minPorSeg: 10 },
  { chave: 'rapida', rotulo: '30 min/s', minPorSeg: 30 },
];
export const VELOCIDADE_PADRAO = 'media';

const doisDigitos = (n) => String(n).padStart(2, '0');

export function limitarMinuto(m) {
  const n = Number(m);
  if (!Number.isFinite(n)) return 0;
  return Math.min(MINUTOS_TOTAIS, Math.max(0, Math.floor(n)));
}

// "17:00", "21:35", "02:58 (dia seguinte)"
export function horaDoMinuto(m) {
  const min = limitarMinuto(m);
  const total = HORA_BASE * 60 + min;
  const dia = Math.floor(total / 1440);
  const resto = total % 1440;
  const hhmm = `${doisDigitos(Math.floor(resto / 60))}:${doisDigitos(resto % 60)}`;
  return dia > 0 ? `${hhmm} (dia seguinte)` : hhmm;
}

// Avança o relógio do replay: `dtMs` de tempo real a `minPorSeg`. Para no fim (`fim: true`).
export function avancar(minuto, dtMs, minPorSeg) {
  const novo = Number(minuto) + (Math.max(0, dtMs) / 1000) * minPorSeg;
  if (novo >= MINUTOS_TOTAIS) return { minuto: MINUTOS_TOTAIS, fim: true };
  return { minuto: novo, fim: false };
}

// DADOS (22/10/2026): public/replay/1t-2026-secoes.json = { minutos, ufs: { UF: { total, acum: [seções recebidas até o fim de cada minuto] } } }.
// Gerado por scripts/replay/gerar_secoes_1t.mjs a partir dos boletins de urna do TSE. O minuto N inclui todas as urnas recebidas até N:59.
function acumAte(uf, minuto) {
  const a = uf && uf.acum;
  if (!Array.isArray(a) || a.length === 0) return 0;
  return a[Math.min(a.length - 1, limitarMinuto(minuto))] || 0;
}

// { UF: parte (0 a 1) das seções do estado já recebidas no minuto }. UF sem dado ou sem seções fica de fora (o mapa pinta de cinza).
export function fracoes(dados, minuto) {
  const out = {};
  if (!dados || !dados.ufs) return out;
  for (const [uf, d] of Object.entries(dados.ufs)) {
    if (!d || !(d.total > 0)) continue;
    out[uf] = Math.min(1, acumAte(d, minuto) / d.total);
  }
  return out;
}

// Quantas urnas já chegaram no minuto, somando todas as UFs com dado (inclui o exterior). Cobertura que acompanha qualquer número na tela.
export function urnasRecebidas(dados, minuto) {
  let recebidas = 0;
  let total = 0;
  if (dados && dados.ufs) {
    for (const d of Object.values(dados.ufs)) {
      if (!d || !(d.total > 0)) continue;
      recebidas += acumAte(d, minuto);
      total += d.total;
    }
  }
  return { recebidas, total, pct: total > 0 ? (recebidas / total) * 100 : 0 };
}

// Estados que receberam urnas na janela (padrão 5 min) terminada no minuto e ainda não fecharam. Ordem alfabética (neutra, D-074). Sem dado fica de fora.
export const JANELA_RECEBENDO = 5;
export function recebendoAgora(dados, minuto, janela = JANELA_RECEBENDO) {
  const out = [];
  if (!dados || !dados.ufs) return out;
  for (const [uf, d] of Object.entries(dados.ufs)) {
    if (!d || !(d.total > 0)) continue;
    const agora = acumAte(d, minuto);
    if (agora < d.total && agora > acumAte(d, minuto - janela)) out.push(uf);
  }
  return out.sort();
}

// VOTOS (D-074). DADOS DE VOTOS: public/replay/1t-2026-votos.json = { candidatos: [{n, nome, partido, tipo}], ufs: { UF: { [n]: acum[minuto] } } }.
// Percentual = sobre VOTOS VÁLIDOS (só candidatos; Branco e Nulo ficam fora), como o TSE divulga. Ordem das linhas = a do arquivo (número de urna, FIXA).
// Soma só os estados presentes no arquivo (24 de 28 com horário: sem MS, RN, SE e TO), então NÃO é o parcial oficial do país.
export function votosNoMinuto(votos, minuto, uf = null, baseFinal = false) {
  const vazio = { linhas: [], validos: 0, brancos: 0, nulos: 0, total: 0 };
  if (!votos || !Array.isArray(votos.candidatos) || !votos.ufs) return vazio;
  const soma = {};
  const grupos = uf ? [votos.ufs[uf]] : Object.values(votos.ufs); // uf = só aquele estado (detalhe); sem uf = soma dos estados com horário e o exterior
  for (const c of grupos) {
    for (const [n, arr] of Object.entries(c || {})) soma[n] = (soma[n] || 0) + acumAte({ acum: arr }, minuto);
  }
  let validos = 0, brancos = 0, nulos = 0;
  for (const c of votos.candidatos) {
    const v = soma[c.n] || 0;
    if (c.tipo === 'Branco') brancos = v; else if (c.tipo === 'Nulo') nulos = v; else validos += v;
  }
  // baseFinal: o percentual é sobre o TOTAL de votos válidos da eleição (fixo, ao fim do replay), e não sobre o que já foi apurado (D-076).
  // Assim a barra cresce de zero até o resultado final e não aparece "45%" quando só 0,5% das urnas chegou.
  const baseValidos = baseFinal && minuto < MINUTOS_TOTAIS ? votosNoMinuto(votos, MINUTOS_TOTAIS, uf).validos : validos;
  const linhas = votos.candidatos.filter((c) => c.tipo !== 'Branco' && c.tipo !== 'Nulo')
    .map((c) => ({ n: c.n, nome: c.nome, partido: c.partido, votos: soma[c.n] || 0, pct: baseValidos > 0 ? ((soma[c.n] || 0) / baseValidos) * 100 : 0 }));
  return { linhas, validos, baseValidos, brancos, nulos, total: validos + brancos + nulos };
}

// Percentual de urnas recebidas para a tela, a partir da fração (0 a 1). NUNCA mostra 100,0% se ainda falta alguma urna: arredonda para baixo
// e trava em 99,9%. Só mostra 100,0% quando a fração é exatamente 1. Devolve texto com vírgula, ex.: "61,1".
export function pctUrnas(fracao) {
  const p = (Number(fracao) || 0) * 100;
  if (p >= 100) return '100,0';
  const v = Math.min(99.9, Math.floor(p * 10) / 10);
  return v.toFixed(1).replace('.', ',');
}
