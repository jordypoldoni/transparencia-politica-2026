// Sonda: o que vem em `eleicoesAnteriores` na ficha do TSE? Nao grava nada.
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const PONTE = process.env.TSE_PONTE_URL || 'https://fedxytdorrecllugnicu.supabase.co/functions/v1/tse-ponte';
const TOKEN = process.env.PONTE_TOKEN;
const REST = '/divulga/rest/v1/candidatura';

async function ficha(uf, sq) {
  const caminho = `${REST}/buscar/2026/${uf}/20322002026/candidato/${sq}`;
  const r = await fetch(`${PONTE}?caminho=${encodeURIComponent(caminho)}`, { headers: { Authorization: `Bearer ${TOKEN}` } });
  const txt = await r.text();
  return txt ? JSON.parse(txt) : null;
}

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
// Mistura de perfis: quem já é deputado (tem passado) e quem é estreante.
const { data: amostra } = await supabase
  .from('candidatos_deputado_federal')
  .select('uf, nome_urna, sq_candidato, agente_id')
  .in('uf', ['RS', 'SP'])
  .not('agente_id', 'is', null)
  .limit(4);
const { data: novatos } = await supabase
  .from('candidatos_deputado_federal')
  .select('uf, nome_urna, sq_candidato, agente_id')
  .eq('uf', 'RS').is('agente_id', null).limit(3);

for (const c of [...(amostra || []), ...(novatos || [])]) {
  const f = await ficha(c.uf, c.sq_candidato);
  const ea = f?.eleicoesAnteriores;
  const marca = c.agente_id ? 'em exercício' : 'sem mandato atual';
  if (!Array.isArray(ea)) { console.log(`${c.nome_urna} (${c.uf}, ${marca}): eleicoesAnteriores = ${JSON.stringify(ea)}`); continue; }
  console.log(`\n${c.nome_urna} (${c.uf}, ${marca}): ${ea.length} eleições anteriores`);
  if (ea.length) {
    console.log(`  chaves: ${Object.keys(ea[0]).join(', ')}`);
    for (const e of ea.slice(0, 4)) console.log(`  ${JSON.stringify(e)}`);
  }
  await new Promise((r) => setTimeout(r, 400));
}
