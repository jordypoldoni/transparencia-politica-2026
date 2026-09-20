// Sonda: dimensiona o arquivo anual da cota ja baixado em %TEMP%\cota2026.
// So le e conta. Nao baixa, nao escreve no banco.
import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline';

const dir = path.join(process.env.TEMP || '/tmp', 'cota2026');
const arq = fs.readdirSync(dir).find(f => f.toLowerCase().endsWith('.csv'));
if (!arq) { console.error('CSV nao encontrado em ' + dir); process.exit(1); }
const caminho = path.join(dir, arq);
console.log(`Arquivo: ${caminho} (${(fs.statSync(caminho).size / 1048576).toFixed(1)} MB)\n`);

const rl = readline.createInterface({ input: fs.createReadStream(caminho, 'utf8'), crlfDelay: Infinity });

let cab = null, idxCad, idxAno, idxMes, idxVlr, idxDoc;
let total = 0, semCadastro = 0, foraDe2026 = 0, soma = 0;
const ids = new Set(), porMes = {}, docs = new Set();
let docsRepetidos = 0;

for await (const linha of rl) {
  if (!linha.trim()) continue;
  const c = linha.split('";"').map(s => s.replace(/^"|"$/g, ''));
  if (!cab) {
    cab = c;
    idxCad = cab.indexOf('ideCadastro'); idxAno = cab.indexOf('numAno');
    idxMes = cab.indexOf('numMes'); idxVlr = cab.indexOf('vlrLiquido');
    idxDoc = cab.indexOf('ideDocumento');
    continue;
  }
  total++;
  const cad = (c[idxCad] || '').trim();
  if (!cad) { semCadastro++; continue; }
  if ((c[idxAno] || '').trim() !== '2026') { foraDe2026++; continue; }
  ids.add(cad);
  const m = (c[idxMes] || '?').trim();
  porMes[m] = (porMes[m] || 0) + 1;
  soma += Number((c[idxVlr] || '0').replace(',', '.')) || 0;
  const d = (c[idxDoc] || '').trim();
  if (d) { if (docs.has(d)) docsRepetidos++; else docs.add(d); }
}

const aproveitaveis = total - semCadastro - foraDe2026;
console.log(`linhas no arquivo ........ ${total}`);
console.log(`sem ideCadastro (liderancas/orgaos, descartar) ... ${semCadastro}`);
console.log(`numAno diferente de 2026 (descartar) ............ ${foraDe2026}`);
console.log(`APROVEITAVEIS ............ ${aproveitaveis}`);
console.log(`deputados distintos ...... ${ids.size}`);
console.log(`ideDocumento repetido .... ${docsRepetidos}`);
console.log(`soma vlrLiquido .......... R$ ${soma.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}`);
console.log(`\nlinhas por mes: ${Object.keys(porMes).sort((a, b) => a - b).map(m => `${m}:${porMes[m]}`).join('  ')}`);
