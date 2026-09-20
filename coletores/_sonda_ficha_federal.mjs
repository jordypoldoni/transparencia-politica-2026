// Sonda: descobrir como se pede a FICHA de um deputado federal no DivulgaCandContas.
// A ficha do presidente usa abrangencia BR e idEleicao 20322002026. Deputado federal e por UF,
// entao o idEleicao muda, e pedir com o errado devolve 200 com corpo vazio (nao erro).
// Nao escreve nada. Uso: node coletores/_sonda_ficha_federal.mjs
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const PONTE = process.env.TSE_PONTE_URL || 'https://fedxytdorrecllugnicu.supabase.co/functions/v1/tse-ponte';
const TOKEN = process.env.PONTE_TOKEN;
const REST = '/divulga/rest/v1';
const ANO = 2026;
const CARGO_DEP_FEDERAL = 6;

async function tse(caminho) {
  const r = await fetch(`${PONTE}?caminho=${encodeURIComponent(caminho)}`, { headers: { Authorization: `Bearer ${TOKEN}` } });
  const erro = r.headers.get('x-ponte-erro');
  const txt = await r.text();
  return { status: r.status, erro, txt };
}

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const { data: amostra } = await supabase
  .from('candidatos_deputado_federal')
  .select('uf, nome_urna, sq_candidato').in('uf', ['RS', 'SP', 'AC']).limit(3);

// 1) A LISTAGEM por UF: e ela que deve revelar o idEleicao daquela UF.
for (const uf of ['RS']) {
  const r = await tse(`${REST}/candidatura/listar/${ANO}/${uf}/6257/${CARGO_DEP_FEDERAL}/candidatos`);
  console.log(`listar ${uf} (idEleicaoLista 6257): http=${r.status} bytes=${r.txt.length}${r.erro ? ' ERRO: ' + r.erro : ''}`);
  try {
    const j = JSON.parse(r.txt);
    const c = (j.candidatos || [])[0];
    console.log(`  candidatos: ${(j.candidatos || []).length}`);
    if (c) {
      console.log(`  chaves do 1o: ${Object.keys(c).join(', ')}`);
      console.log(`  amostra: ${JSON.stringify(c).slice(0, 400)}`);
    }
  } catch { console.log('  corpo nao e JSON: ' + r.txt.slice(0, 200)); }
}

// 2) A FICHA: tenta abrangencia UF e BR, com o idEleicao do presidente, so para ver o que muda.
for (const c of amostra || []) {
  for (const [rotulo, caminho] of [
    [`ficha ${c.uf} via UF `, `${REST}/candidatura/buscar/${ANO}/${c.uf}/20322002026/candidato/${c.sq_candidato}`],
    [`ficha ${c.uf} via BR `, `${REST}/candidatura/buscar/${ANO}/BR/20322002026/candidato/${c.sq_candidato}`],
  ]) {
    const r = await tse(caminho);
    let pista = '';
    try { const j = JSON.parse(r.txt); pista = ` | nome=${j.nomeUrna || j.nomeCompleto || '(vazio)'} campos=${Object.keys(j).length}`; } catch {}
    console.log(`${rotulo} ${c.nome_urna.padEnd(18)} http=${r.status} bytes=${r.txt.length}${r.erro ? ' ERRO: ' + r.erro : ''}${pista}`);
    await new Promise((res) => setTimeout(res, 400));
  }
}
