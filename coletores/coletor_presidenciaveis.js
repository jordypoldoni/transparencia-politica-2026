// coletor_presidenciaveis.js — Candidatos à Presidência (e vice) nas Eleições 2026.
// Fonte: Portal de Dados Abertos do TSE (dadosabertos.tse.jus.br), CC-BY, atualizado 4x/dia.
//   - consulta_cand_2026.zip           → cadastro de TODOS os candidatos do país (filtramos Presidente/Vice)
//   - proposta_governo_2026_BR.zip     → PDF do plano de governo de cada presidenciável
//   - foto_cand2026_BR_div.zip         → foto oficial de divulgação
//
// Rodar LOCAL (precisa internet livre para cdn.tse.jus.br; o sandbox de nuvem não alcança).
// Precisa de .env com SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY, e das libs:
//   npm install adm-zip iconv-lite
// Idempotente (upsert por sq_candidato). SEM IA — só coleta e traduz nomes de campo; a
// proposta de governo fica como LINK do PDF oficial (decisão do Jordy, 2026-08-20: sem IA).
//
// GOTCHA a checar no primeiro run: os nomes dos arquivos dentro de proposta_governo_2026_BR.zip
// e foto_cand2026_BR_div.zip não foram confirmados neste run (o TSE não expõe dicionário de
// campos publicamente e o sandbox não alcança o CDN para inspecionar antes). O matching abaixo
// tenta várias estratégias e LOGA claramente qualquer PDF/foto que não bateu com nenhum
// candidato — se sobrar muita coisa "não casada", me manda o log que eu ajusto o matching.

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
const URL_PROPOSTAS = 'https://cdn.tse.jus.br/estatistica/sead/odsele/proposta_governo/proposta_governo_2026_BR.zip';
const URL_FOTOS = 'https://cdn.tse.jus.br/estatistica/sead/eleicoes/eleicoes2026/fotos/foto_cand2026_BR_div.zip';

const BUCKET_FOTOS = 'presidenciaveis-fotos';
const BUCKET_PROPOSTAS = 'presidenciaveis-propostas';

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

// O TSE usa valores "sentinela" pra marcar campo vazio/não aplicável nesses CSVs (ex.: quando
// um dado ainda não foi definido no processo eleitoral, como a situação da candidatura antes
// do julgamento). Não achei o dicionário oficial confirmando o significado exato de cada
// variação (procurei — sem sorte), então, pra não inventar um texto, tratamos como "sem dado"
// e simplesmente não mostramos — mesmo padrão já usado no resto do site pra campo ausente.
// GOTCHA (21/08): a 1ª versão comparava com uma lista fechada de strings exatas (`#NULO#`,
// `#NE#`...) e não pegou — o formato real do TSE pra esse campo aparentemente não fecha com
// `#` no final (ex.: `#NE` em vez de `#NE#`). Troquei pra um PADRÃO em vez de lista fechada:
// qualquer valor "curto, começa com #, só letras/números depois" conta como sentinela — pega
// qualquer variação (com ou sem # de fechamento) sem precisar acertar a grafia exata.
const REGEX_SENTINELA_TSE = /^#[A-ZÀ-Ú0-9]{1,12}#?$/i;

// Aceita nome de coluna com pequenas variações (case, espaços) e uma lista de aliases conhecidos
// do layout histórico do TSE, caso o nome mude de um ano para o outro.
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
    reportarFaltantes() {
      if (faltando.size) {
        console.warn(`   ⚠️  Colunas não encontradas no CSV (verificar layout do TSE): ${[...faltando].join(', ')}`);
      }
    },
  };
}

