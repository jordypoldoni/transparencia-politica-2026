// Totais mensais da CEAP (Cota do Exercício da Atividade Parlamentar) da ALEMS (Mato Grosso do Sul).
// Fonte aberta: CSV de todos os lançamentos do ano (colunas: Deputado;Ano;Mês;Categoria;CPF/CNPJ;Fornecedor;Documento;Emissão;Valor;Comprovante).
// Grava em gastos_assembleia_totais (uf='MS'). Idempotente (upsert por uf/ano/mês).
// Uso: node coletores/coletor_totais_alems.js [ano ...] [--dry]     (sem ano = ano corrente e o anterior)
import { NUM, lerCsv, baixarTexto, gravarTotais } from './_totais_assembleia.js';

const BASE = 'https://transparencia2.al.ms.gov.br/ceap';
const MESES = ['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro'];
const INCLUI = 'Cota do Exercício da Atividade Parlamentar (CEAP): reembolso, após o gasto, de combustível, locomoção, divulgação, imóvel de apoio, consultorias, software e internet, segurança, material de expediente e outros gastos do gabinete. Não inclui salário.';

const args = process.argv.slice(2);
const dry = args.includes('--dry');
const hoje = new Date().getFullYear();
const anos = args.filter((a) => /^\d{4}$/.test(a)).map(Number);
const ANOS = anos.length ? anos : [hoje - 1, hoje];

const linhasSaida = [];
for (const ano of ANOS) {
  const url = `${BASE}/notas/exportar-csv?ano=${ano}`;
  const rows = lerCsv(await baixarTexto(url));
  const i = rows.findIndex((r) => r[0] === 'Deputado' && r[1] === 'Ano');
  if (i < 0) throw new Error(`MS ${ano}: cabeçalho não encontrado (o formato mudou?)`);
  const porMes = new Map();
  for (const r of rows.slice(i + 1)) {
    const mes = MESES.indexOf(String(r[2]).toLowerCase()) + 1;
    if (!mes || Number(r[1]) !== ano) continue;
    const m = porMes.get(mes) || { total: 0, n: 0, deps: new Set(), cat: {} };
    const v = NUM(r[8]);
    m.total += v; m.n += 1; m.deps.add(r[0]); m.cat[r[3]] = (m.cat[r[3]] || 0) + v;
    porMes.set(mes, m);
  }
  if (!porMes.size) throw new Error(`MS ${ano}: nenhuma linha lida; abortando sem gravar.`);
  for (const [mes, m] of [...porMes].sort((a, b) => a[0] - b[0])) {
    for (const k of Object.keys(m.cat)) m.cat[k] = Math.round(m.cat[k] * 100) / 100;
    linhasSaida.push({ uf: 'MS', ano, mes, total: Math.round(m.total * 100) / 100, n_lancamentos: m.n, n_deputados: m.deps.size,
      por_categoria: m.cat, o_que_inclui: INCLUI, fonte_url: `${BASE}?ano=${ano}`, fonte: 'alems_ceap' });
  }
}
await gravarTotais(linhasSaida, { dry });
