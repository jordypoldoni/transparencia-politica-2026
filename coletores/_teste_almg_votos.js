// TESTE TEMPORARIO (17/10/2026): a ALMG publica como cada deputado votou? So le e imprime, nao grava nada.
// Apagar depois do teste (junto com .github/workflows/teste_almg_votos.yml).
const B = 'https://dadosabertos.almg.gov.br';
const limpa = (h) => h.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
async function pega(url) {
  try {
    const r = await fetch(url, { headers: { 'User-Agent': 'LumeCidadao/1.0 (teste de fonte)', Accept: '*/*' } });
    const t = await r.text();
    return { status: r.status, tipo: r.headers.get('content-type'), texto: t };
  } catch (e) { return { status: 0, tipo: '', texto: `ERRO: ${e.message}` }; }
}
const achaVoto = (t) => (t.match(/[^.<>]{0,90}(vota[cç]|voto|nominal|resultado)[^.<>]{0,90}/gi) || []).slice(0, 25);

async function main() {
  console.log('=== 1) Paginas de ajuda: trechos que citam votacao/voto/nominal/resultado ===');
  for (const p of ['/ws/ajuda', '/ws/plenario/ajuda', '/ws/proposicoes/ajuda', '/ws/deputados/ajuda', '/ws/legislaturas/ajuda', '/ws/comissoes/ajuda', '/ws/agenda/ajuda']) {
    const r = await pega(B + p);
    const t = limpa(r.texto);
    console.log(`\n--- ${p} (HTTP ${r.status}, ${t.length} caracteres)`);
    achaVoto(t).forEach((l) => console.log('  >', l.trim()));
  }

  console.log('\n=== 2) Ajuda de proposicoes: texto dos endpoints (parametros) ===');
  const aj = limpa((await pega(B + '/ws/proposicoes/ajuda')).texto);
  console.log(aj.slice(0, 5000));

  console.log('\n=== 3) Exemplo real: proposicoes pesquisadas (JSON) ===');
  const tentativas = [
    `${B}/ws/proposicoes/pesquisa/direcionada?tp=PL&ano=2025&formato=json&p=1&ps=2`,
    `${B}/ws/proposicoes/pesquisa/direcionada?tp=PL&ano=2025&formato=xml`,
  ];
  let amostra = null;
  for (const u of tentativas) {
    const r = await pega(u);
    console.log(`\n${u}\nHTTP ${r.status} ${r.tipo}\n${r.texto.slice(0, 1800)}`);
    if (r.status === 200 && !amostra) amostra = r.texto;
    achaVoto(r.texto).forEach((l) => console.log('  >', l.trim()));
  }

  console.log('\n=== 4) Plenario: reunioes e tipos de quorum ===');
  for (const p of ['/ws/plenario/reunioes/tipos_quorum?formato=json', '/ws/plenario/reunioes/pesquisa?ini=20251001&fim=20251031&formato=json']) {
    const r = await pega(B + p);
    console.log(`\n${p}\nHTTP ${r.status} ${r.tipo}\n${r.texto.slice(0, 1500)}`);
    achaVoto(r.texto).forEach((l) => console.log('  >', l.trim()));
  }
}
main().catch((e) => { console.error(e); process.exit(1); });
