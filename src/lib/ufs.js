import { NOMES_UF } from './cotas';

// Preposição certa para cada estado (26/09/2026, saiu de pages/comecar.js em 30/09 porque a
// página de deputados estaduais também precisa): "no Rio Grande do Sul", "na Bahia",
// "em São Paulo". O texto antigo dizia "no São Paulo" e "do Minas Gerais".
export const ARTIGO_UF = {
  AC: 'o', AP: 'o', AM: 'o', CE: 'o', DF: 'o', ES: 'o', MA: 'o', MT: 'o', MS: 'o', PA: 'o', PR: 'o', PI: 'o',
  RJ: 'o', RN: 'o', RS: 'o', TO: 'o', BA: 'a', PB: 'a',
};
export const nomeDe = (uf) => NOMES_UF[uf] || uf;
export const emUf = (uf) => ({ o: 'no ', a: 'na ' }[ARTIGO_UF[uf]] || 'em ') + nomeDe(uf);
export const deUf = (uf) => ({ o: 'do ', a: 'da ' }[ARTIGO_UF[uf]] || 'de ') + nomeDe(uf);
export const paraUf = (uf) => ({ o: 'para o ', a: 'para a ' }[ARTIGO_UF[uf]] || 'para ') + nomeDe(uf);
