// Totais mensais da VERBA INDENIZATÓRIA da ALBA (Bahia).
// Fonte: exportação oficial em Excel do portal, com os mesmos filtros da tela (categoria, deputado, mês, ano):
//   https://www.al.ba.gov.br/transparencia/verbas-idenizatorias-excel?categoria=&deputado=&mes=&ano=AAAA
// Colunas (a partir da linha de dados): processo, NF, (vazio), competência (data em série do Excel), deputado, categoria, valor.
// O mês é o da COMPETÊNCIA. n_deputados = deputados com lançamento no mês.
// Grava em gastos_assembleia_totais (uf='BA'). Idempotente (upsert por uf/ano/mês).
// Uso: node coletores/coletor_totais_alba.js [ano ...] [--dry]     (sem ano = ano corrente e o anterior)
import AdmZip from 'adm-zip';
import { gravarTotais } from './_totais_assembleia.js';

const URL_XLS = 'https://www.al.ba.gov.br/transparencia/verbas-idenizatorias-excel';
const INCLUI = 'Verba indenizatória: reembolso, após o gasto, de aluguel de escritório, material de expediente, software, internet e TV, telefones, assessorias e consultorias, divulgação da atividade parlamentar, fretamento, inscrições em cursos e eventos, locação de veículo e locomoção e hospedagem. Não inclui salário.';

const args = process.argv.slice(2);
const dry = args.includes('--dry');
const hoje = new Date().getFullYear();
const anos = args.filter((a) => /^\d{4}$/.test(a)).map(Number);
const ANOS = anos.length ? anos : [hoje - 1, hoje];

async function baixar(ano) {
  for (let i = 1; i <= 4; i++) {
    try {
      const res = await fetch(`${URL_XLS}?categoria=&deputado=&mes=&ano=${ano}`, { headers: { 'User-Agent': 'LumeCidadao/1.0 (transparencia)' } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return Buffer.from(await res.arrayBuffer());
    } catch (e) {
      if (i === 4) throw new Error(`BA ${ano}: falha ao baixar o Excel: ${e.message}`);
      await new Promise((r) => setTimeout(r, 3000 * i));
    }
  }
}

const desescapa = (s) => s.replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'");

function linhasDoExcel(buf) {
  const zip = new AdmZip(buf);
  const lerArq = (nome) => { const e = zip.getEntry(nome); if (!e) throw new Error(`Excel sem ${nome} (o formato mudou?)`); return e.getData().toString('utf8'); };
  const ss = [...lerArq('xl/sharedStrings.xml').matchAll(/<si>([\s\S]*?)<\/si>/g)].map((m) => desescapa(m[1]));
  const out = [];
  for (const r of lerArq('xl/worksheets/sheet1.xml').matchAll(/<row[^>]*>([\s\S]*?)<\/row>/g)) {
    const row = [];
    for (const c of r[1].matchAll(/<c([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
      const v = /<v>([\s\S]*?)<\/v>/.exec(c[2] || '');
      let val = v ? v[1] : '';
      if (/t="s"/.test(c[1]) && v) val = ss[Number(val)];
      row.push(val);
    }
    out.push(row);
  }
  return out;
}

const saida = [];
for (const ano of ANOS) {
  const linhas = linhasDoExcel(await baixar(ano));
  const dados = linhas.filter((r) => r.length >= 8 && /^\d+(\.\d+)?$/.test(r[4] || '') && /^-?\d+(\.\d+)?$/.test(r[7] || ''));
  if (!dados.length) { console.warn(`BA ${ano}: nenhum lançamento (ano sem dados?)`); continue; }
  const porMes = new Map();
  for (const r of dados) {
    const d = new Date(Date.UTC(1899, 11, 30) + Math.trunc(Number(r[4])) * 86400000);
    if (d.getUTCFullYear() !== ano) continue;
    const mes = d.getUTCMonth() + 1;
    const m = porMes.get(mes) || { total: 0, n: 0, deps: new Set(), cat: {} };
    const v = Number(r[7]);
    m.total += v; m.n += 1; m.deps.add(r[5]); m.cat[r[6]] = (m.cat[r[6]] || 0) + v;
    porMes.set(mes, m);
  }
  for (const [mes, m] of [...porMes].sort((a, b) => a[0] - b[0])) {
    for (const k of Object.keys(m.cat)) m.cat[k] = Math.round(m.cat[k] * 100) / 100;
    saida.push({ uf: 'BA', ano, mes, total: Math.round(m.total * 100) / 100, n_lancamentos: m.n, n_deputados: m.deps.size,
      por_categoria: m.cat, o_que_inclui: INCLUI, fonte_url: 'https://www.al.ba.gov.br/transparencia/verbas-idenizatorias', fonte: 'alba_verba_indenizatoria' });
  }
}
if (!saida.length) throw new Error('BA: nada coletado; abortando sem gravar.');
await gravarTotais(saida, { dry });
