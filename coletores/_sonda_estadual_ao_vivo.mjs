// Sonda (25/09/2026): da para servir deputado ESTADUAL ao vivo, sem guardar no banco?
// Mede pelo MESMO caminho que a Vercel usaria em producao (ponte tse-ponte), por UF:
// tamanho e tempo da listagem do cargo 7, campos de cada item, e uma ficha completa.
// Uso: node coletores/_sonda_estadual_ao_vivo.mjs
import 'dotenv/config';

const PONTE = `${process.env.SUPABASE_URL}/functions/v1/tse-ponte`;
const TOKEN = process.env.PONTE_TOKEN || '';
const ANO = 2026, ID_LISTA = 6257, ID_ELEICAO = 20322002026, CARGO = 7;

async function viaPonte(caminho) {
  const t0 = Date.now();
  const r = await fetch(`${PONTE}?caminho=${encodeURIComponent(caminho)}`, { headers: { Authorization: `Bearer ${TOKEN}` } });
  const texto = await r.text();
  return { status: r.status, erro: r.headers.get('x-ponte-erro'), ms: Date.now() - t0, bytes: Buffer.byteLength(texto), texto };
}

let exemplo = null;
for (const uf of ['SP', 'RS', 'RR']) {
  const r = await viaPonte(`/divulga/rest/v1/candidatura/listar/${ANO}/${uf}/${ID_LISTA}/${CARGO}/candidatos`);
  if (r.erro || r.status !== 200) { console.log(`${uf}: http=${r.status} ${r.erro || r.texto.slice(0, 120)}`); continue; }
  const lista = JSON.parse(r.texto).candidatos || [];
  console.log(`${uf}: ${lista.length} candidatos · ${(r.bytes / 1024).toFixed(0)} KB · ${r.ms} ms`);
  if (!exemplo && lista.length) exemplo = { uf, c: lista[0] };
}

if (exemplo) {
  console.log(`\nCampos de um item da LISTAGEM (${Object.keys(exemplo.c).length}):`);
  console.log(Object.entries(exemplo.c).map(([k, v]) => `  ${k}: ${v === null ? 'null' : typeof v === 'object' ? JSON.stringify(v).slice(0, 70) : String(v).slice(0, 70)}`).join('\n'));
  const f = await viaPonte(`/divulga/rest/v1/candidatura/buscar/${ANO}/${exemplo.uf}/${ID_ELEICAO}/candidato/${exemplo.c.id}`);
  console.log(`\nFICHA de 1 candidato: http=${f.status} · ${(f.bytes / 1024).toFixed(1)} KB · ${f.ms} ms`);
  if (f.status === 200 && f.texto) {
    const j = JSON.parse(f.texto);
    console.log(`  fotoUrl presente: ${!!j.fotoUrl} · publicavel: ${j.fotoUrlPublicavel} · host: ${j.fotoUrl ? new URL(j.fotoUrl).host : '-'}`);
  }
}
