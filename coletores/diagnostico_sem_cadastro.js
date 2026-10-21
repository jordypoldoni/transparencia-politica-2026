// Diagnóstico SÓ DE LEITURA (21/10/2026): quem está no arquivo anual da cota da Câmara e NÃO casa com agentes_politicos.
// Mede pessoas, linhas e valor, e procura cada uma no banco por nome (para separar "sem cadastro" de "id diferente").
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import { lerCsv, paraNumero, baixarCotaAnual } from './cota_arquivo.js';

const ANO = process.argv[2] || '2026';
const nota = (t, l) => console.log(`::notice title=${t}::${l.join('%0A')}`);
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const norm = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z ]/g, ' ').replace(/\s+/g, ' ').trim();

const { data: agentes, error } = await supabase.from('agentes_politicos').select('id, id_externo_api, nome_urna, nome_civil, cargo_atual, fonte_api, situacao_atual').limit(5000);
if (error) throw error;
const porNum = new Map(); const porNome = new Map();
for (const a of agentes) {
  const m = String(a.id_externo_api || '').trim().match(/(\d+)$/); if (m) porNum.set(m[1], a);
  for (const n of [a.nome_urna, a.nome_civil]) if (n) porNome.set(norm(n), a);
}
const linhas = lerCsv(await baixarCotaAnual(ANO));
const cab = linhas.shift().map((c) => c.trim());
const ix = (n) => cab.indexOf(n);
const g = new Map(); let total = 0, totalSem = 0, nSem = 0, lideranca = 0;
for (const l of linhas) {
  if (l.length < cab.length - 2 || (l[ix('numAno')] || '').trim() !== String(ANO)) continue;
  const cad = (l[ix('ideCadastro')] || '').trim();
  const v = paraNumero(l[ix('vlrLiquido')]);
  if (!cad) { lideranca++; continue; }
  total += v;
  if (porNum.has(cad)) continue;
  nSem++; totalSem += v;
  const nome = (l[ix('txNomeParlamentar')] || '?').trim();
  const x = g.get(cad) || { nome, uf: (l[ix('sgUF')] || '').trim(), partido: (l[ix('sgPartido')] || '').trim(), n: 0, v: 0, meses: new Set() };
  x.n++; x.v += v; x.meses.add(l[ix('numMes')]); g.set(cad, x);
}
const lista = [...g.entries()].sort((a, b) => b[1].v - a[1].v);
nota(`sem cadastro em ${ANO}: resumo`, [
  `linhas de deputado com id: soma R$ ${total.toFixed(2)}`,
  `sem cadastro: ${g.size} pessoas, ${nSem} linhas, R$ ${totalSem.toFixed(2)} (${(100 * totalSem / total).toFixed(2)}% do valor)`,
  `linhas de liderança/órgão (sem ideCadastro, fora de escopo): ${lideranca}`,
]);
const achou = (x) => { const a = porNome.get(norm(x.nome)); return a ? `EXISTE no banco como "${a.nome_urna}" id_externo=${a.id_externo_api} cargo=${a.cargo_atual}` : 'não achei por nome'; };
nota(`sem cadastro em ${ANO}: pessoas`, lista.slice(0, 60).map(([cad, x]) => `${cad} ${x.nome} (${x.partido}-${x.uf}) ${x.n} linhas R$ ${x.v.toFixed(2)} meses ${[...x.meses].sort().join(',')} | ${achou(x)}`));
