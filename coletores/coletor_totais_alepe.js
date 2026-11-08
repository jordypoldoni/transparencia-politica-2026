// Totais mensais da VERBA INDENIZATÓRIA da ALEPE (Pernambuco).
// Fonte: JSON público que o próprio portal usa (www.alepe.pe.gov.br/servicos/transparencia):
//   dep/deputados.php?leg=-16                          lista de deputados (inclui antigos)
//   adm/verbaindenizatoria-dep-meses.php?dep=&ano=     meses com prestação de contas do deputado
//   adm/verbaindenizatoria.php?dep=&ano=&mes=          registros do mês (tipo P e C, campo total)
// Cada deputado tem 1 ou 2 registros por mês (P e C). Eles SOMAM (a soma nunca passa do teto mensal de R$ 60.073,27).
// O campo "total" vem em formatos mistos ("59724" e "55863,6"): ver NUM abaixo.
// Cerca de 850 consultas por ano; roda 4 em paralelo, com nova tentativa.
// Grava em gastos_assembleia_totais (uf='PE'). Idempotente (upsert por uf/ano/mês).
// Uso: node coletores/coletor_totais_alepe.js [ano ...] [--dry]     (sem ano = ano corrente e o anterior)
import { gravarTotais } from './_totais_assembleia.js';

const B = 'https://www.alepe.pe.gov.br/servicos/transparencia';
const INCLUI = 'Verba indenizatória: reembolso mensal, após o gasto, de imóvel, locação de veículos, assessoria jurídica, consultorias, divulgação do mandato, telecomunicações, serviços postais, assinaturas, alimentação do parlamentar e segurança. Teto mensal por deputado de cerca de R$ 60 mil. Não inclui salário.';

const args = process.argv.slice(2);
const dry = args.includes('--dry');
const hoje = new Date().getFullYear();
const anos = args.filter((a) => /^\d{4}$/.test(a)).map(Number);
const ANOS = anos.length ? anos : [hoje - 1, hoje];

const NUM = (s) => { const t = String(s); const n = Number(t.includes(',') ? t.replace(/\./g, '').replace(',', '.') : t); if (!Number.isFinite(n)) throw new Error(`valor inválido: ${s}`); return n; };

async function json(url) {
  for (let i = 1; i <= 8; i++) {
    try {
      await new Promise((r) => setTimeout(r, 250));
      const res = await fetch(url, { headers: { 'User-Agent': 'LumeCidadao/1.0 (transparencia)' } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (e) {
      if (i === 8) throw new Error(`Falha em ${url}: ${e.message}`);
      await new Promise((r) => setTimeout(r, 5000 * i));
    }
  }
}

async function emParalelo(itens, n, fn) {
  const out = []; let i = 0;
  await Promise.all(Array.from({ length: n }, async () => { while (i < itens.length) { const k = i++; out[k] = await fn(itens[k]); } }));
  return out;
}

const deps = await json(`${B}/dep/deputados.php?leg=-16`);
if (!Array.isArray(deps) || deps.length < 40) throw new Error('PE: lista de deputados vazia ou menor que o esperado; abortando sem gravar.');

const saida = [];
for (const ano of ANOS) {
  const regs = (await emParalelo(deps, 2, async (d) => {
    const meses = await json(`${B}/adm/verbaindenizatoria-dep-meses.php?dep=${d.id}&ano=${ano}`);
    const r = [];
    for (const m of meses) {
      for (const x of await json(`${B}/adm/verbaindenizatoria.php?dep=${d.id}&ano=${ano}&mes=${m.mes}`)) r.push({ mes: Number(m.mes), dep: d.id, v: NUM(x.total) });
    }
    return r;
  })).flat();
  if (!regs.length) { console.warn(`PE ${ano}: nenhum registro (ano ainda sem dados?)`); continue; }
  const porMes = new Map();
  for (const r of regs) {
    const m = porMes.get(r.mes) || { total: 0, n: 0, deps: new Set() };
    m.total += r.v; m.n += 1; m.deps.add(r.dep); porMes.set(r.mes, m);
  }
  for (const [mes, m] of [...porMes].sort((a, b) => a[0] - b[0])) {
    saida.push({ uf: 'PE', ano, mes, total: Math.round(m.total * 100) / 100, n_lancamentos: m.n, n_deputados: m.deps.size,
      por_categoria: null, o_que_inclui: INCLUI, fonte_url: 'https://transparencia.alepe.pe.gov.br/financas/verbas-indenizatorias', fonte: 'alepe_verba_indenizatoria' });
  }
}
if (!saida.length) throw new Error('PE: nada coletado; abortando sem gravar.');
await gravarTotais(saida, { dry });
