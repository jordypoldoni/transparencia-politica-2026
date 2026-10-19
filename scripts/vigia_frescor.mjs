// VIGIA DE FRESCOR (T13, 17/10/2026): confere, a partir do /api/fonte-status do site NO AR, se cada
// fonte de dados foi coletada dentro do prazo esperado pela sua cadência real. Coletores com
// `continue-on-error` ficam verdes mesmo falhando; este vigia é quem percebe o dado parado.
//
// Uso:  node scripts/vigia_frescor.mjs https://www.lumecidadao.com.br
// Sai com 1 se houver FALHA (vermelho = e-mail do GitHub). AVISO só aparece na anotação do run.

const H = 1;
const DIA = 24 * H;

// Prazos = cadência + folga para atraso do agendador do GitHub (medido: 3 a 10 h).
//   maxHoras : idade máxima de `coletado_em`.
//   ate      : (YYYY-MM-DD) depois desta data a fonte deixa de ser cobrada (a coleta foi desligada).
//   soAviso  : ausência/atraso gera aviso e não falha (cadência ainda não confirmada em produção).
export const REGRAS = [
  // coletar.yml, diário
  { fonte: 'votos_camara', maxHoras: 3 * DIA },
  { fonte: 'votos_senado', maxHoras: 3 * DIA },
  { fonte: 'gastos_senado', maxHoras: 3 * DIA },
  { fonte: 'gastos_alesp', maxHoras: 3 * DIA },
  { fonte: 'proposicoes', maxHoras: 3 * DIA },
  { fonte: 'pedidos_cpi_camara', maxHoras: 3 * DIA },
  // tramitacao dos pedidos (19/10/2026): so carimba se nenhum pedido foi pulado; soAviso ate a 1a linha aparecer
  { fonte: 'pedidos_cpi_tramitacoes', maxHoras: 3 * DIA, soAviso: true },
  // coletar.yml, só às segundas
  { fonte: 'indicacoes_executivo', maxHoras: 10 * DIA },
  // coletar_alergs.yml: votos às segundas; gastos no dia 8 de cada mês
  { fonte: 'votos_alergs', maxHoras: 10 * DIA },
  { fonte: 'gastos_alergs', maxHoras: 40 * DIA },
  // coletar_fiscal.yml: fichas do TSE, diárias até 01/11/2026 (T5 remove os crons)
  { fonte: 'ficha_presidenciaveis', maxHoras: 3 * DIA, ate: '2026-11-02' },
  { fonte: 'ficha_deputado_federal', maxHoras: 3 * DIA, ate: '2026-11-02' },
  { fonte: 'candidatos_governador', maxHoras: 3 * DIA, ate: '2026-11-02' },
  { fonte: 'candidatos_senador', maxHoras: 3 * DIA, ate: '2026-11-02' },
  // SICONFI: dia 5 de meses pares
  { fonte: 'fiscal_siconfi', maxHoras: 70 * DIA, soAviso: true },
  // ainda sem linha em fonte_status (conferir após o cron de 18/10/2026); só avisam
  { fonte: 'gastos_camara', maxHoras: 3 * DIA, soAviso: true },
  { fonte: 'candidatos_deputado_federal', maxHoras: 3 * DIA, ate: '2026-11-02', soAviso: true },
  { fonte: 'candidatos_presidenciais', maxHoras: 3 * DIA, ate: '2026-11-02', soAviso: true },
];

const fmtIdade = (h) => (h >= 48 ? `${(h / 24).toFixed(1)} dias` : `${h.toFixed(1)} h`);

// Pura: recebe as linhas do /api/fonte-status e a data de agora; devolve { falhas, avisos, ok }.
export function avaliar(linhas, agora = new Date(), regras = REGRAS) {
  const falhas = [], avisos = [], ok = [];
  if (!Array.isArray(linhas) || linhas.length === 0) {
    // A rota devolve [] quando o banco falha; tratar como problema real, não como "sem dados".
    return { falhas: ['/api/fonte-status veio vazio ou inválido (banco fora do ar ou tabela vazia)'], avisos, ok };
  }
  const porFonte = new Map();
  for (const l of linhas) {
    const atual = porFonte.get(l.fonte);
    if (!atual || new Date(l.coletado_em) > new Date(atual.coletado_em)) porFonte.set(l.fonte, l);
  }
  const reg = (r, msg) => (r.soAviso ? avisos : falhas).push(msg);
  for (const r of regras) {
    if (r.ate && agora > new Date(`${r.ate}T23:59:59Z`)) continue;
    const l = porFonte.get(r.fonte);
    if (!l) { reg(r, `${r.fonte}: sem linha em fonte_status`); continue; }
    const t = new Date(l.coletado_em).getTime();
    if (!Number.isFinite(t)) { reg(r, `${r.fonte}: coletado_em inválido (${l.coletado_em})`); continue; }
    const idade = (agora.getTime() - t) / 3.6e6;
    if (idade > r.maxHoras) reg(r, `${r.fonte}: última coleta há ${fmtIdade(idade)} (limite ${fmtIdade(r.maxHoras)})`);
    else if (idade < -1) reg(r, `${r.fonte}: coletado_em no futuro (${l.coletado_em})`);
    else ok.push(`${r.fonte}: ${fmtIdade(Math.max(idade, 0))}`);
  }
  const conhecidas = new Set(regras.map((r) => r.fonte));
  for (const f of porFonte.keys()) if (!conhecidas.has(f)) avisos.push(`${f}: fonte nova sem regra em scripts/vigia_frescor.mjs`);
  return { falhas, avisos, ok };
}

async function buscar(url, tentativas = 3) {
  let erro;
  for (let i = 1; i <= tentativas; i++) {
    try {
      const r = await fetch(url, { signal: AbortSignal.timeout(30000), headers: { 'cache-control': 'no-cache' } });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return await r.json();
    } catch (e) {
      erro = e;
      if (i < tentativas) await new Promise((res) => setTimeout(res, 5000 * i));
    }
  }
  throw erro;
}

if (process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href) {
  const base = (process.argv[2] || 'https://www.lumecidadao.com.br').replace(/\/+$/, '');
  let linhas;
  try { linhas = await buscar(`${base}/api/fonte-status`); }
  catch (e) { console.log(`::error::não consegui ler ${base}/api/fonte-status: ${e.message}`); process.exit(1); }
  const { falhas, avisos, ok } = avaliar(linhas);
  console.log(`Frescor das fontes em ${base}`);
  for (const m of ok) console.log(`  ok     ${m}`);
  for (const m of avisos) console.log(`::warning::${m}`);
  for (const m of falhas) console.log(`::error::${m}`);
  console.log(`\n${ok.length} em dia, ${avisos.length} aviso(s), ${falhas.length} falha(s)`);
  process.exit(falhas.length ? 1 : 0);
}
