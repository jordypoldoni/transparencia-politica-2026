// Sonda de diagnostico: por que /deputados/{id}/despesas volta vazio para 2026.
// Nao escreve nada no banco. Roda: node coletores/_sonda_gastos_camara.mjs
const API = 'https://dadosabertos.camara.leg.br/api/v2';
const ID = process.argv[2] || '220548'; // Camila Jara

const casos = [
  ['atual, ano=2026',        `${API}/deputados/${ID}/despesas?ano=2026&itens=100&ordem=DESC&ordenarPor=dataDocumento`],
  ['so ano=2026',            `${API}/deputados/${ID}/despesas?ano=2026`],
  ['ano=2026&mes=2',         `${API}/deputados/${ID}/despesas?ano=2026&mes=2`],
  ['sem parametro nenhum',   `${API}/deputados/${ID}/despesas`],
  ['controle, ano=2025',     `${API}/deputados/${ID}/despesas?ano=2025&itens=100&ordem=DESC&ordenarPor=dataDocumento`],
  ['controle, ano=2024',     `${API}/deputados/${ID}/despesas?ano=2024&itens=100&ordem=DESC&ordenarPor=dataDocumento`],
];

console.log(`Deputado id=${ID}\n`);
for (const [rotulo, url] of casos) {
  try {
    const res = await fetch(url, { headers: { Accept: 'application/json' } });
    const txt = await res.text();
    let n = '?', primeira = '', anos = '';
    try {
      const j = JSON.parse(txt);
      const d = j.dados || [];
      n = d.length;
      if (d.length) {
        primeira = ` | 1a: ${d[0].ano}/${d[0].mes} ${d[0].dataDocumento || ''} R$ ${d[0].valorLiquido}`;
        anos = ` | anos na pagina: ${[...new Set(d.map(x => x.ano))].join(',')}`;
      }
    } catch { primeira = ` | corpo nao e JSON: ${txt.slice(0, 120)}`; }
    console.log(`${rotulo.padEnd(24)} http=${res.status} bytes=${txt.length} itens=${n}${anos}${primeira}`);
  } catch (e) {
    console.log(`${rotulo.padEnd(24)} FALHOU: ${e.message}`);
  }
  await new Promise(r => setTimeout(r, 300));
}
