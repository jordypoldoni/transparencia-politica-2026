// Leitura do CSV da CEAPS (Senado). Funcao pura, sem rede nem banco. (19/10/2026)
//
// BUG QUE ORIGINOU (achado ao comparar o Paim com o portal do Senado: R$388.937 no Lume contra
// R$435.766,40 la): o coletor fazia split(';') em cada linha. Nas linhas de PASSAGEM AEREA o campo
// DETALHAMENTO traz ';' dentro do texto, o que desloca todas as colunas seguintes: valor_liquido
// virava 0 e o valor real caia em id_externo_documento (ex.: "2338,36"). Efeito medido no banco:
// 2026 com 1.863 de 1.924 linhas de passagem zeradas (~R$3,1 mi escondidos), 2025 ~R$4,5 mi, 2024 ~R$3,6 mi.
//
// COMO LE AGORA: DETALHAMENTO e o unico campo de texto livre. As colunas ANTES dele sao lidas pela
// posicao a partir do inicio; as DEPOIS dele (VALOR_REEMBOLSADO, COD_DOCUMENTO), pela posicao a
// partir do FIM da linha. Tudo que sobra no meio e o DETALHAMENTO, tenha ou nao ';'. Quebra de linha
// dentro do campo: uma linha so comeca um lancamento novo se abrir com o ano ("2026";...), o resto e
// continuacao do anterior. Valor que nao parece numero NAO vira 0 calado: entra em `anomalias`.

const limpar = (c) => String(c ?? '').replace(/^"|"$/g, '').trim();
const VALOR = /^-?\d{1,3}(\.\d{3})*(,\d+)?$|^-?\d+(,\d+)?$/;

export function lerCeaps(texto) {
  const linhas = String(texto || '').split(/\r?\n/);
  let iCab = linhas.findIndex((l) => /ANO/i.test(l) && /SENADOR/i.test(l));
  if (iCab < 0) iCab = 0;
  const cab = linhas[iCab].split(';').map((c) => limpar(c).toUpperCase());
  const nCab = cab.length;
  const idx = (nome) => cab.indexOf(nome);
  const I = {
    ano: idx('ANO'), mes: idx('MES'), sen: idx('SENADOR'), tipo: idx('TIPO_DESPESA'), cnpj: idx('CNPJ_CPF'),
    forn: idx('FORNECEDOR'), doc: idx('DOCUMENTO'), data: idx('DATA'), det: idx('DETALHAMENTO'),
    valor: idx('VALOR_REEMBOLSADO'), cod: idx('COD_DOCUMENTO'),
  };
  const faltando = Object.entries(I).filter(([k, v]) => v < 0 && k !== 'det').map(([k]) => k);
  if (faltando.length) throw new Error(`CSV da CEAPS sem as colunas: ${faltando.join(', ')}`);
  // Sem DETALHAMENTO no cabecalho, nada fica "no meio": vale a posicao simples.
  const temDet = I.det >= 0;

  // Junta continuacoes de linha (campo com quebra de linha) ao lancamento anterior.
  const registros = [];
  for (let i = iCab + 1; i < linhas.length; i++) {
    const l = linhas[i];
    if (!l.trim()) continue;
    if (/^"?\d{4}"?;/.test(l) || registros.length === 0) registros.push(l);
    else registros[registros.length - 1] += ' ' + l;
  }

  const lancamentos = [];
  const anomalias = [];
  const pega = (cols, i) => {
    if (!temDet || i < I.det) return cols[i];
    if (i === I.det) return cols.slice(I.det, cols.length - (nCab - 1 - I.det)).join('; ');
    return cols[cols.length - (nCab - i)];
  };
  for (const bruto of registros) {
    const cols = bruto.split(';').map(limpar);
    if (cols.length < nCab) { anomalias.push({ motivo: 'colunas a menos', linha: bruto.slice(0, 120) }); continue; }
    const v = pega(cols, I.valor);
    if (!VALOR.test(v || '')) { anomalias.push({ motivo: 'valor que nao parece numero', valor: v, linha: bruto.slice(0, 120) }); continue; }
    lancamentos.push({
      ano: pega(cols, I.ano), mes: pega(cols, I.mes), senador: pega(cols, I.sen), tipo: pega(cols, I.tipo),
      cnpj: pega(cols, I.cnpj), fornecedor: pega(cols, I.forn), documento: pega(cols, I.doc),
      data: pega(cols, I.data), detalhamento: temDet ? pega(cols, I.det) : '', valor: v, cod: pega(cols, I.cod),
    });
  }
  return { lancamentos, anomalias, total: registros.length };
}
