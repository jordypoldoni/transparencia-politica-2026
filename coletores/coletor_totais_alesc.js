// Totais mensais das despesas dos GABINETES PARLAMENTARES da ALESC (Santa Catarina).
// Fonte aberta: CSV anual (colunas: Verba;Descrição;Conta;Favorecido;Trecho;Data de Referência;Valor).
// "Conta" é o gabinete. n_deputados guarda quantos gabinetes tiveram gasto no mês (pode incluir colegiados).
// Grava em gastos_assembleia_totais (uf='SC'). Idempotente (upsert por uf/ano/mês).
// Uso: node coletores/coletor_totais_alesc.js [ano ...] [--dry]     (sem ano = ano corrente e o anterior)
import { NUM, lerCsv, baixarTexto, gravarTotais } from './_totais_assembleia.js';

const BASE = 'https://transparencia.alesc.sc.gov.br/gabinetes-parlamentares';
const INCLUI = 'Uso das cotas dos gabinetes dos deputados estaduais: diárias, veículos, reembolsos, passagens, aluguel, telefone, almoxarifado, combustíveis, correspondência, TV a cabo, gráfica e inscrições. É mais amplo que verba indenizatória (inclui diárias e veículos).';

const args = process.argv.slice(2);
const dry = args.includes('--dry');
const hoje = new Date().getFullYear();
const anos = args.filter((a) => /^\d{4}$/.test(a)).map(Number);
const ANOS = anos.length ? anos : [hoje - 1, hoje];

const linhasSaida = [];
for (const ano of ANOS) {
  const rows = lerCsv(await baixarTexto(`${BASE}/csv/${ano}`));
  const cab = rows[0] || [];
  if (cab[0] !== 'Verba' || cab[5] !== 'Data de Referência' || cab[6] !== 'Valor') throw new Error(`SC ${ano}: cabeçalho inesperado (${cab.join('|')}); o formato mudou?`);
  const porMes = new Map();
  for (const r of rows.slice(1)) {
    const mm = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(r[5] || '');
    if (!mm || Number(mm[3]) !== ano) continue;
    const mes = Number(mm[2]);
    const m = porMes.get(mes) || { total: 0, n: 0, contas: new Set(), cat: {} };
    const v = NUM(r[6]);
    m.total += v; m.n += 1; m.contas.add(r[2]); m.cat[r[0]] = (m.cat[r[0]] || 0) + v;
    porMes.set(mes, m);
  }
  if (!porMes.size) throw new Error(`SC ${ano}: nenhuma linha lida; abortando sem gravar.`);
  for (const [mes, m] of [...porMes].sort((a, b) => a[0] - b[0])) {
    for (const k of Object.keys(m.cat)) m.cat[k] = Math.round(m.cat[k] * 100) / 100;
    linhasSaida.push({ uf: 'SC', ano, mes, total: Math.round(m.total * 100) / 100, n_lancamentos: m.n, n_deputados: m.contas.size,
      por_categoria: m.cat, o_que_inclui: INCLUI, fonte_url: 'https://transparencia.alesc.sc.gov.br/gabinetes.php', fonte: 'alesc_gabinetes' });
  }
}
await gravarTotais(linhasSaida, { dry });
