// Sonda: o arquivo anual da cota parlamentar existe e continua sendo atualizado?
// So le cabecalho (HEAD), nao baixa o arquivo. Nao escreve no banco.
const alvos = [
  'https://www.camara.leg.br/cotas/Ano-2026.csv.zip',
  'https://www.camara.leg.br/cotas/Ano-2025.csv.zip',
  'https://www.camara.leg.br/cotas/Ano-2026.json.zip',
  'https://www.camara.leg.br/cotas/Ano-2026.xlsx',
];

for (const url of alvos) {
  try {
    const res = await fetch(url, { method: 'HEAD', redirect: 'follow' });
    const tam = res.headers.get('content-length');
    const mb = tam ? (Number(tam) / 1048576).toFixed(1) + ' MB' : 'sem content-length';
    console.log(
      `${url.split('/').pop().padEnd(18)} http=${res.status} ${mb.padEnd(14)}` +
      ` tipo=${res.headers.get('content-type') || '-'} publicado=${res.headers.get('last-modified') || '-'}`
    );
  } catch (e) {
    console.log(`${url.split('/').pop().padEnd(18)} FALHOU: ${e.message}`);
  }
  await new Promise(r => setTimeout(r, 300));
}
