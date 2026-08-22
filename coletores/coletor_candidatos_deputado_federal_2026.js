// coletor_candidatos_deputado_federal_2026.js — Candidatos a Deputado Federal nas Eleições 2026.
// Fonte: Portal de Dados Abertos do TSE (dadosabertos.tse.jus.br), CC-BY, atualizado 4x/dia.
//   - consulta_cand_2026.zip                 → cadastro de TODOS os candidatos do país, 1 CSV por UF
//                                               (filtramos DS_CARGO = "DEPUTADO FEDERAL")
//   - foto_cand2026_{UF}_div.zip (27 arquivos, um por estado) → foto oficial de divulgação
//
// Diferente de coletor_presidenciaveis.js:
//   - Deputado Federal é eleito POR ESTADO — não existe um arquivo nacional único de fotos, são
//     27 zips (um por UF). O cadastro (consulta_cand) É um zip só, mas com 1 CSV por UF dentro.
//   - NÃO existe "proposta de governo" pra esse cargo (só cargos majoritários — Presidente,
//     Governador, Prefeito — são obrigados a apresentar plano de governo). Por isso não baixamos
//     nem gravamos PDF aqui.
//   - Gravamos `reeleicao` (ST_REELEICAO do TSE) — pedido do Jordy: trazer tanto quem busca
//     reeleição quanto quem está se candidatando pela primeira vez (ou seja, todo mundo).
//
// Rodar LOCAL (precisa internet livre para cdn.tse.jus.br; o sandbox de nuvem não alcança —
// testado, dá 403). Precisa de .env com SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY, e das libs
// (já estão no package.json do projeto): adm-zip, iconv-lite, dotenv, @supabase/supabase-js.
//
// Escopo grande (~7.600 candidatos, 27 zips de fotos) — pode demorar (dezenas de minutos).
// Idempotente (upsert por sq_candidato) e SEGURO DE RE-RODAR se cair no meio.
//
// Uso:
//   node coletores/coletor_candidatos_deputado_federal_2026.js            → todos os 27 estados
//   node coletores/coletor_candidatos_deputado_federal_2026.js --uf=SP    → só SP (bom pra testar
//                                                                            o matching de fotos
//                                                                            antes de rodar geral)
//   node coletores/coletor_candidatos_deputado_federal_2026.js --uf=SP,MG,RJ → uma lista de UFs
//
// GOTCHA a checar no primeiro run (mesmo alerta do coletor de presidenciáveis): os nomes dos
// arquivos DENTRO dos zips de foto não foram confirmados (sandbox não alcança o CDN pra inspecionar
// antes). O matching abaixo tenta o nome do arquivo = SQ_CANDIDATO exato primeiro (convenção mais
// provável do TSE), depois cai pro mesmo heurístico de "número embutido no nome" do coletor de
// presidenciáveis. Loga claramente qualquer foto que não bateu — se sobrar muita coisa "não
// casada" no primeiro UF testado, me manda o log que eu ajusto antes de rodar os outros 26.

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import AdmZip from 'adm-zip';
import iconv from 'iconv-lite';
import fs from 'fs';
import os from 'os';
import path from 'path';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SUPABASE_KEY) { console.error('❌ Faltam credenciais Supabase (.env).'); process.exit(1); }
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const ANO = 2026;
const URL_CANDIDATOS = 'https://cdn.tse.jus.br/estatistica/sead/odsele/consulta_cand/consulta_cand_2026.zip';
const urlFotosUf = (uf) => `https://cdn.tse.jus.br/estatistica/sead/eleicoes/eleicoes2026/fotos/foto_cand2026_${uf}_div.zip`;

const BUCKET_FOTOS = 'deputados-federais-fotos';

const TODAS_UFS = ['AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'];

