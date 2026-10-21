// Diagnóstico SÓ DE LEITURA do arquivo anual da cota da Câmara (não toca no banco). (21/10/2026)
//
// POR QUE EXISTE: em 2026 o banco não tem nenhuma linha de "PASSAGEM AÉREA - SIGEPA" (2025: R$ 45,8 mi).
// Os logs de job do Actions não são legíveis daqui, então o resultado sai como anotações (::notice),
// que a API de check-runs devolve. Conta o arquivo por tipo de despesa e mostra o caso do Marcio Alvino.
//
// Uso: node coletores/diagnostico_cota_arquivo.js 2026 [ideCadastro]
import { lerCsv, paraNumero, baixarCotaAnual } from './cota_arquivo.js';

const ANO = process.argv[2] || '2026';
const CAD = process.argv[3] || '178983';
const nota = (titulo, linhas) =>
  console.log(`::notice title=${titulo}::${linhas.join('%0A')}`);

const linhas = lerCsv(await baixarCotaAnual(ANO));
const cab = linhas.shift().map((c) => c.trim());
console.log('colunas:', cab.join(' | '));
const i = (n) => cab.indexOf(n);
const iDesc = i('txtDescricao'), iVlr = i('vlrLiquido'), iAno = i('numAno'), iMes = i('numMes'),
  iCad = i('ideCadastro'), iSub = i('txtDescricaoEspecificacao'), iForn = i('txtFornecedor');

const porTipo = new Map();
for (const l of linhas) {
  if (l.length < cab.length - 2) continue;
  if ((l[iAno] || '').trim() !== String(ANO)) continue;
  const t = (l[iDesc] || '').trim();
  const o = porTipo.get(t) || { n: 0, v: 0 };
  o.n++; o.v += paraNumero(l[iVlr]);
  porTipo.set(t, o);
}
const ordenado = [...porTipo.entries()].sort((a, b) => b[1].v - a[1].v);
nota(`colunas do arquivo ${ANO}`, [cab.join(' | '), `${linhas.length} linhas no total`]);
nota(`tipos no arquivo ${ANO} (linhas e R$)`,
  ordenado.map(([t, o]) => `${t.slice(0, 55)}: ${o.n} / ${Math.round(o.v)}`));

const alv = new Map();
let totAlv = 0;
for (const l of linhas) {
  if (l.length < cab.length - 2) continue;
  if ((l[iCad] || '').trim() !== CAD || (l[iAno] || '').trim() !== String(ANO)) continue;
  const k = `${(l[iMes] || '').trim().padStart(2, '0')} ${(l[iDesc] || '').trim().slice(0, 40)}`;
  const v = paraNumero(l[iVlr]);
  alv.set(k, (alv.get(k) || 0) + v);
  totAlv += v;
}
nota(`cadastro ${CAD} em ${ANO} por mês e tipo (total ${totAlv.toFixed(2)})`,
  [...alv.entries()].sort().map(([k, v]) => `${k}: ${v.toFixed(2)}`));
