// TURNOS da apuração: qual eleição do TSE vale em cada turno e o que existe no 2º turno. (11/10/2026)
//
// Só isto muda de um turno para o outro. O formato do arquivo é o mesmo, então a leitura e a
// redução do resultado continuam em src/lib/apuracaoTse.js. Se algo falhar só no 2º turno, o
// primeiro lugar a olhar é este arquivo.
//
// Fonte (conferida no TSE em 11/10/2026):
//   1º turno: eleição 6257 = presidente (arquivo nacional), 6259 = governador, senador e deputados.
//   2º turno: eleição 6258 = presidente, 6260 = governador. Não há 2º turno de senador nem de deputado.
// 404 em excesso bloqueia o IP por 10 minutos: por isso toda combinação é validada AQUI antes de
// qualquer pedido ao TSE.

export const ELEICOES = {
  1: { federal: '6257', estadual: '6259' },
  2: { federal: '6258', estadual: '6260' },
};

// Governos com 2º turno em 25/10/2026 (candidatos com situação "2º turno" no 1º turno).
export const SEGUNDO_TURNO = {
  cargos: ['presidente', 'governador'],
  ufs: ['AC', 'AM', 'DF', 'ES', 'RN', 'TO'],
};

// Aceita 1 ou 2 (número ou texto). Vazio ou ausente vale 1º turno. Qualquer outra coisa: null.
export function turnoValido(valor) {
  if (valor === undefined || valor === null || valor === '') return 1;
  const t = Number(valor);
  return t === 1 || t === 2 ? t : null;
}

// O cargo (e, se for estadual, a UF) existe nesse turno? A UF já deve estar validada contra UFS.
export function disponivelNoTurno(turno, cargo, uf) {
  if (turno === 1) return true;
  if (turno !== 2) return false;
  if (!SEGUNDO_TURNO.cargos.includes(cargo)) return false;
  if (cargo === 'presidente') return true;
  return SEGUNDO_TURNO.ufs.includes(String(uf || '').toUpperCase());
}

// Código da eleição no TSE. No 1º turno vale o ajuste por variável de ambiente (ensaio com o
// simulado do TSE, ver apuracaoTse.js); no 2º turno vale sempre o código oficial.
export function eleicaoDoTurno(turno, nacional, env = process.env) {
  if (turno === 1) {
    return String(nacional ? (env.TSE_ELEICAO_FEDERAL || ELEICOES[1].federal) : (env.TSE_ELEICAO_ESTADUAL || ELEICOES[1].estadual));
  }
  return nacional ? ELEICOES[2].federal : ELEICOES[2].estadual;
}