// --uf=SP,MG → roda só esses estados (cadastro E fotos). Sem a flag, roda os 27.
const argUf = process.argv.find((a) => a.startsWith('--uf='));
const UFS_ALVO = argUf ? argUf.replace('--uf=', '').split(',').map((s) => s.trim().toUpperCase()).filter(Boolean) : TODAS_UFS;

const slugify = (s) => (s || '')
  .normalize('NFD').replace(/[̀-ͯ]/g, '')
  .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

async function baixar(url, label) {
  console.log(`⬇️  Baixando ${label}…`);
  const r = await fetch(url);
  if (!r.ok) throw new Error(`${label}: HTTP ${r.status} ao baixar ${url}`);
  const buf = Buffer.from(await r.arrayBuffer());
  console.log(`   ${label}: ${(buf.length / 1024 / 1024).toFixed(1)} MB`);
  const tmp = path.join(os.tmpdir(), `tse_${label.replace(/\s+/g, '_')}_${ANO}.zip`);
  fs.writeFileSync(tmp, buf);
  return new AdmZip(tmp);
}

// Parser de CSV com ; como separador e campos entre aspas (padrão TSE). Tolera ; dentro de aspas.
function parseLinhaCsv(linha) {
  const campos = [];
  let atual = '';
  let dentroAspas = false;
  for (let i = 0; i < linha.length; i++) {
    const c = linha[i];
    if (c === '"') {
      if (dentroAspas && linha[i + 1] === '"') { atual += '"'; i++; }
      else dentroAspas = !dentroAspas;
    } else if (c === ';' && !dentroAspas) {
      campos.push(atual); atual = '';
    } else {
      atual += c;
    }
  }
  campos.push(atual);
  return campos.map((c) => c.trim());
}

// Mesmo padrão de sentinela do coletor de presidenciáveis (ver comentário lá): qualquer valor
// "curto, começa com #" conta como "sem dado" — não inventamos tradução sem fonte confirmada.
const REGEX_SENTINELA_TSE = /^#[A-ZÀ-Ú0-9]{1,12}#?$/i;

function criarLeitor(headers) {
  const idx = new Map(headers.map((h, i) => [h.trim().toUpperCase(), i]));
  const faltando = new Set();
  return {
    col(row, ...nomes) {
      for (const n of nomes) {
        const i = idx.get(n.toUpperCase());
        if (i != null && row[i] !== undefined) {
          const v = row[i];
          if (!v) return null;
          if (REGEX_SENTINELA_TSE.test(v.trim())) return null;
          return v;
        }
      }
      faltando.add(nomes[0]);
      return null;
    },
    reportarFaltantes(rotulo) {
      if (faltando.size) {
        console.warn(`   ⚠️  [${rotulo}] Colunas não encontradas no CSV (verificar layout do TSE): ${[...faltando].join(', ')}`);
      }
    },
  };
}

// Extrai o UF do nome do arquivo (ex.: consulta_cand_2026_SP.csv → SP) — usado só como
// fallback/checagem cruzada; o valor de verdade vem da coluna SG_UF de cada linha.
function ufDoNomeArquivo(entryName) {
  const m = entryName.match(/consulta_cand_\d{4}_([A-Z]{2})\.csv$/i);
  return m ? m[1].toUpperCase() : null;
}

