// DIAGNOSTICO (nao grava nada no banco): descobre por que `situacao_candidatura` e `reeleicao`
// ficaram NULOS nos 7.703 candidatos.
//
// Duas hipoteses possiveis, e este script separa uma da outra:
//   A) O NOME da coluna no CSV do TSE e diferente do que o coletor procura.
//   B) A coluna existe, mas o valor vem como sentinela do TSE (#NULO#, #NE#, -1), que o
//      leitor converte em null de proposito.
//
// Uso:  node coletores/diag_tse_campos.js         (baixa o zip e olha o CSV de RR, o menor)
//       node coletores/diag_tse_campos.js SP      (outro estado)
//
// Nao precisa de credenciais do Supabase: so le o arquivo do TSE e imprime.

import fs from 'fs';
import os from 'os';
import path from 'path';
import AdmZip from 'adm-zip';
import iconv from 'iconv-lite';

const ANO = 2026;
const UF = (process.argv[2] || 'RR').toUpperCase();
const URL = `https://cdn.tse.jus.br/estatistica/sead/odsele/consulta_cand/consulta_cand_${ANO}.zip`;

const PROCURADAS = [
  'DS_SITUACAO_CANDIDATURA',
  'DS_DETALHE_SITUACAO_CAND',
  'ST_REELEICAO',
];

console.log(`Baixando ${URL} …`);
const r = await fetch(URL);
if (!r.ok) { console.error(`HTTP ${r.status} ao baixar o zip do TSE.`); process.exit(1); }
const tmp = path.join(os.tmpdir(), `diag_tse_${ANO}.zip`);
fs.writeFileSync(tmp, Buffer.from(await r.arrayBuffer()));
const zip = new AdmZip(tmp);

const alvo = zip.getEntries().find((e) => new RegExp(`_${UF}\\.csv$`, 'i').test(e.entryName));
if (!alvo) {
  console.error(`Nao achei CSV de ${UF}. Arquivos no zip:`);
  zip.getEntries().slice(0, 40).forEach((e) => console.error('  ' + e.entryName));
  process.exit(1);
}
console.log(`Lendo ${alvo.entryName}\n`);

const texto = iconv.decode(alvo.getData(), 'latin1');
const linhas = texto.split(/\r?\n/).filter(Boolean);
const parse = (l) => l.split(';').map((c) => c.replace(/^"|"$/g, ''));
const headers = parse(linhas[0]).map((h) => h.trim().toUpperCase());

console.log(`Total de colunas: ${headers.length} · linhas: ${linhas.length - 1}\n`);

console.log('=== 1) As colunas que o coletor procura existem? ===');
for (const nome of PROCURADAS) {
  const i = headers.indexOf(nome);
  console.log(`  ${nome.padEnd(28)} ${i >= 0 ? `SIM (coluna ${i})` : 'NAO ENCONTRADA'}`);
}

console.log('\n=== 2) Colunas do CSV que parecem ser essas (por palavra-chave) ===');
headers.forEach((h, i) => {
  if (/SITUAC|REELEI|DETALHE/i.test(h)) console.log(`  [${i}] ${h}`);
});

console.log('\n=== 3) Valores reais nas 5 primeiras linhas de DEPUTADO FEDERAL ===');
const iCargo = headers.indexOf('DS_CARGO');
let vistos = 0;
const contagem = {};
for (let i = 1; i < linhas.length && vistos < 5; i++) {
  const row = parse(linhas[i]);
  if ((row[iCargo] || '').toUpperCase().trim() !== 'DEPUTADO FEDERAL') continue;
  vistos++;
  const partes = headers
    .map((h, k) => (/SITUAC|REELEI|DETALHE/i.test(h) ? `${h}="${row[k]}"` : null))
    .filter(Boolean);
  console.log(`  ${row[headers.indexOf('NM_URNA_CANDIDATO')]} → ${partes.join(' · ')}`);
}

console.log('\n=== 4) Distribuicao dos valores no estado inteiro (so DEPUTADO FEDERAL) ===');
const alvos = headers.map((h, k) => (/SITUAC|REELEI/i.test(h) ? { h, k } : null)).filter(Boolean);
for (let i = 1; i < linhas.length; i++) {
  const row = parse(linhas[i]);
  if ((row[iCargo] || '').toUpperCase().trim() !== 'DEPUTADO FEDERAL') continue;
  for (const { h, k } of alvos) {
    contagem[h] = contagem[h] || {};
    const v = row[k] === '' ? '(vazio)' : row[k];
    contagem[h][v] = (contagem[h][v] || 0) + 1;
  }
}
for (const [h, mapa] of Object.entries(contagem)) {
  const top = Object.entries(mapa).sort((a, b) => b[1] - a[1]).slice(0, 6);
  console.log(`  ${h}: ${top.map(([v, n]) => `"${v}"=${n}`).join(' · ')}`);
}
