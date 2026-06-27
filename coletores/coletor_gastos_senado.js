// Coletor de gastos do Senado (CEAPS) — CSV oficial, anual.
// Idempotente: apaga as despesas do Senado do ano e reinsere.
// Casa por NOME (CEAPS não traz código), com normalização de acentos/caixa.
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ANO = parseInt(process.argv[2] || process.env.ANO || '2026', 10); // uso: node coletor_gastos_senado.js 2025
// URL configurável (a CEAPS publica um CSV por ano)
const CEAPS_URL = process.env.CEAPS_URL || `https://www.senado.gov.br/transparencia/LAI/verba/despesa_ceaps_${ANO}.csv`;

if (!SUPABASE_URL || !SUPABASE_KEY) { console.error('❌ Faltam credenciais Supabase.'); process.exit(1); }
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const norm = (s) => (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9 ]/g, '').trim();

function categoria(tipo) {
  const x = (tipo || '').toLowerCase();
  if (x.includes('passagem') || x.includes('hospedag') || x.includes('aérea') || x.includes('aerea')) return 'Viagens e Estadias';
  if (x.includes('locomo') || x.includes('combust') || x.includes('veícul') || x.includes('veicul') || x.includes('aluguel de veículos')) return 'Transporte e Mobilidade';
  if (x.includes('aliment')) return 'Alimentação';
  if (x.includes('divulga') || x.includes('publicid')) return 'Publicidade e Marketing';
  if (x.includes('aluguel') || x.includes('escritório') || x.includes('escritorio') || x.includes('material') || x.includes('telefon') || x.includes('postal')) return 'Escritório e Apoio';
  if (x.includes('consultor') || x.includes('pesquisa') || x.includes('técnic') || x.includes('tecnic')) return 'Serviços Técnicos';
  if (x.includes('seguran')) return 'Segurança';
  return 'Outros Operacionais';
}

const valor = (v) => parseFloat(String(v || '0').replace(/\./g, '').replace(',', '.')) || 0;
const data = (d) => { // dd/mm/aaaa -> aaaa-mm-dd
  const m = String(d || '').match(/(\d{2})\/(\d{2})\/(\d{4})/);
  return m ? `${m[3]}-${m[2]}-${m[1]}` : null;
};

async function main() {
  console.log(`🚀 Coletor CEAPS ${ANO} — ${CEAPS_URL}`);

  // 1) Mapa nome-normalizado -> agente (senadores)
  const { data: senadores, error } = await supabase
    .from('agentes_politicos')
    .select('id, nome_urna, nome_completo')
    .ilike('fonte_api', '%senado%');
  if (error) throw error;
  // Casamento por tokens: o nome curto da CEAPS deve estar contido no nome do senador
  const senTok = (senadores || []).map((s) => ({
    id: s.id,
    tokens: new Set(norm(`${s.nome_urna || ''} ${s.nome_completo || ''}`).split(/\s+/).filter(Boolean)),
  }));
  const cache = new Map();
  const matchSenador = (nome) => {
    const key = norm(nome);
    if (cache.has(key)) return cache.get(key);
    const toks = key.split(/\s+/).filter(Boolean);
    let melhor = null, menor = Infinity;
    if (toks.length) {
      for (const s of senTok) {
        if (toks.every((tk) => s.tokens.has(tk)) && s.tokens.size < menor) { melhor = s.id; menor = s.tokens.size; }
      }
    }
    // Fallback seguro: maior nº de tokens significativos em comum, SÓ se único (sem ambiguidade)
    if (!melhor) {
      const sig = toks.filter((tk) => tk.length >= 4);
      let max = 0, idMax = null, qtdMax = 0;
      for (const s of senTok) {
        let n = 0; for (const tk of sig) if (s.tokens.has(tk)) n++;
        if (n > max) { max = n; idMax = s.id; qtdMax = 1; }
        else if (n === max && n > 0) qtdMax++;
      }
      if (max >= 2 && qtdMax === 1) melhor = idMax;
    }
    cache.set(key, melhor);
    return melhor;
  };
  console.log(`👥 ${senadores.length} senadores no banco.`);

  // 2) Baixa e decodifica o CSV (latin-1, separado por ;)
  const resp = await fetch(CEAPS_URL);
  if (!resp.ok) throw new Error(`HTTP ${resp.status} ao baixar CEAPS`);
  const buf = Buffer.from(await resp.arrayBuffer());
  const texto = buf.toString('latin1');
  const linhas = texto.split(/\r?\n/);

  // Acha a linha de cabeçalho (contém ANO e SENADOR)
  let iCab = linhas.findIndex((l) => /ANO/i.test(l) && /SENADOR/i.test(l));
  if (iCab < 0) iCab = 0;
  const cab = linhas[iCab].split(';').map((c) => c.replace(/"/g, '').trim().toUpperCase());
  const idx = (nome) => cab.indexOf(nome);
  const iAno = idx('ANO'), iMes = idx('MES'), iSen = idx('SENADOR'), iTipo = idx('TIPO_DESPESA'),
        iCnpj = idx('CNPJ_CPF'), iForn = idx('FORNECEDOR'), iDoc = idx('DOCUMENTO'), iData = idx('DATA'),
        iValor = idx('VALOR_REEMBOLSADO'), iCod = idx('COD_DOCUMENTO');

  const linhasOut = [];
  let semMatch = new Set();
  for (let i = iCab + 1; i < linhas.length; i++) {
    const cols = linhas[i].split(';').map((c) => c.replace(/^"|"$/g, '').trim());
    if (cols.length < cab.length || !cols[iSen]) continue;
    const agenteId = matchSenador(cols[iSen]);
    if (!agenteId) { semMatch.add(cols[iSen]); continue; }
    linhasOut.push({
      agente_id: agenteId,
      ano: parseInt(cols[iAno], 10) || ANO,
      mes: parseInt(cols[iMes], 10) || null,
      tipo_despesa: cols[iTipo] || null,
      categoria_normalizada: categoria(cols[iTipo]),
      fornecedor_nome: cols[iForn] || null,
      fornecedor_cnpj_cpf: cols[iCnpj] || null,
      valor_liquido: valor(cols[iValor]),
      data_emissao: data(cols[iData]),
      id_externo_documento: cols[iCod] || cols[iDoc] || null,
      casa_legislativa: 'Senado',
    });
  }
  console.log(`📊 ${linhasOut.length} lançamentos válidos; ${semMatch.size} senadores sem correspondência.`);
  if (semMatch.size) console.log('   sem match (amostra):', [...semMatch].slice(0, 5));

  // 3) Idempotência: limpa o Senado deste ano e reinsere
  await supabase.from('despesas_parlamentares').delete().eq('casa_legislativa', 'Senado').eq('ano', ANO);
  for (let i = 0; i < linhasOut.length; i += 500) {
    const { error: e } = await supabase.from('despesas_parlamentares').insert(linhasOut.slice(i, i + 500));
    if (e) { console.warn('insert:', e.message); break; }
  }
  console.log(`✅ ${linhasOut.length} despesas do Senado gravadas.`);
}

main().catch((e) => { console.error('💥 Erro:', e.message); process.exit(1); });
