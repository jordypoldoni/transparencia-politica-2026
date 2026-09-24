// Coletor de gastos da cota parlamentar (Câmara) pelo ARQUIVO ANUAL.
//
// POR QUE ESTE COLETOR EXISTE (20/09/2026):
// O endpoint /deputados/{id}/despesas devolve HTTP 200 com lista VAZIA para TODOS os anos,
// inclusive 2024 e 2025, que temos cheios no banco (bug aberto da Câmara, issues 382 e 383).
// Medido em 20/09: 6 variações da URL no mesmo deputado, todas com 0 itens. O coletor por
// deputado (coletor_gastos.js) fica inútil enquanto isso durar, e a trava dele apenas impede
// que o vazio apague o histórico. 2026 já havia sido zerado antes das travas existirem: o banco
// tinha 1 linha de deputado da Câmara no ano inteiro.
// O arquivo anual é o MESMO dado por outro caminho, e continua sendo publicado todo dia
// (Ano-2026.csv.zip, 3,9 MB, republicado em 20/09/2026 06:26 GMT).
//
// TRAVAS, herdadas do coletor por deputado e adaptadas:
//   1. NÃO APAGA NO VAZIO: arquivo sem linha aproveitável aborta antes de tocar no banco.
//   2. NÃO ENCOLHE SEM PERMISSÃO: se a carga nova for menor que 80% do que já existe no ano,
//      aborta. Só --forcar passa por cima. Protege contra arquivo truncado na origem.
//   3. TETO DE LINHAS: aborta acima de MAX_LINHAS, para não estourar os 500 MB do plano free.
//   4. SUBSTITUIÇÃO POR DEPUTADO, não por ano: o delete de cada um acontece junto do insert
//      dele. Uma falha no meio deixa parte antiga e parte nova, nunca o ano vazio.
//
// QUEM NÃO CASA É CONTADO E DITO EM VOZ ALTA, nunca descartado em silêncio (lição de 19/09,
// quando um coletor jogava 20 mil votos no lixo por não achar o parlamentar).
//
// Uso:  node coletores/coletor_gastos_arquivo.js 2026
//       node coletores/coletor_gastos_arquivo.js 2026 --dry-run   (não escreve nada)
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import { categoria } from './categoria_gastos.js';
import { lerCsv, paraNumero, baixarCotaAnual } from './cota_arquivo.js';
import { refreshRadar } from './refresh_radar.js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const args = process.argv.slice(2);
const ANO = parseInt(args.find((a) => /^\d{4}$/.test(a)) || process.env.ANO || '2026', 10);
const DRY = args.includes('--dry-run');
const FORCAR = args.includes('--forcar');
const TUDO = args.includes('--tudo'); // regrava todos, mesmo sem mudança (uso raro)
const MAX_LINHAS = parseInt(process.env.MAX_LINHAS || '400000', 10);

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ Faltam SUPABASE_URL e/ou SUPABASE_SERVICE_ROLE_KEY.');
  process.exit(1);
}
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// No GitHub Actions o passo roda com continue-on-error, entao um exit 1 passa despercebido.
// Isto vira um aviso amarelo no topo da pagina da execucao. Mesmo padrao do refresh_radar.js.
function abortar(msg) {
  console.error(`\n🛑 ABORTADO: ${msg}`);
  if (process.env.GITHUB_ACTIONS) console.log(`::warning title=gastos da Camara nao coletados::${msg}`);
  process.exit(1);
}

// lerCsv, paraNumero e o download do arquivo anual moraram aqui ate 24/09/2026.
// Foram para coletores/cota_arquivo.js quando o cadastro dos deputados faltantes
// passou a precisar do mesmo arquivo.

