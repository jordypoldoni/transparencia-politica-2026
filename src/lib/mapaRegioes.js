// Regiões do mapa da apuração (D-026): a cor marca a REGIÃO, só para identificar (nunca partido, nunca as cores do site).
// Usado pelo mapa do computador (MapaBrasilApuracao) e pela grade do celular (MapaGradeApuracao).
export const REGIOES = {
  N: { nome: 'Norte', cor: '#2F7D6B' },
  NE: { nome: 'Nordeste', cor: '#C07A3C' },
  CO: { nome: 'Centro-Oeste', cor: '#8A8F3A' },
  SE: { nome: 'Sudeste', cor: '#5B6FA8' },
  S: { nome: 'Sul', cor: '#8E5C9A' },
};
export const ORDEM_REGIOES = ['N', 'NE', 'CO', 'SE', 'S'];

export const REGIAO_DE = {
  AC: 'N', AM: 'N', AP: 'N', PA: 'N', RO: 'N', RR: 'N', TO: 'N',
  AL: 'NE', BA: 'NE', CE: 'NE', MA: 'NE', PB: 'NE', PE: 'NE', PI: 'NE', RN: 'NE', SE: 'NE',
  DF: 'CO', GO: 'CO', MS: 'CO', MT: 'CO',
  ES: 'SE', MG: 'SE', RJ: 'SE', SP: 'SE',
  PR: 'S', RS: 'S', SC: 'S',
};