function extrairCandidatosDeArquivo(entry) {
  const texto = iconv.decode(entry.getData(), 'latin1');
  const linhas = texto.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (linhas.length < 2) return [];
  const headers = parseLinhaCsv(linhas[0]);
  const leitor = criarLeitor(headers);
  const ufArquivo = ufDoNomeArquivo(entry.entryName);

  const candidatos = [];
  for (let i = 1; i < linhas.length; i++) {
    const row = parseLinhaCsv(linhas[i]);
    const cargo = (leitor.col(row, 'DS_CARGO') || '').toUpperCase().trim();
    if (cargo !== 'DEPUTADO FEDERAL') continue; // exato — evita casar "DEPUTADO ESTADUAL"/"DISTRITAL"

    const nomeUrna = leitor.col(row, 'NM_URNA_CANDIDATO');
    const uf = (leitor.col(row, 'SG_UF') || ufArquivo || '').toUpperCase();
    const dtNasc = leitor.col(row, 'DT_NASCIMENTO'); // formato esperado DD/MM/AAAA
    let dataNascimentoISO = null;
    if (dtNasc && /^\d{2}\/\d{2}\/\d{4}$/.test(dtNasc)) {
      const [d, m, y] = dtNasc.split('/');
      dataNascimentoISO = `${y}-${m}-${d}`;
    }
    const stReeleicao = (leitor.col(row, 'ST_REELEICAO') || '').toUpperCase();
    const nrCandidato = leitor.col(row, 'NR_CANDIDATO');
    const sqCandidato = leitor.col(row, 'SQ_CANDIDATO');

    candidatos.push({
      uf,
      nr_candidato: nrCandidato,
      sq_candidato: sqCandidato,
      nome_urna: nomeUrna,
      nome_completo: leitor.col(row, 'NM_CANDIDATO'),
      partido_sigla: leitor.col(row, 'SG_PARTIDO'),
      partido_numero: leitor.col(row, 'NR_PARTIDO'),
      partido_nome: leitor.col(row, 'NM_PARTIDO'),
      coligacao_nome: leitor.col(row, 'NM_COLIGACAO', 'NM_FEDERACAO'),
      coligacao_composicao: leitor.col(row, 'DS_COMPOSICAO_COLIGACAO', 'DS_COMPOSICAO_FEDERACAO'),
      situacao_candidatura: leitor.col(row, 'DS_SITUACAO_CANDIDATURA'),
      situacao_detalhe: leitor.col(row, 'DS_DETALHE_SITUACAO_CAND'),
      reeleicao: stReeleicao === 'S' ? true : stReeleicao === 'N' ? false : null,
      data_nascimento: dataNascimentoISO,
      naturalidade_uf: leitor.col(row, 'SG_UF_NASCIMENTO'),
      genero: leitor.col(row, 'DS_GENERO'),
      grau_instrucao: leitor.col(row, 'DS_GRAU_INSTRUCAO'),
      estado_civil: leitor.col(row, 'DS_ESTADO_CIVIL'),
      cor_raca: leitor.col(row, 'DS_COR_RACA'),
      ocupacao: leitor.col(row, 'DS_OCUPACAO'),
      slug: `${slugify(nomeUrna)}-${nrCandidato || sqCandidato}-${(uf || 'xx').toLowerCase()}-deputado-federal-${ANO}`,
      fonte_api: 'https://divulgacandcontas.tse.jus.br/',
    });
  }
  leitor.reportarFaltantes(entry.entryName);
  return candidatos;
}

// O zip nacional traz um CSV por UF — aqui, diferente de presidenciáveis, precisamos varrer
// TODOS (Deputado Federal só existe nos arquivos por estado, não existe um "_BR").
function extrairCandidatos(zip, ufsAlvo) {
  const todosCsv = zip.getEntries().filter((e) => !e.isDirectory && /consulta_cand.*\.csv$/i.test(e.entryName));
  if (!todosCsv.length) throw new Error('Não achei nenhum CSV de candidatos dentro do zip (nome de arquivo mudou?).');
  console.log(`   📦 ${todosCsv.length} arquivo(s) CSV no zip (um por UF).`);

  const alvoSet = new Set(ufsAlvo);
  let candidatos = [];
  for (const entry of todosCsv) {
    const ufArquivo = ufDoNomeArquivo(entry.entryName);
    // Se o nome do arquivo não bate com o padrão esperado, processa mesmo assim (defensivo) —
    // só pula quando identificamos o UF E ele não está na lista pedida.
    if (ufArquivo && !alvoSet.has(ufArquivo)) continue;
    const encontrados = extrairCandidatosDeArquivo(entry);
    if (encontrados.length) {
      console.log(`   arquivo CSV: ${entry.entryName} → ${encontrados.length} candidato(s) a Deputado Federal`);
      candidatos.push(...encontrados);
    }
  }

  // Dedup por sq_candidato.
  const vistos = new Set();
  candidatos = candidatos.filter((c) => {
    if (!c.sq_candidato || vistos.has(c.sq_candidato)) return false;
    vistos.add(c.sq_candidato);
    return true;
  });
  return candidatos;
}

