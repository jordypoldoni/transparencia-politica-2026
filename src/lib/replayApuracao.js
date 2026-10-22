// REPLAY DA APURAÇÃO (22/10/2026, D-073 e D-074): lógica pura da página de prévia /apuracao-replay.
// Base de tempo: 17:00 de Brasília do dia da votação (o TSE passa a receber as urnas pouco depois). Cada passo é 1 minuto.
// Os dados vêm dos boletins de urna do TSE (DT_BU_RECEBIDO). Aqui só há tempo, velocidade e a lista de estados sem detalhe.

export const HORA_BASE = 17;          // 17:00
export const MINUTOS_TOTAIS = 600;    // até 03:00 (a última urna do 1º turno chegou às 02:58)

// Arquivos do TSE publicados incompletos na origem (hash não confere): sem linha do tempo para estes estados.
export const UFS_SEM_DETALHE = ['MS', 'RN', 'SE', 'TO'];

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
