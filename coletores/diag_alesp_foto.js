// Diagnóstico de FOTO da ALESP (v8) — extrai o campo txFotoGrande do feed da SPA.
// Uso: node coletores/diag_alesp_foto.js

const ALVOS = { '300607': 'tem foto (biografia)', '300608': 'sem pasta', '300466': 'sem pasta' };

async function feed(mat) {
  const ctrl = new AbortController(); const to = setTimeout(() => ctrl.abort(), 20000);
  try {
    const res = await fetch(`https://www.al.sp.gov.br/deputado/dados/?matricula=${mat}`, { signal: ctrl.signal, headers: { 'User-Agent': 'Mozilla/5.0' } });
    return await res.text();
  } catch (e) { return 'ERRO: ' + e.message; } finally { clearTimeout(to); }
}

for (const [mat, nota] of Object.entries(ALVOS)) {
  const txt = await feed(mat);
  // procura txFotoGrande, txFotoMedia, txFoto... e valores próximos
  const campos = [...txt.matchAll(/"?(txFoto[A-Za-z]*)"?\s*[:=]\s*("?[^",}\n]*"?)/gi)].map((m) => `${m[1]}=${m[2]}`);
  console.log(`\n— mat ${mat} (${nota})`);
  console.log(`  campos txFoto*: ${[...new Set(campos)].slice(0, 8).join('  |  ') || '— nenhum —'}`);
}
console.log('\nPronto. Me cola tudo.');
