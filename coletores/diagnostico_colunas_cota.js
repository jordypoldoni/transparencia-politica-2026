// Diagnóstico SÓ DE LEITURA das colunas do arquivo anual da cota da Câmara que o coletor NÃO guarda. (21/10/2026)
// Mede quanto cada coluna traz de informação (linhas preenchidas, valores) para decidir se vale gravá-la.
// Resultado como anotações (::notice), que a API de check-runs devolve. Não toca no banco.
//
// Uso: node coletores/diagnostico_colunas_cota.js 2026
import { lerCsv, paraNumero, baixarCotaAnual } from './cota_arquivo.js';

const ANO = process.argv[2] || '2026';
const nota = (titulo, linhas) => console.log(`::notice title=${titulo}::${linhas.join('%0A')}`);

const linhas = lerCsv(await baixarCotaAnual(ANO));
const cab = linhas.shift().map((c) => c.trim());
const i = (n) => cab.indexOf(n);
const f = (l, n) => (i(n) < 0 ? '' : (l[i(n)] || '').trim());
const dados = linhas.filter((l) => l.length >= cab.length - 2 && f(l, 'numAno') === String(ANO) && f(l, 'ideCadastro'));

nota(`colunas e linhas de deputado em ${ANO}`, [cab.join(' | '), `${dados.length} linhas de deputado`]);

let glosaN = 0, glosaV = 0, dif = 0, restN = 0, restV = 0, tre = 0, pas = 0, parc = 0, lote = 0, ress = 0, dpag = 0, numDoc = 0;
const amostraGlosa = [];
const tiposComTrecho = new Map();
for (const l of dados) {
  const doc = paraNumero(f(l, 'vlrDocumento')), gl = paraNumero(f(l, 'vlrGlosa')), liq = paraNumero(f(l, 'vlrLiquido'));
  if (gl !== 0) { glosaN++; glosaV += gl; if (amostraGlosa.length < 5) amostraGlosa.push(`${f(l, 'txtDescricao').slice(0, 30)} doc ${doc} glosa ${gl} liq ${liq}`); }
  if (Math.abs(doc - gl - liq) > 0.01) dif++;
  const r = paraNumero(f(l, 'vlrRestituicao'));
  if (r !== 0) { restN++; restV += r; }
  if (f(l, 'txtTrecho')) { tre++; const t = f(l, 'txtDescricao').slice(0, 40); tiposComTrecho.set(t, (tiposComTrecho.get(t) || 0) + 1); }
  if (f(l, 'txtPassageiro')) pas++;
  if (f(l, 'numParcela') && f(l, 'numParcela') !== '0') parc++;
  if (f(l, 'numLote')) lote++;
  if (f(l, 'numRessarcimento')) ress++;
  if (f(l, 'datPagamentoRestituicao')) dpag++;
  if (f(l, 'txtNumero')) numDoc++;
}
nota(`preenchimento das colunas não guardadas (${ANO})`, [
  `vlrGlosa diferente de zero: ${glosaN} linhas, soma ${glosaV.toFixed(2)}`,
  `linhas em que vlrDocumento - vlrGlosa difere de vlrLiquido: ${dif}`,
  `vlrRestituicao diferente de zero: ${restN} linhas, soma ${restV.toFixed(2)}`,
  `txtTrecho preenchido: ${tre}; txtPassageiro preenchido: ${pas}`,
  `numParcela > 0: ${parc}; numLote: ${lote}; numRessarcimento: ${ress}; datPagamentoRestituicao: ${dpag}; txtNumero (nº do documento): ${numDoc}`,
]);
nota('amostra de glosa', amostraGlosa.length ? amostraGlosa : ['(nenhuma)']);
nota('tipos que trazem trecho', [...tiposComTrecho.entries()].sort((a, b) => b[1] - a[1]).map(([t, n]) => `${t}: ${n}`));

// Detalhe das restituições e das linhas em que documento - glosa não bate com o líquido. (21/10/2026, 2ª medição)
const rest = [];
const disc = { comRest: 0, liqNeg: 0, docZero: 0, outras: 0, somaOutras: 0 };
const amostraOutras = [];
for (const l of dados) {
  const doc = paraNumero(f(l, 'vlrDocumento')), gl = paraNumero(f(l, 'vlrGlosa')), liq = paraNumero(f(l, 'vlrLiquido')), r = paraNumero(f(l, 'vlrRestituicao'));
  if (r !== 0) rest.push(`cad ${f(l, 'ideCadastro')} mês ${f(l, 'numMes')} | ${f(l, 'txtDescricao').slice(0, 28)} | doc ${doc} glosa ${gl} liq ${liq} rest ${r} | pagto ${f(l, 'datPagamentoRestituicao').slice(0, 10)} | ressarc ${f(l, 'numRessarcimento')}`);
  if (Math.abs(doc - gl - liq) > 0.01) {
    if (r !== 0) disc.comRest++;
    else if (liq < 0) disc.liqNeg++;
    else if (doc === 0) disc.docZero++;
    else { disc.outras++; disc.somaOutras += doc - gl - liq; if (amostraOutras.length < 6) amostraOutras.push(`${f(l, 'txtDescricao').slice(0, 28)} doc ${doc} glosa ${gl} liq ${liq}`); }
  }
}
nota('restituições (todas as linhas)', rest.length ? rest.slice(0, 30) : ['(nenhuma)']);
nota('linhas em que doc - glosa difere do líquido: por que', [
  `com restituição: ${disc.comRest}`, `líquido negativo: ${disc.liqNeg}`, `documento zero: ${disc.docZero}`,
  `outras: ${disc.outras} (diferença somada ${disc.somaOutras.toFixed(2)})`, ...amostraOutras,
]);