async function main() {
  console.log(`🚀 Gastos da Câmara ${ANO} pelo arquivo anual${DRY ? ' (SIMULAÇÃO, nada será gravado)' : ''}.`);

  const { data: agentes, error } = await supabase
    .from('agentes_politicos').select('id, id_externo_api, nome_urna').ilike('fonte_api', '%camara%');
  if (error) throw error;
  const porIdExterno = new Map();
  for (const a of agentes || []) if (a.id_externo_api) porIdExterno.set(String(a.id_externo_api).trim(), a);
  console.log(`👥 ${porIdExterno.size} deputados cadastrados no banco.`);

  const linhas = lerCsv(await baixarCotaAnual(ANO));
  const cab = linhas.shift().map((c) => c.trim());
  const col = (nome) => {
    const i = cab.indexOf(nome);
    if (i < 0) throw new Error(`coluna ${nome} não existe no arquivo (a Câmara mudou o layout)`);
    return i;
  };
  const iCad = col('ideCadastro'), iAno = col('numAno'), iMes = col('numMes'),
    iDesc = col('txtDescricao'), iForn = col('txtFornecedor'), iCnpj = col('txtCNPJCPF'),
    iVlr = col('vlrLiquido'), iData = col('datEmissao'), iDoc = col('ideDocumento'),
    iUrl = col('urlDocumento'), iNome = col('txNomeParlamentar');

  const porAgente = new Map();
  let semCadastro = 0, foraDoAno = 0, semAgente = 0;
  const nomesSemAgente = new Set();

  for (const l of linhas) {
    if (l.length < cab.length - 2) continue;
    const cad = (l[iCad] || '').trim();
    if (!cad) { semCadastro++; continue; }                      // liderança ou órgão, não é deputado
    if ((l[iAno] || '').trim() !== String(ANO)) { foraDoAno++; continue; }
    const agente = porIdExterno.get(cad);
    if (!agente) { semAgente++; nomesSemAgente.add(`${(l[iNome] || '?').trim()} (${cad})`); continue; }
    if (!porAgente.has(agente.id)) porAgente.set(agente.id, []);
    porAgente.get(agente.id).push({
      agente_id: agente.id,
      ano: ANO,
      mes: parseInt((l[iMes] || '0').trim(), 10) || null,
      tipo_despesa: (l[iDesc] || '').trim() || null,
      categoria_normalizada: categoria(l[iDesc]),
      fornecedor_nome: (l[iForn] || '').trim() || null,
      fornecedor_cnpj_cpf: (l[iCnpj] || '').trim() || null,
      valor_liquido: paraNumero(l[iVlr]),
      data_emissao: (l[iData] || '').trim() ? l[iData].trim().slice(0, 10) : null,
      id_externo_documento: (l[iDoc] || '').trim() || null,
      url_documento: (l[iUrl] || '').trim() || null,
      casa_legislativa: 'Câmara',
    });
  }

  const aproveitaveis = [...porAgente.values()].reduce((s, v) => s + v.length, 0);
  const { count: existentes } = await supabase.from('despesas_parlamentares')
    .select('*', { count: 'exact', head: true }).eq('ano', ANO).eq('casa_legislativa', 'Câmara');

  console.log(
    `\n📊 arquivo: ${linhas.length} linhas · ${semCadastro} de liderança/órgão · ` +
    `${foraDoAno} de outro ano · ${semAgente} sem deputado no banco`
  );
  console.log(`   a gravar: ${aproveitaveis} lançamentos de ${porAgente.size} deputados`);
  console.log(`   hoje no banco (${ANO}, Câmara): ${existentes ?? 0}`);

  // Quem não casou aparece. Em silêncio, isto seria gasto do deputado desaparecendo da ficha dele.
  if (semAgente) {
    console.warn(`\n⚠️  ${semAgente} lançamentos de ${nomesSemAgente.size} pessoas que NÃO estão em agentes_politicos.`);
    console.warn('   Costuma ser suplente que assumiu no meio do ano. Os gastos ficam de fora até o cadastro entrar:');
    [...nomesSemAgente].sort().slice(0, 30).forEach((n) => console.warn(`     · ${n}`));
    if (nomesSemAgente.size > 30) console.warn(`     … e outros ${nomesSemAgente.size - 30}.`);
  }

  // ── TRAVA 1 ──
  if (aproveitaveis === 0) {
    abortar('zero lançamentos aproveitáveis no arquivo anual. Fonte anômala. NADA foi apagado.');
  }
  // ── TRAVA 2 ──
  if ((existentes ?? 0) > 0 && aproveitaveis < (existentes ?? 0) * 0.8 && !FORCAR) {
    abortar(
      `a carga nova (${aproveitaveis}) é menor que 80% do que já existe (${existentes}). ` +
      'Arquivo possivelmente truncado na origem. Confira antes. Para insistir: --forcar.'
    );
  }
  // ── TRAVA 3 ──
  if (aproveitaveis > MAX_LINHAS) {
    abortar(`${aproveitaveis} lançamentos passam do teto de ${MAX_LINHAS} (espaço do plano free).`);
  }

  if (DRY) {
    console.log('\n✅ Simulação encerrada. Nada foi gravado. Rode sem --dry-run para valer.');
    return;
  }

  // SÓ REGRAVA QUEM MUDOU (22/09/2026). A primeira versão apagava e regravava os ~103 mil
  // lançamentos todo dia, mesmo sem mudança nenhuma, e a tabela foi de 214 para 256 MB com o mesmo
  // número de linhas: o Postgres não devolve na hora o espaço de linha apagada. Agora cada
  // deputado é comparado por uma impressão digital (quantidade, soma em centavos, emissão mais
  // recente) calculada no banco pela função resumo_despesas_por_agente, e só quem difere é
  // regravado. Na dúvida, regrava: impressão que não bate é sempre tratada como mudança.
  const digitais = new Map();
  if (!TUDO) {
    const { data: resumo, error: errResumo } = await supabase.rpc('resumo_despesas_por_agente', { p_ano: ANO, p_casa: 'Câmara' });
    if (errResumo) console.warn(`⚠️  sem impressão digital (${errResumo.message}): todos serão regravados.`);
    for (const r of resumo || []) digitais.set(r.agente_id, `${r.n}|${r.centavos}|${r.ultima_emissao || ''}`);
  }
  const digitalDe = (lote) => {
    const centavos = lote.reduce((t, l) => t + Math.round((Number(l.valor_liquido) || 0) * 100), 0);
    const ultima = lote.reduce((m, l) => (l.data_emissao && l.data_emissao > m ? l.data_emissao : m), '');
    return `${lote.length}|${centavos}|${ultima}`;
  };

  let gravadas = 0, feitos = 0, iguais = 0;
  for (const [agenteId, lote] of porAgente) {
    if (!TUDO && digitais.get(agenteId) === digitalDe(lote)) { iguais++; continue; }
    // Substituição por deputado: delete e insert colados, para nunca existir "ano vazio".
    const { error: errDel } = await supabase.from('despesas_parlamentares')
      .delete().eq('agente_id', agenteId).eq('ano', ANO).eq('casa_legislativa', 'Câmara');
    if (errDel) { console.warn(`  ⚠️  delete ${agenteId}: ${errDel.message}`); continue; }
    for (let i = 0; i < lote.length; i += 500) {
      const { error: errIns } = await supabase.from('despesas_parlamentares').insert(lote.slice(i, i + 500));
      if (errIns) { console.warn(`  ⚠️  insert ${agenteId}: ${errIns.message}`); break; }
      gravadas += Math.min(500, lote.length - i);
    }
    if (++feitos % 50 === 0) console.log(`  …${feitos}/${porAgente.size} deputados (${gravadas} lançamentos)`);
  }
  console.log(`\n✅ ${feitos} deputados regravados (${gravadas} lançamentos) · ${iguais} sem mudança, não tocados.`);
}

main().then(() => (DRY ? null : refreshRadar())).catch((e) => { console.error('💥 Erro:', e.message); process.exit(1); });
