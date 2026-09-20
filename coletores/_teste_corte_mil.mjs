// Prova do conserto: o que o SITE calcula bate com o que o BANCO tem?
// Pega os parlamentares com mais lançamentos (os que o corte de 1.000 afetava) e compara o
// total de gastos vindo do ServicoAPI com a soma feita direto no banco.
// Nao altera nada. Uso: node coletores/_teste_corte_mil.mjs
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import ServicoAPI from '../src/servicos/servico_api.js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const brl = (v) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(v || 0);

// Os 4 com mais lançamentos (bem acima de 1.000) e 1 abaixo, como controle.
const { data: agentes } = await supabase.from('agentes_politicos').select('id, nome_urna, slug').limit(2000);

const contagens = [];
for (const a of agentes || []) {
  const { count } = await supabase.from('despesas_parlamentares')
    .select('*', { count: 'exact', head: true }).eq('agente_id', a.id);
  if (count) contagens.push({ ...a, n: count });
}
contagens.sort((x, y) => y.n - x.n);
const amostra = [...contagens.slice(0, 4), contagens.find((c) => c.n < 1000)].filter(Boolean);

console.log('parlamentar'.padEnd(26) + 'linhas'.padStart(8) + 'total no banco'.padStart(18) + 'total no site'.padStart(18) + '   bate?');
for (const c of amostra) {
  // Soma direto no banco, paginando na mão para não cair no mesmo corte que estamos testando.
  let soma = 0, lidas = 0;
  for (let i = 0; ; i += 1000) {
    const { data } = await supabase.from('despesas_parlamentares')
      .select('valor_liquido').eq('agente_id', c.id).range(i, i + 999);
    if (!data?.length) break;
    soma += data.reduce((s, r) => s + parseFloat(r.valor_liquido || 0), 0);
    lidas += data.length;
    if (data.length < 1000) break;
  }
  const perfil = await ServicoAPI.getPoliticoCompleto(c.id);
  const doSite = (perfil?.serie_mensal || []).reduce((s, a) => s + (a.total || 0), 0);
  const bate = Math.abs(soma - doSite) < 1;
  console.log(
    `${(c.nome_urna || '?').slice(0, 24).padEnd(26)}${String(lidas).padStart(8)}` +
    `${brl(soma).padStart(18)}${brl(doSite).padStart(18)}   ${bate ? 'sim' : 'NÃO — falta ' + brl(soma - doSite)}`
  );
}
