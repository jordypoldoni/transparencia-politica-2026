// Totais mensais da VERBA INDENIZATÓRIA da ALEPE (Pernambuco).
// Fonte: JSON público que o próprio portal usa (www.alepe.pe.gov.br/servicos/transparencia):
//   dep/deputados.php?leg=-16                          lista de deputados (inclui antigos)
//   adm/verbaindenizatoria-dep-meses.php?dep=&ano=     meses com prestação de contas do deputado
//   adm/verbaindenizatoria.php?dep=&ano=&mes=          registros do mês (tipo P e C, campo total)
// Cada deputado tem 1 ou 2 registros por mês (P e C). Eles SOMAM (a soma nunca passa do teto mensal de R$ 60.073,27).
// O campo "total" vem em formatos mistos ("59724" e "55863,6"): ver NUM abaixo.
// ATENÇÃO: sob carga o portal devolve [] SEM erro (achado de 08/11: 8 de 45 deputados vieram vazios). Por isso: lista vazia é repetida,
// e cada ano é coletado em DUAS passadas que precisam dar o mesmo total por mês; se divergirem, repete até 3 vezes e aborta sem gravar.
// Uma consulta por vez, com pausa. Variáveis opcionais: PE_CACHE (pasta de cache) e PE_ORCAMENTO_MS (para em partes; sai com código 2 e retoma do cache).
// Grava em gastos_assembleia_totais (uf='PE'). Idempotente (upsert por uf/ano/mês).
// Uso: node coletores/coletor_totais_alepe.js [ano ...] [--dry]     (sem ano = ano corrente e o anterior)
import fs from 'fs';
import { gravarTotais } from './_totais_assembleia.js';

const B = 'https://www.alepe.pe.gov.br/servicos/transparencia';
const INCLUI = 'Verba indenizatória: reembolso mensal, após o gasto, de imóvel, locação de veículos, assessoria jurídica, consultorias, divulgação do mandato, telecomunicações, serviços postais, assinaturas, alimentação do parlamentar e segurança. Teto mensal por deputado de cerca de R$ 60 mil. Não inclui salário.';

const args = process.argv.slice(2);
const dry = args.includes('--dry');
const hoje = new Date().getFullYear();
const anos = args.filter((a) => /^\d{4}$/.test(a)).map(Number);
const ANOS = anos.length ? anos : [hoje - 1, hoje];

const NUM = (s) => { const t = String(s); const n = Number(t.includes(',') ? t.replace(/\./g, '').replace(',', '.') : t); if (!Number.isFinite(n)) throw new Error(`valor inválido: ${s}`); return n; };


const CACHE = process.env.PE_CACHE || null;
const LIMITE = process.env.PE_ORCAMENTO_MS ? Date.now() + Number(process.env.PE_ORCAMENTO_MS) : Infinity;
const dorme = (ms) => new Promise((r) => setTimeout(r, ms));

async function json(url, { vazioSuspeito = false } = {}) {
  let ultimo;
  for (let i = 1; i <= 6; i++) {
    try {
      await dorme(300);
      const res = await fetch(url, { headers: { 'User-Agent': 'LumeCidadao/1.0 (transparencia)' }, signal: AbortSignal.timeout(15000) });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      ultimo = await res.json();
      if (vazioSuspeito && Array.isArray(ultimo) && ultimo.length === 0 && i < 3) { await dorme(2000); continue; }
      return ultimo;
    } catch (e) {
      if (i === 6) throw new Error(`Falha em ${url}: ${e.message}`);
      await dorme(4000 * i);
    }
  }
  return ultimo;
}

const deps = await json(`${B}/dep/deputados.php?leg=-16`, { vazioSuspeito: true });
if (!Array.isArray(deps) || deps.length < 40) throw new Error('PE: lista de deputados vazia ou menor que o esperado; abortando sem gravar.');

// Uma passada: devolve { depId: [[mes, valor], ...] }. Retoma do cache se houver.
async function passada(ano, n) {
  const arq = CACHE ? `${CACHE}/pe-${ano}-p${n}.json` : null;
  const c = arq && fs.existsSync(arq) ? JSON.parse(fs.readFileSync(arq, 'utf8')) : {};
  for (const d of deps) {
    if (d.id in c) continue;
    if (Date.now() > LIMITE) { if (arq) fs.writeFileSync(arq, JSON.stringify(c)); console.log(`PE ${ano} passada ${n}: parcial (${Object.keys(c).length}/${deps.length}); rode de novo.`); process.exit(2); }
    const meses = await json(`${B}/adm/verbaindenizatoria-dep-meses.php?dep=${d.id}&ano=${ano}`, { vazioSuspeito: true });
    const r = [];
    for (const m of meses) {
      const regs = await json(`${B}/adm/verbaindenizatoria.php?dep=${d.id}&ano=${ano}&mes=${m.mes}`, { vazioSuspeito: true });
      for (const x of regs) r.push([Number(m.mes), NUM(x.total)]);
    }
    c[d.id] = r;
  }
  if (arq) fs.writeFileSync(arq, JSON.stringify(c));
  return c;
}

function somaPorMes(c) {
  const pm = new Map();
  for (const [dep, r] of Object.entries(c)) for (const [mes, v] of r) {
    const m = pm.get(mes) || { total: 0, n: 0, deps: new Set() };
    m.total += v; m.n += 1; m.deps.add(dep); pm.set(mes, m);
  }
  return pm;
}
const igual = (a, b) => a.size === b.size && [...a].every(([k, m]) => b.has(k) && Math.abs(b.get(k).total - m.total) < 0.005 && b.get(k).deps.size === m.deps.size);

const saida = [];
for (const ano of ANOS) {
  let pm = null;
  for (let tent = 1; tent <= 3 && !pm; tent++) {
    const a = somaPorMes(await passada(ano, 2 * tent - 1));
    const b = somaPorMes(await passada(ano, 2 * tent));
    if (igual(a, b)) pm = b; else console.warn(`PE ${ano}: duas passadas diferentes (tentativa ${tent}).`);
  }
  if (!pm) throw new Error(`PE ${ano}: passadas não batem após 3 tentativas; abortando sem gravar.`);
  if (!pm.size) { console.warn(`PE ${ano}: nenhum registro (ano ainda sem dados?)`); continue; }
  for (const [mes, m] of [...pm].sort((a, b) => a[0] - b[0])) {
    saida.push({ uf: 'PE', ano, mes, total: Math.round(m.total * 100) / 100, n_lancamentos: m.n, n_deputados: m.deps.size,
      por_categoria: null, o_que_inclui: INCLUI, fonte_url: 'https://transparencia.alepe.pe.gov.br/financas/verbas-indenizatorias', fonte: 'alepe_verba_indenizatoria' });
  }
}
if (!saida.length) throw new Error('PE: nada coletado; abortando sem gravar.');
await gravarTotais(saida, { dry });