function extrairCandidatosDeArquivo(entry) {
  const texto = iconv.decode(entry.getData(), 'latin1');
  const linhas = texto.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (linhas.length < 2) return [];
  const headers = parseLinhaCsv(linhas[0]);
  const leitor = criarLeitor(headers);

  const candidatos = [];
  for (let i = 1; i < linhas.length; i++) {
    const row = parseLinhaCsv(linhas[i]);
    const cargo = (leitor.col(row, 'DS_CARGO') || '').toUpperCase();
    if (!/PRESIDENTE/.test(cargo)) continue; // pega "PRESIDENTE" e "VICE-PRESIDENTE"

    const ehVice = /VICE/.test(cargo);
    const nomeUrna = leitor.col(row, 'NM_URNA_CANDIDATO');
    const dtNasc = leitor.col(row, 'DT_NASCIMENTO'); // formato esperado DD/MM/AAAA
    let dataNascimentoISO = null;
    if (dtNasc && /^\d{2}\/\d{2}\/\d{4}$/.test(dtNasc)) {
      const [d, m, y] = dtNasc.split('/');
      dataNascimentoISO = `${y}-${m}-${d}`;
    }

    candidatos.push({
      cargo: ehVice ? 'Vice-Presidente' : 'Presidente',
      nr_candidato: leitor.col(row, 'NR_CANDIDATO'),
      sq_candidato: leitor.col(row, 'SQ_CANDIDATO'),
      nome_urna: nomeUrna,
      nome_completo: leitor.col(row, 'NM_CANDIDATO'),
      partido_sigla: leitor.col(row, 'SG_PARTIDO'),
      partido_numero: leitor.col(row, 'NR_PARTIDO'),
      partido_nome: leitor.col(row, 'NM_PARTIDO'),
      coligacao_nome: leitor.col(row, 'NM_COLIGACAO', 'NM_FEDERACAO'),
      coligacao_composicao: leitor.col(row, 'DS_COMPOSICAO_COLIGACAO', 'DS_COMPOSICAO_FEDERACAO'),
      situacao_candidatura: leitor.col(row, 'DS_SITUACAO_CANDIDATURA'),
      situacao_detalhe: leitor.col(row, 'DS_DETALHE_SITUACAO_CAND'),
      data_nascimento: dataNascimentoISO,
      naturalidade_uf: leitor.col(row, 'SG_UF_NASCIMENTO'),
      genero: leitor.col(row, 'DS_GENERO'),
      grau_instrucao: leitor.col(row, 'DS_GRAU_INSTRUCAO'),
      estado_civil: leitor.col(row, 'DS_ESTADO_CIVIL'),
      cor_raca: leitor.col(row, 'DS_COR_RACA'),
      ocupacao: leitor.col(row, 'DS_OCUPACAO'),
      slug: `${slugify(nomeUrna)}-${ehVice ? 'vice' : 'presidente'}-${ANO}`,
      fonte_api: 'https://divulgacandcontas.tse.jus.br/',
    });
  }
  leitor.reportarFaltantes();
  return candidatos;
}

// O zip nacional traz UM CSV POR UF (ex.: consulta_cand_2026_ES.csv, ..._BR.csv) — Presidente/Vice
// só aparecem no arquivo "_BR" (candidatura nacional). Pra não depender de um nome exato de
// arquivo (o TSE pode variar a convenção), tentamos primeiro o(s) arquivo(s) com "BR" no nome;
// se não achar ninguém neles, caímos pra varrer TODOS os CSVs do zip (mais lento, mas infalível).
async function extrairCandidatos(zip) {
  const todosCsv = zip.getEntries().filter((e) => !e.isDirectory && /consulta_cand.*\.csv$/i.test(e.entryName));
  if (!todosCsv.length) throw new Error('Não achei nenhum CSV de candidatos dentro do zip (nome de arquivo mudou?).');
  console.log(`   📦 ${todosCsv.length} arquivo(s) CSV no zip (um por UF, normalmente).`);

  const arquivosBR = todosCsv.filter((e) => /_BR[._]/i.test(e.entryName) || /[_-]BR\.csv$/i.test(e.entryName));
  let candidatos = [];
  for (const entry of (arquivosBR.length ? arquivosBR : [])) {
    console.log(`   arquivo CSV (BR): ${entry.entryName}`);
    candidatos.push(...extrairCandidatosDeArquivo(entry));
  }

  if (candidatos.length === 0) {
    console.log('   ⚠️  Nada encontrado no(s) arquivo(s) "BR" (ou nenhum arquivo "BR" identificado) — varrendo todos os CSVs do zip…');
    for (const entry of todosCsv) {
      const encontrados = extrairCandidatosDeArquivo(entry);
      if (encontrados.length) {
        console.log(`   arquivo CSV: ${entry.entryName} → ${encontrados.length} candidato(s) a Presidente/Vice`);
        candidatos.push(...encontrados);
      }
    }
  }

  // Dedup por sq_candidato (se por acaso aparecer em mais de um arquivo).
  const vistos = new Set();
  candidatos = candidatos.filter((c) => {
    if (!c.sq_candidato || vistos.has(c.sq_candidato)) return false;
    vistos.add(c.sq_candidato);
    return true;
  });
  return candidatos;
}

