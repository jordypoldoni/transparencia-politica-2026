// LIBERAÇÃO DO REPLAY (22/10/2026, D-077): o replay do 1º turno está aberto. O do 2º turno aparece no seletor, mas só
// fica clicável a partir das 12h (Brasília) de 26/10/2026 (decisão do Jordy em 23/10: a tela só abre depois da apuração, com os dados do 2º turno). A checagem é feita no servidor (getServerSideProps) e o
// resultado vai como propriedade da página, então o navegador não decide nada pelo relógio do visitante.
export const LIBERA_REPLAY_2T = '2026-10-26T12:00:00-03:00';
export const TEXTO_LIBERA_2T = 'O replay do 2º turno fica disponível a partir de 26 de outubro.';

// turno: 1 | 2   agora: Date | número (ms); padrão: agora
export function replayLiberado(turno, agora = Date.now()) {
  if (turno === 1) return true;
  if (turno !== 2) return false;
  const t = agora instanceof Date ? agora.getTime() : Number(agora);
  return Number.isFinite(t) && t >= Date.parse(LIBERA_REPLAY_2T);
}