function stemArquivo(nomeArquivo) {
  const base = nomeArquivo.split('/').pop();
  return base.replace(/\.[^.]+$/, '');
}

// Tenta casar um arquivo de foto a um candidato: primeiro pelo nome do arquivo (sem extensão)
// batendo EXATO com o SQ_CANDIDATO (convenção mais provável do TSE), senão cai pro heurístico de
// "algum número no nome do arquivo bate com SQ ou NR" (mesmo usado em presidenciáveis).
function casarArquivo(nomeArquivo, mapaSq, candidatosUf) {
  const stem = stemArquivo(nomeArquivo);
  if (mapaSq.has(stem)) return mapaSq.get(stem);
  const nums = nomeArquivo.match(/\d+/g) || [];
  for (const n of nums) {
    if (mapaSq.has(n)) return mapaSq.get(n);
  }
  for (const n of nums) {
    const porNr = candidatosUf.find((c) => c.nr_candidato === n);
    if (porNr) return porNr;
  }
  return null;
}

async function garantirBucket(nome) {
  const { data: buckets } = await supabase.storage.listBuckets();
  if (!buckets?.some((b) => b.name === nome)) {
    const { error } = await supabase.storage.createBucket(nome, { public: true });
    if (error && !/already exists/i.test(error.message)) console.warn(`   ⚠️  criar bucket ${nome}: ${error.message}`);
    else console.log(`   📦 bucket "${nome}" criado.`);
  }
}

async function subirArquivo(bucket, caminho, buffer, contentType) {
  const { error } = await supabase.storage.from(bucket).upload(caminho, buffer, { contentType, upsert: true });
  if (error) { console.warn(`   ⚠️  upload ${caminho}: ${error.message}`); return null; }
  const { data } = supabase.storage.from(bucket).getPublicUrl(caminho);
  return data?.publicUrl || null;
}