// Tenta casar um arquivo do zip (PDF ou foto) a um candidato pelo SQ_CANDIDATO ou NR_CANDIDATO
// aparecendo em algum lugar do nome do arquivo (o TSE costuma embutir esses IDs no nome).
function casarArquivo(nomeArquivo, candidatos) {
  const nums = nomeArquivo.match(/\d+/g) || [];
  for (const n of nums) {
    const porSq = candidatos.find((c) => c.sq_candidato === n);
    if (porSq) return porSq;
  }
  for (const n of nums) {
    const porNr = candidatos.find((c) => c.nr_candidato === n);
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

async function anexarPropostasEFotos(candidatos) {
  await garantirBucket(BUCKET_FOTOS);
  await garantirBucket(BUCKET_PROPOSTAS);

  const zipFotos = await baixar(URL_FOTOS, 'fotos').catch((e) => { console.warn(`   ⚠️  fotos: ${e.message}`); return null; });
  const zipPropostas = await baixar(URL_PROPOSTAS, 'propostas').catch((e) => { console.warn(`   ⚠️  propostas: ${e.message}`); return null; });

  const naoCasados = { fotos: [], propostas: [] };

  if (zipFotos) {
    for (const entry of zipFotos.getEntries()) {
      if (entry.isDirectory || !/\.(jpe?g|png)$/i.test(entry.entryName)) continue;
      const cand = casarArquivo(entry.entryName, candidatos);
      if (!cand) { naoCasados.fotos.push(entry.entryName); continue; }
      const url = await subirArquivo(BUCKET_FOTOS, `${ANO}/${cand.sq_candidato}.jpg`, entry.getData(), 'image/jpeg');
      if (url) cand.foto_url = url;
    }
  }

  if (zipPropostas) {
    for (const entry of zipPropostas.getEntries()) {
      if (entry.isDirectory || !/\.pdf$/i.test(entry.entryName)) continue;
      const cand = casarArquivo(entry.entryName, candidatos);
      if (!cand) { naoCasados.propostas.push(entry.entryName); continue; }
      const url = await subirArquivo(BUCKET_PROPOSTAS, `${ANO}/${cand.sq_candidato}.pdf`, entry.getData(), 'application/pdf');
      if (url) { cand.proposta_pdf_url = url; cand.proposta_coletada_em = new Date().toISOString(); }
    }
  }

  if (naoCasados.fotos.length) console.warn(`   ⚠️  ${naoCasados.fotos.length} foto(s) sem candidato correspondente: ${naoCasados.fotos.slice(0, 5).join(', ')}${naoCasados.fotos.length > 5 ? '…' : ''}`);
  if (naoCasados.propostas.length) console.warn(`   ⚠️  ${naoCasados.propostas.length} proposta(s) sem candidato correspondente: ${naoCasados.propostas.slice(0, 5).join(', ')}${naoCasados.propostas.length > 5 ? '…' : ''}`);
}

async function main() {
  console.log(`🚀 Presidenciáveis ${ANO} (TSE)…`);

  const zipCand = await baixar(URL_CANDIDATOS, 'candidatos');
  const candidatos = await extrairCandidatos(zipCand);
  console.log(`   🎯 ${candidatos.length} candidatos a Presidente/Vice encontrados.`);
  if (candidatos.length === 0) {
    console.error('❌ Nenhum candidato a Presidente/Vice achado — o layout do CSV pode ter mudado (ver aviso de colunas acima).');
    process.exit(1);
  }
  candidatos.forEach((c) => console.log(`      • ${c.cargo}: ${c.nome_urna} (${c.partido_sigla}, nº ${c.nr_candidato})`));

  await anexarPropostasEFotos(candidatos);

  let ok = 0, falhou = 0;
  for (const c of candidatos) {
    const { id_externo_api, ...resto } = c;
    const reg = { ...resto, id_externo_api: c.sq_candidato, ano_eleicao: ANO, atualizado_em: new Date().toISOString() };
    const { error } = await supabase.from('candidatos_presidenciais').upsert(reg, { onConflict: 'sq_candidato' });
    if (error) { console.warn(`   ⚠️  ${c.nome_urna}: ${error.message}`); falhou++; }
    else ok++;
  }

  console.log(`\n✅ Presidenciáveis: ${ok} gravados, ${falhou} com erro.`);
  console.log('   Confira no banco (tabela candidatos_presidenciais) e depois rode o site local pra ver /presidenciaveis.');
}

main().catch((e) => { console.error('💥 Erro:', e.message); process.exit(1); });
