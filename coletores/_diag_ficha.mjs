// _diag_ficha.mjs — inventário do que a ficha do TSE realmente entrega. (16/09/2026)
// Descartável, não toca no banco.
//
// O Jordy quer trazer para o site tudo que a página do candidato no DivulgaCandContas mostra.
// São 81 campos, e na LISTAGEM a maioria vinha nula — mas a ficha individual é outro bicho
// (nascimento, ocupação e bens já apareceram preenchidos). Antes de desenhar qualquer tela,
// este script responde: QUAIS campos vêm com valor, em quantos candidatos, e com que cara.
//
// Testa nos 14 presidenciáveis, não em três: campo que só o Lula tem não serve de base para
// uma seção fixa da ficha, e campo preenchido em 14 de 14 pode virar seção sem medo.

const ID_ELEICAO = 20322002026;
const UA = { 'User-Agent': 'Mozilla/5.0', Accept: 'application/json' };
const LISTAGEM = `https://divulgacandcontas.tse.jus.br/divulga/rest/v1/candidatura/listar/2026/BR/6257/1/candidatos`;

const lista = (await (await fetch(LISTAGEM, { headers: UA })).json()).candidatos || [];
console.log(`Buscando a ficha completa dos ${lista.length} presidenciáveis…\n`);

const fichas = [];
for (const c of lista) {
  const url = `https://divulgacandcontas.tse.jus.br/divulga/rest/v1/candidatura/buscar/2026/BR/${ID_ELEICAO}/candidato/${c.id}`;
  try {
    const j = await (await fetch(url, { headers: UA })).json();
    fichas.push({ nome: c.nomeUrna, j });
  } catch (e) { console.log(`   falhou ${c.nomeUrna}: ${e.message}`); }
  await new Promise((r) => setTimeout(r, 250));   // educação com a fonte
}
console.log(`${fichas.length} fichas obtidas.\n`);

// ---------- quais campos têm valor, e em quantos ----------
const chaves = [...new Set(fichas.flatMap((f) => Object.keys(f.j)))].sort();
const preenchido = (v) => !(v === null || v === undefined || v === '' || (Array.isArray(v) && v.length === 0));

console.log('=== CAMPOS PREENCHIDOS (ordenados por cobertura) ===');
const linhas = chaves.map((k) => {
  const comValor = fichas.filter((f) => preenchido(f.j[k]));
  const ex = comValor[0]?.j[k];
  const tipo = Array.isArray(ex) ? `array[${ex.length}]` : ex && typeof ex === 'object' ? 'objeto' : typeof ex;
  const amostra = ex === undefined ? '' : (typeof ex === 'object' ? JSON.stringify(ex) : String(ex)).slice(0, 55);
  return { k, n: comValor.length, tipo, amostra };
}).sort((a, b) => b.n - a.n || a.k.localeCompare(b.k));

for (const l of linhas) {
  if (l.n === 0) continue;
  console.log(`  ${String(l.n).padStart(2)}/${fichas.length}  ${l.k.padEnd(32)} ${String(l.tipo).padEnd(10)} ${l.amostra}`);
}
const vazios = linhas.filter((l) => l.n === 0).map((l) => l.k);
console.log(`\n  (${vazios.length} campos vazios em TODOS: ${vazios.join(', ').slice(0, 300)})`);

// ---------- os campos compostos, por dentro ----------
console.log('\n=== DENTRO DOS CAMPOS COMPOSTOS ===');
for (const campo of ['bens', 'eleicoesAnteriores', 'processosCassacao', 'arquivos', 'emails', 'sites', 'motivos', 'partido', 'cargo']) {
  const f = fichas.find((x) => preenchido(x.j[campo]));
  if (!f) { console.log(`  ${campo}: vazio em todos`); continue; }
  const v = f.j[campo];
  const primeiro = Array.isArray(v) ? v[0] : v;
  console.log(`\n  ${campo} (exemplo: ${f.nome}${Array.isArray(v) ? `, ${v.length} itens` : ''})`);
  console.log(`    chaves: ${primeiro && typeof primeiro === 'object' ? Object.keys(primeiro).join(', ') : '(valor simples)'}`);
  console.log('    ' + JSON.stringify(primeiro).slice(0, 400));
}

// ---------- bens: o dado de maior interesse público ----------
console.log('\n=== BENS DECLARADOS, por candidato ===');
for (const f of fichas.sort((a, b) => (b.j.totalDeBens || 0) - (a.j.totalDeBens || 0))) {
  const total = f.j.totalDeBens;
  const n = Array.isArray(f.j.bens) ? f.j.bens.length : 0;
  const fmt = total == null ? '(não informado)' : Number(total).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  console.log(`  ${String(f.nome).slice(0, 26).padEnd(28)} ${fmt.padStart(20)}   ${n} item(ns) detalhado(s)`);
}
