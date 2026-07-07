// Coletor PILOTO — Deputados Estaduais de Sao Paulo (ALESP).
// Fonte: dados abertos da ALESP (deputados.xml + despesas_gabinetes_<ano>.xml).
// Idempotente: apaga e reinsere os registros 'estadual' (SP) a cada execucao.
// Roda: node coletores/coletor_alesp.js   (precisa de SUPABASE_URL e SERVICE_ROLE_KEY no .env)
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import { XMLParser } from 'fast-xml-parser';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const ANO = parseInt(process.argv[2] || process.env.ANO_ALESP || '2026', 10); // uso: node coletor_alesp.js 2025
const BASE = 'https://www.al.sp.gov.br/repositorioDados/deputados';
// Obs.: a foto NÃO é resolvida aqui. Fica a cargo de rehospedar_fotos_alesp.js,
// que baixa do www3, redimensiona e sobe no Supabase Storage. Este coletor diário
// preserva a foto_url existente (não sobrescreve) pra não desfazer a rehospedagem.

// Obs.: o campo <Partido> da ALESP ja vem como SIGLA (PL, PT, PSD...),
// apesar de a documentacao dizer "numero". Usamos o valor direto.

const parser = new XMLParser({ ignoreAttributes: false, isArray: (n) => ['Deputado', 'despesa'].includes(n) });

async function getXml(url) {
  const res = await fetch(url, { headers: { Accept: 'application/xml' } });
  if (!res.ok) throw new Error(`HTTP ${res.status} em ${url}`);
  return parser.parse(await res.text());
}

// Acha a primeira lista de objetos que tenha a chave indicada (robusto a variacoes de raiz)
function coletarItens(obj, chave) {
  let achou = null;
  (function walk(o) {
    if (achou) return;
    if (Array.isArray(o)) {
      if (o.length && typeof o[0] === 'object' && o[0] !== null && chave in o[0]) { achou = o; return; }
      o.forEach(walk);
    } else if (o && typeof o === 'object') {
      for (const k of Object.keys(o)) { if (achou) break; walk(o[k]); }
    }
  })(obj);
  return achou || [];
}

const slugify = (s) => String(s || '').normalize('NFD').replace(/\p{Diacritic}/gu, '')
  .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

const limparCategoria = (tipo) => String(tipo || '').replace(/^[A-N]\.\s*/, '').trim() || 'Outros';

function parseValor(v) {
  if (v == null) return 0;
  let s = String(v).trim();
  if (s.includes(',')) s = s.replace(/\./g, '').replace(',', '.'); // pt-BR
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : 0;
}

async function main() {
  console.log(`ALESP - coletando deputados estaduais de SP (ano ${ANO})`);

  const depXml = await getXml(`${BASE}/deputados.xml`);
  const deputados = coletarItens(depXml, 'NomeParlamentar')
    .filter((d) => String(d.Situacao || '').toUpperCase().trim() === 'EXE');
  console.log(`${deputados.length} deputados em exercicio.`);
  if (deputados.length === 0) throw new Error('Nenhum deputado em exercicio - confira a estrutura do XML.');

  const usados = new Set();
  const linhasAg = deputados.map((d) => {
    let slug = slugify(d.NomeParlamentar);
    while (usados.has(slug)) slug = `${slug}-sp`;
    usados.add(slug);
    const matricula = String(d.Matricula || '').trim();
    return {
      nome_urna: d.NomeParlamentar,
      nome_completo: d.NomeParlamentar,
      partido_atual: String(d.Partido || '').trim() || 'S/P',
      cargo_atual: 'Deputado Estadual',
      uf_sede: 'SP',
      fonte_api: 'alesp',
      casa_legislativa: 'estadual',
      id_externo_api: matricula,
      foto_url: null, // novos deputados entram sem foto; rehospedar_fotos_alesp.js preenche depois
      slug,
    };
  });

  // Agentes: UPSERT por matrícula — mantém o MESMO id entre execuções e anos
  // (não apaga/recria, pra não orfanar despesas de outros anos).
  const { data: existentes } = await supabase
    .from('agentes_politicos').select('id, id_externo_api').eq('fonte_api', 'alesp');
  const idPorMatricula = new Map((existentes || []).map((e) => [String(e.id_externo_api), e.id]));
  const novos = [];
  for (const l of linhasAg) {
    const existeId = idPorMatricula.get(l.id_externo_api);
    if (existeId) {
      await supabase.from('agentes_politicos')
        .update({ nome_urna: l.nome_urna, partido_atual: l.partido_atual, cargo_atual: l.cargo_atual, slug: l.slug }) // foto_url preservada (ver rehospedar_fotos_alesp.js)
        .eq('id', existeId);
    } else {
      novos.push(l);
    }
  }
  if (novos.length) {
    const { data: ins, error: errAg } = await supabase.from('agentes_politicos').insert(novos).select('id, id_externo_api');
    if (errAg) throw errAg;
    for (const a of ins || []) idPorMatricula.set(String(a.id_externo_api), a.id);
  }
  console.log(`${linhasAg.length} deputados sincronizados (${novos.length} novos).`);

  // Despesas: apaga só o ANO coletado (multi-ano seguro) e reinsere
  await supabase.from('despesas_parlamentares').delete().eq('casa_legislativa', 'estadual').eq('ano', ANO);

  const despXml = await getXml(`${BASE}/despesas_gabinetes_${ANO}.xml`);
  const despesas = coletarItens(despXml, 'Valor');
  console.log(`${despesas.length} linhas de despesa no arquivo de ${ANO}.`);

  const linhasDesp = [];
  let semMatch = 0;
  for (const d of despesas) {
    const mat = String(d['Matrícula'] ?? d.Matricula ?? '').trim();
    const agenteId = idPorMatricula.get(mat);
    if (!agenteId) { semMatch++; continue; }
    const mes = parseInt(d.Mes, 10) || null;
    linhasDesp.push({
      agente_id: agenteId,
      ano: parseInt(d.Ano, 10) || ANO,
      mes,
      tipo_despesa: d.Tipo || null,
      categoria_normalizada: limparCategoria(d.Tipo),
      fornecedor_nome: d.Fornecedor || null,
      fornecedor_cnpj_cpf: d.CNPJ ? String(d.CNPJ) : null,
      valor_liquido: parseValor(d.Valor),
      data_emissao: mes ? `${ANO}-${String(mes).padStart(2, '0')}-01` : null,
      casa_legislativa: 'estadual',
    });
  }
  console.log(`${linhasDesp.length} despesas a gravar (${semMatch} sem deputado correspondente).`);

  for (let i = 0; i < linhasDesp.length; i += 500) {
    const { error } = await supabase.from('despesas_parlamentares').insert(linhasDesp.slice(i, i + 500));
    if (error) throw error;
  }
  console.log(`Concluido: ${linhasAg.length} deputados estaduais e ${linhasDesp.length} despesas (SP/${ANO}).`);
}

import { refreshRadar } from './refresh_radar.js';
main()
  .then(() => refreshRadar())
  .catch((e) => { console.error('ERRO:', e.message); process.exit(1); });
