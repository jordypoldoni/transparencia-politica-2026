// TESTE TEMPORARIO (17/10/2026), rodada 3: o detalhe de uma reuniao de plenario da ALMG traz
// voto por deputado? So le e imprime, nao grava nada. Apagar depois (junto com o workflow teste_almg_votos.yml).
const B = 'https://dadosabertos.almg.gov.br';
const espera = (ms) => new Promise((r) => setTimeout(r, ms));
async function pega(url) {
  await espera(4000); // a ALMG devolve 429 se as chamadas vierem em sequencia
  try {
    const r = await fetch(url, { headers: { 'User-Agent': 'LumeCidadao/1.0 (teste de fonte)', Accept: 'application/json' } });
    return { status: r.status, texto: await r.text() };
  } catch (e) { return { status: 0, texto: `ERRO: ${e.message}` }; }
}
// Percorre o JSON e lista os CAMINHOS dos campos cujo nome fala de voto/resultado/presenca/deputado.
function caminhos(o, pref = '', saida = new Map(), d = 0) {
  if (d > 9 || !o || typeof o !== 'object') return saida;
  if (Array.isArray(o)) { if (o.length) caminhos(o[0], pref + '[]', saida, d + 1); return saida; }
  for (const k of Object.keys(o)) {
    const c = pref ? `${pref}.${k}` : k;
    if (/vot|result|presen|deputad|parlament|nominal|quorum/i.test(k)) {
      const v = o[k];
      saida.set(c, Array.isArray(v) ? `lista(${v.length})` : (v && typeof v === 'object') ? 'objeto' : JSON.stringify(v));
    }
    caminhos(o[k], c, saida, d + 1);
  }
  return saida;
}
async function detalhe(titulo, url) {
  const r = await pega(url);
  console.log(`\n=== ${titulo}\n${url}\nHTTP ${r.status}, ${r.texto.length} caracteres`);
  if (r.status !== 200) { console.log(r.texto.slice(0, 300)); return null; }
  let j; try { j = JSON.parse(r.texto); } catch { console.log(r.texto.slice(0, 800)); return null; }
  const c = caminhos(j);
  console.log(`Campos de voto/resultado/presenca/deputado (${c.size}):`);
  [...c.entries()].slice(0, 70).forEach(([k, v]) => console.log(`  ${k} = ${v}`));
  return { j, texto: r.texto };
}
async function main() {
  // 1) Uma reuniao com resultado completo (2025-10-01 14:00, idReuniao 8328, vista no teste anterior).
  const reu = await detalhe('Detalhe da reuniao de plenario 01/10/2025 14:00', `${B}/ws/plenario/reunioes/2025/10/01/14:00?formato=json`);
  if (reu) console.log('\nINICIO DO JSON (3000 caracteres):\n' + reu.texto.slice(0, 3000));
  // 2) Variacoes comuns de caminho, caso a primeira nao exista.
  if (!reu) {
    await detalhe('Variacao: sem zero no dia/mes', `${B}/ws/plenario/reunioes/2025/10/1/14:00?formato=json`);
    await detalhe('Variacao: hora sem dois pontos', `${B}/ws/plenario/reunioes/2025/10/01/1400?formato=json`);
  }
}
main().catch((e) => { console.error(e); process.exit(1); });