// Processa um UF inteiro: baixa o zip de fotos dele, casa com os candidatos daquele UF, sobe as
// fotos casadas, e grava (upsert) os candidatos do UF no banco. Feito por UF (em vez de tudo de
// uma vez) pra permitir rodar em pedaços (--uf=) e pra não perder tudo se um zip falhar no meio.
async function processarUf(uf, candidatosDoUf) {
  console.log(`\n🗺️  ${uf}: ${candidatosDoUf.length} candidato(s) a Deputado Federal.`);
  if (candidatosDoUf.length === 0) return { ok: 0, falhou: 0, fotosOk: 0, fotosNao: 0 };

  const mapaSq = new Map(candidatosDoUf.map((c) => [c.sq_candidato, c]));

  let fotosOk = 0;
  const naoCasadas = [];
  try {
    const zipFotos = await baixar(urlFotosUf(uf), `fotos ${uf}`);
    const entradasFoto = zipFotos.getEntries().filter((e) => !e.isDirectory && /\.(jpe?g|png)$/i.test(e.entryName));
    console.log(`   📸 ${uf}: ${entradasFoto.length} foto(s) no zip — casando e enviando pro Supabase Storage (sem log por foto; aparece um "..." a cada 50)…`);
    let processadas = 0;
    for (const entry of entradasFoto) {
      const cand = casarArquivo(entry.entryName, mapaSq, candidatosDoUf);
      if (!cand) { naoCasadas.push(entry.entryName); continue; }
      const url = await subirArquivo(BUCKET_FOTOS, `${ANO}/${uf}/${cand.sq_candidato}.jpg`, entry.getData(), 'image/jpeg');
      if (url) { cand.foto_url = url; fotosOk++; }
      processadas++;
      if (processadas % 50 === 0) process.stdout.write(`   ... ${processadas}/${entradasFoto.length}\n`);
    }
  } catch (e) {
    console.warn(`   ⚠️  fotos ${uf}: ${e.message} (candidatos serão gravados sem foto por enquanto)`);
  }
  if (naoCasadas.length) {
    console.warn(`   ⚠️  ${uf}: ${naoCasadas.length} foto(s) do zip sem candidato a Deputado Federal correspondente (podem ser de outros cargos no mesmo zip — governador, senador etc.): ${naoCasadas.slice(0, 3).join(', ')}${naoCasadas.length > 3 ? '…' : ''}`);
  }
  console.log(`   🖼️  ${uf}: ${fotosOk}/${candidatosDoUf.length} fotos casadas e enviadas.`);

  let ok = 0, falhou = 0, gravadas = 0;
  for (const c of candidatosDoUf) {
    const reg = { ...c, id_externo_api: c.sq_candidato, ano_eleicao: ANO, atualizado_em: new Date().toISOString() };
    const { error } = await supabase.from('candidatos_deputado_federal').upsert(reg, { onConflict: 'sq_candidato' });
    if (error) { console.warn(`   ⚠️  ${c.nome_urna} (${uf}): ${error.message}`); falhou++; }
    else ok++;
    gravadas++;
    if (gravadas % 100 === 0) process.stdout.write(`   ... gravando ${gravadas}/${candidatosDoUf.length}\n`);
  }
  console.log(`   💾 ${uf}: ${ok} gravados, ${falhou} com erro.`);
  return { ok, falhou, fotosOk, fotosNao: naoCasadas.length };
}

async function main() {
  console.log(`🚀 Candidatos a Deputado Federal ${ANO} (TSE) — ${UFS_ALVO.length} estado(s): ${UFS_ALVO.join(', ')}`);
  if (UFS_ALVO.length < 27) console.log('   (rodando só um subconjunto de estados — use sem --uf pra pegar o Brasil inteiro)');

  await garantirBucket(BUCKET_FOTOS);

  const zipCand = await baixar(URL_CANDIDATOS, 'candidatos');
  const todosCandidatos = extrairCandidatos(zipCand, UFS_ALVO);
  console.log(`\n🎯 ${todosCandidatos.length} candidatos a Deputado Federal encontrados no total (${UFS_ALVO.length} estado(s)).`);
  if (todosCandidatos.length === 0) {
    console.error('❌ Nenhum candidato a Deputado Federal achado — o layout do CSV pode ter mudado (ver avisos de colunas acima) ou o(s) UF(s) pedido(s) não bateu com o nome do arquivo.');
    process.exit(1);
  }

  const porUf = new Map();
  for (const c of todosCandidatos) {
    if (!porUf.has(c.uf)) porUf.set(c.uf, []);
    porUf.get(c.uf).push(c);
  }

  let totalOk = 0, totalFalhou = 0, totalFotosOk = 0, totalFotosNao = 0;
  for (const uf of UFS_ALVO) {
    const candidatosDoUf = porUf.get(uf) || [];
    const r = await processarUf(uf, candidatosDoUf);
    totalOk += r.ok; totalFalhou += r.falhou; totalFotosOk += r.fotosOk; totalFotosNao += r.fotosNao;
  }

  console.log(`\n✅ Deputados Federais: ${totalOk} gravados, ${totalFalhou} com erro. Fotos: ${totalFotosOk} casadas, ${totalFotosNao} sem candidato correspondente.`);
  console.log('   Confira no banco (tabela candidatos_deputado_federal) e depois rode o site local pra ver /candidatos-2026?cargo=deputado-federal.');
}

main().catch((e) => { console.error('💥 Erro:', e.message); process.exit(1); });
