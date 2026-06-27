// Teto MENSAL da cota (CEAP) por estado — Câmara dos Deputados, valores oficiais atuais.
// Fonte: https://www2.camara.leg.br/comunicacao/assessoria-de-imprensa/guia-para-jornalistas/cota-parlamentar
export const TETO_CEAP = {
  RR: 58474.70, AC: 57359.87, RO: 56267.90, AM: 56151.46, AP: 55929.26,
  RN: 55198.09, CE: 54879.34, PA: 54624.17, MA: 54537.99, PB: 54402.48,
  PE: 53997.81, PI: 53195.84, AL: 53164.36, RS: 53086.78, MS: 52707.93,
  SE: 52248.86, SC: 51951.42, TO: 51525.80, MT: 51439.83, BA: 50965.29,
  PR: 50807.19, ES: 49160.15, SP: 48727.46, MG: 47645.91, RJ: 47267.41,
  GO: 46979.73, DF: 41612.55,
};

export const CEAP_FONTE = 'https://www2.camara.leg.br/comunicacao/assessoria-de-imprensa/guia-para-jornalistas/cota-parlamentar';

export const NOMES_UF = {
  AC: 'Acre', AL: 'Alagoas', AP: 'Amapá', AM: 'Amazonas', BA: 'Bahia', CE: 'Ceará',
  DF: 'Distrito Federal', ES: 'Espírito Santo', GO: 'Goiás', MA: 'Maranhão', MT: 'Mato Grosso',
  MS: 'Mato Grosso do Sul', MG: 'Minas Gerais', PA: 'Pará', PB: 'Paraíba', PR: 'Paraná',
  PE: 'Pernambuco', PI: 'Piauí', RJ: 'Rio de Janeiro', RN: 'Rio Grande do Norte', RS: 'Rio Grande do Sul',
  RO: 'Rondônia', RR: 'Roraima', SC: 'Santa Catarina', SP: 'São Paulo', SE: 'Sergipe', TO: 'Tocantins',
};

export const CEAP_LISTA = Object.entries(TETO_CEAP)
  .sort((a, b) => b[1] - a[1])
  .map(([uf, valor]) => ({ uf, nome: NOMES_UF[uf] || uf, valor }));

export function pctDoTetoCamara(mediaMensal, uf) {
  const teto = TETO_CEAP[uf];
  if (!teto || !mediaMensal || mediaMensal <= 0) return null;
  return { pct: Math.round((mediaMensal / teto) * 100), teto };
}

// Teto MENSAL da CEAPS (Senado) por estado — R$15.000 fixo + 5 trechos aéreos (tarifa IATA). Tabela oficial.
// Fonte: https://www12.senado.leg.br/transparencia/leg/pdf/CotaExercicioAtivParlamSenadores.pdf
export const TETO_CEAPS = {
  AC: 38854.45, AL: 35056.20, AP: 42855.20, AM: 44276.60, BA: 35416.20, CE: 38186.60,
  DF: 21045.20, ES: 33176.60, GO: 21045.20, MA: 37396.60, MT: 34934.45, MS: 32905.20,
  MG: 28496.20, PA: 40426.20, PB: 35555.20, PR: 32586.60, PE: 36266.60, PI: 38834.45,
  RJ: 31816.20, RN: 35976.20, RS: 35886.60, RO: 34615.20, RR: 40724.45, SC: 32871.32,
  SP: 30226.20, SE: 41844.45, TO: 25215.20,
};
export const CEAPS_FONTE = 'https://www12.senado.leg.br/transparencia/leg/pdf/CotaExercicioAtivParlamSenadores.pdf';

// Teto MENSAL da verba de gabinete da ALESP (SP) — valor de referência documentado (Ato da Mesa).
export const TETO_ALESP_SP = 44200;

// Unificado: teto de referência conforme a casa do parlamentar (federal/senado/estadual-SP).
export function pctDoTeto({ fonteApi, casa, uf }, mediaMensal) {
  const f = (fonteApi || '').toLowerCase();
  let teto = null, tipo = null;
  if (f.includes('camara')) { teto = TETO_CEAP[uf]; tipo = 'CEAP'; }
  else if (f.includes('senado')) { teto = TETO_CEAPS[uf]; tipo = 'CEAPS'; }
  else if (f.includes('alesp') || casa === 'estadual') { teto = uf === 'SP' ? TETO_ALESP_SP : null; tipo = 'verba de gabinete'; }
  if (!teto || !mediaMensal || mediaMensal <= 0) return null;
  return { pct: Math.round((mediaMensal / teto) * 100), teto, tipo };
}
