// Sonda: mede o ARQUIVO ESTATICO de deputados da Camara, que nao depende da API quebrada
// (issues 382/383). Queremos cadastrar os deputados que aparecem no CSV da cota mas nao estao
// em agentes_politicos: suplentes que assumiram no meio do mandato, cujos gastos o coletor
// descarta hoje por nao ter a quem pendurar.
// Uso: node coletores/_sonda_arquivo_deputados.mjs
import 'dotenv/config';

const URL = 'https://dadosabertos.camara.leg.br/arquivos/deputados/csv/deputados.csv';

function lerCsv(texto, limite = 4) {
  const linhas = texto.split(/\r?\n/).filter(Boolean).slice(0, limite);
  return linhas.map((l) => l.split(';'));
}

async function main() {
  console.log('\nSonda: arquivo estatico de deputados da Camara\n');
  const r = await fetch(URL, { headers: { 'User-Agent': 'Mozilla/5.0' } });
  console.log(`  HTTP ${r.status} · ${r.headers.get('content-type')}`);
  if (!r.ok) { console.log('  a fonte recusou'); return; }
  const texto = await r.text();
  console.log(`  ${(texto.length / 1048576).toFixed(1)} MB · ${texto.split(/\r?\n/).length} linhas\n`);

  const amostra = lerCsv(texto);
  console.log('  COLUNAS:');
  amostra[0].forEach((c, i) => console.log(`    ${String(i).padStart(2)} ${c}`));
  console.log('\n  PRIMEIRAS LINHAS:');
  for (const l of amostra.slice(1)) {
    console.log('    ' + amostra[0].map((c, i) => `${c}=${(l[i] || '').slice(0, 40)}`).join(' | '));
  }
}

main().catch((e) => { console.error('Erro:', e.message); process.exitCode = 1; });
