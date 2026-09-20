// Auditoria: quais consultas correm risco do corte silencioso de 1.000 linhas do Supabase?
// Nao altera nada. Roda a consulta pedindo exatamente 1.000 e compara com a contagem real.
// Uso: node coletores/_auditoria_corte_mil.mjs
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

// As tabelas que o site e os coletores leem inteiras em algum lugar.
const TABELAS = [
  'agentes_politicos', 'votacoes', 'votos_parlamentares', 'despesas_parlamentares',
  'candidatos_deputado_federal', 'candidatos_presidenciais', 'proposicoes',
  'indicacoes_executivo', 'radar_gastos',
];

console.log('tabela'.padEnd(32) + 'linhas'.padStart(10) + '   passa de 1.000?');
for (const t of TABELAS) {
  const { count, error } = await supabase.from(t).select('*', { count: 'exact', head: true });
  if (error) { console.log(`${t.padEnd(32)}${'?'.padStart(10)}   (${error.message})`); continue; }
  const risco = count > 1000 ? 'SIM, toda leitura inteira dela precisa paginar' : 'não';
  console.log(`${t.padEnd(32)}${String(count).padStart(10)}   ${risco}`);
}
