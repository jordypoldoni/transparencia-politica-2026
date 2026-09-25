// Candidatos a GOVERNADOR nas eleições de 2026, com a ficha completa do TSE. (24/09/2026)
//
// Irmão do coletor de senador, mesma estratégia: são poucos candidatos (medido em 24/09 pela
// sonda: 7 no RS, 7 em SP, 6 no AC, uns 180 no país), e a ficha individual já traz tudo o que
// o arquivo em lote traria e mais. Uma fonte só, numa passada.
//
// O QUE MEDIMOS ANTES DE ESCREVER (24/09, coletores/_sonda_governador.mjs):
//   - listagem: /listar/2026/{UF}/6257/3/candidatos (cargo 3 = Governador)
//   - ficha: mesmo idEleicao do senador e do deputado federal (20322002026), abrangência = UF
//   - 81 campos na ficha, iguais aos do senador: a tradução compartilhada serve inteira
//   - o campo `vices` vem com UM item, o vice-governador, com o rótulo em ds_CARGO
//
// DIFERENÇA PARA O SENADOR: lá são dois suplentes e a ordem importa, então `suplentes` é uma
// lista ordenada. Aqui é um vice só, e a coluna `vice` guarda um objeto.
//
// agente_id fica vazio de propósito: agentes_politicos é a tabela dos PARLAMENTARES (Câmara,
// Senado, assembleias). Governador não tem mandato lá, então não há a quem casar. O campo
// existe para o dia em que houver, não para ser preenchido no chute.
//
// FOTO: baixada da fonte e guardada no nosso armazenamento, como a dos senadores. Só roda
// falando DIRETO com o TSE (máquina do Jordy): a ponte do Supabase devolve texto, e imagem
// passada como texto chega corrompida. Pela ponte (GitHub Actions) a foto é pulada, e quem já
// tem foto não perde.
//
// Uso:
//   node coletores/coletor_candidatos_governador_2026.js --uf=RS --simular   (mede, não grava)
//   node coletores/coletor_candidatos_governador_2026.js                     (todas as UFs)
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import { traduzir } from './ficha_tse_traduzir.js';
import { buscarTudo } from '../src/lib/paginar.js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const HOST_TSE = 'https://divulgacandcontas.tse.jus.br';
const REST = '/divulga/rest/v1/candidatura';
const ANO = 2026;
const ID_ELEICAO = 20322002026;
const ID_ELEICAO_LISTA = 6257;
const CARGO = 3; // Governador
const TABELA = 'candidatos_governador';
const BUCKET_FOTOS = 'governadores-candidatos-fotos';
const UA = { 'User-Agent': 'Mozilla/5.0', Accept: 'application/json' };
const TODAS_UFS = ['AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'];

const args = process.argv.slice(2);
const opcao = (nome) => { const a = args.find((x) => x.startsWith(`--${nome}=`)); return a ? a.split('=')[1] : null; };
const SIMULAR = args.includes('--simular');
const UFS = opcao('uf') ? opcao('uf').toUpperCase().split(',') : TODAS_UFS;
const PONTE = process.env.TSE_PONTE_URL || null;
const PONTE_TOKEN = process.env.PONTE_TOKEN || SUPABASE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) { console.error('❌ Faltam SUPABASE_URL e/ou SUPABASE_SERVICE_ROLE_KEY.'); process.exit(1); }
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const pausa = (ms = 400) => new Promise((r) => setTimeout(r, ms));
const slugify = (s) => (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

async function buscarTse(caminho) {
  const r = PONTE
    ? await fetch(`${PONTE}?caminho=${encodeURIComponent(caminho)}`, { headers: { Authorization: `Bearer ${PONTE_TOKEN}` } })
    : await fetch(HOST_TSE + caminho, { headers: UA });
  const erroDaPonte = r.headers.get('x-ponte-erro');
  if (erroDaPonte) throw new Error(`ponte: ${erroDaPonte}`);
  return r;
}

// "1972-06-13", "1972-06-13T00:00:00" ou "13/06/1972" → "1972-06-13". Qualquer outra coisa → null,
// em vez de gravar data inventada.
function dataIso(v) {
  const s = String(v || '').trim();
  let m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  m = s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (m) return `${m[3]}-${m[2]}-${m[1]}`;
  return null;
}

// O VICE. Mesmo campo `vices` que no senador guarda os dois suplentes.
//
// A FICHA PODE TRAZER MAIS DE UM, e a primeira versao deste coletor pegava o primeiro da
// lista. Errado: medimos em 24/09 (coletores/_sonda_vice_duplicado.mjs) que 19 das 201 chapas
// trazem dois, e que o segundo nome e quase sempre o vice SUBSTITUIDO, que a ficha continua
// listando. Em 10 dessas chapas o substituido vinha primeiro, e o banco ficou com o vice
// errado: a chapa do Garotinho (RJ) apareceu com Major Elaine no lugar de Andre Monteiro.
//
// O DISCRIMINADOR, medido na mesma sonda: `candidatoApto` true com situacaoVice "12" e o vice
// que esta na chapa; false com "3" e o substituido. Ficamos com o apto.
//
// Quando NENHUM e apto (uma chapa em SP, com os dois em "3"), nao inventamos: fica o primeiro,
// com apto=false, e a tela diz a situacao em vez de apresentar como vice confirmado.
// Os substituidos ficam guardados em `substituidos`, porque quem saiu da chapa e informacao,
// nao lixo.
function viceDe(f) {
  const lista = (Array.isArray(f.vices) ? f.vices : []).map((v) => ({
    cargo: v.ds_CARGO || v.dsCargo || v.nm_CARGO || null,
    nome: v.nm_URNA || v.nm_CANDIDATO || null,
    nome_completo: v.nm_CANDIDATO || null,
    sq: v.sq_CANDIDATO ? String(v.sq_CANDIDATO) : null,
    partido: v.sg_PARTIDO || null,
    partido_nome: v.nm_PARTIDO || null,
    apto: typeof v.candidatoApto === 'boolean' ? v.candidatoApto : null,
    situacao: v.situacaoVice || v.situacaoCandidato || null,
  }));
  if (!lista.length) return null;

  const aptos = lista.filter((v) => v.apto === true);
  const escolhido = aptos[0] || lista[0];
  const substituidos = lista.filter((v) => v !== escolhido);
  return { ...escolhido, ...(substituidos.length ? { substituidos } : {}) };
}

// Quantos aptos a ficha traz: 0 e chapa sem vice confirmado, mais de 1 foge do que medimos.
const quantosAptos = (f) => (Array.isArray(f.vices) ? f.vices : []).filter((v) => v.candidatoApto === true).length;

async function garantirBucket(nome) {
  const { data: buckets } = await supabase.storage.listBuckets();
  if (!buckets?.some((b) => b.name === nome)) {
    const { error } = await supabase.storage.createBucket(nome, { public: true });
    if (error && !/already exists/i.test(error.message)) console.warn(`   ⚠️  criar bucket ${nome}: ${error.message}`);
  }
}

async function subirFoto(url, uf, sq) {
  try {
    const r = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    if (!r.ok) return null;
    const tipo = r.headers.get('content-type') || 'image/jpeg';
    if (!/^image\//.test(tipo)) return null; // página de erro com cara de 200 não vira foto
    const buf = Buffer.from(await r.arrayBuffer());
    const caminho = `${ANO}/${uf}/${sq}.${/png/.test(tipo) ? 'png' : 'jpg'}`;
    const { error } = await supabase.storage.from(BUCKET_FOTOS).upload(caminho, buf, { contentType: tipo, upsert: true });
    if (error) { console.warn(`   ⚠️  foto ${sq}: ${error.message}`); return null; }
    return supabase.storage.from(BUCKET_FOTOS).getPublicUrl(caminho).data?.publicUrl || null;
  } catch { return null; }
}

async function main() {
  console.log(`🚀 Candidatos a Governador ${ANO}${SIMULAR ? ' (SIMULAÇÃO, nada gravado)' : ''}`);
  console.log(PONTE ? `🌉 via ponte (fotos puladas)` : '🔌 direto no TSE (com fotos)');

  // Quem já tem foto guardada não baixa de novo. buscarTudo, sempre: é a regra desde 20/09.
  const existentes = await buscarTudo(() => supabase.from(TABELA).select('sq_candidato, foto_url'), 'governador.existentes');
  const fotoJa = new Map(existentes.filter((e) => e.foto_url).map((e) => [e.sq_candidato, e.foto_url]));
  if (!SIMULAR && !PONTE) await garantirBucket(BUCKET_FOTOS);

  let ok = 0, fotos = 0, semVice = 0, semViceApto = 0, viceDemais = 0;
  // Vice não apto tem duas causas diferentes (medido em 25/09/2026): o TITULAR indeferido, e o
  // vice só acompanha a chapa; ou o titular apto com o vice em troca. Contar junto dizia
  // "substituição em curso" para 5 chapas em que nenhuma estava substituindo ninguém.
  const titularNaoApto = [];
  const semFoto = [];
  const falhou = [];

  for (const uf of UFS) {
    let lista = [];
    try {
      const r = await buscarTse(`${REST}/listar/${ANO}/${uf}/${ID_ELEICAO_LISTA}/${CARGO}/candidatos`);
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      lista = (await r.json()).candidatos || [];
    } catch (e) { falhou.push(`${uf} (listagem): ${e.message}`); continue; }
    const nomes = Object.fromEntries(lista.map((c) => [String(c.id), c.nomeUrna || c.nomeCompleto]));
    console.log(`── ${uf}: ${lista.length} candidatos`);

    for (const c of lista) {
      const sq = String(c.id);
      try {
        const r = await buscarTse(`${REST}/buscar/${ANO}/${uf}/${ID_ELEICAO}/candidato/${sq}`);
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const texto = await r.text();
        if (!texto) throw new Error('corpo vazio (abrangência ou id de eleição errados?)');
        const f = JSON.parse(texto);

        const { vices, uf_nascimento, ...ficha } = traduzir(f, (id) => nomes[String(id)] || null, sq, { ano: ANO, idEleicao: ID_ELEICAO, abrangencia: uf });
        const vice = viceDe(f);
        if (!vice) semVice++;
        else if (vice.apto !== true) {
          if (ficha.apto_tse === false) titularNaoApto.push(`${uf}/${f.nomeUrna} (${ficha.situacao_tse || 'não apto'})`);
          else semViceApto++;
        }
        if (quantosAptos(f) > 1) viceDemais++;

        const linha = {
          ano_eleicao: ANO,
          uf,
          sq_candidato: sq,
          id_externo_api: sq,
          nr_candidato: f.numero != null ? String(f.numero) : null,
          nome_urna: f.nomeUrna || null,
          nome_completo: f.nomeCompleto || null,
          slug: `${slugify(f.nomeUrna)}-${f.numero || 's'}-${sq}-${uf.toLowerCase()}-governador-${ANO}`,
          partido_sigla: f.partido?.sigla || null,
          partido_numero: f.partido?.numero != null ? String(f.partido.numero) : null,
          partido_nome: f.partido?.nome || null,
          coligacao_nome: f.nomeColigacao || null,
          coligacao_composicao: f.composicaoColigacao || null,
          situacao_candidatura: f.descricaoSituacao || null,
          data_nascimento: dataIso(f.dataDeNascimento),
          naturalidade_uf: uf_nascimento || f.sgUfNascimento || null,
          genero: f.descricaoSexo || null,
          grau_instrucao: f.grauInstrucao || null,
          estado_civil: f.descricaoEstadoCivil || null,
          cor_raca: f.descricaoCorRaca || null,
          ocupacao: f.ocupacao || null,
          vice,
          ...ficha,
          atualizado_em: new Date().toISOString(),
        };

        // `fotoUrl` é o endereço; `fotoUrlPublicavel` é um SIM/NÃO dizendo se a foto pode ser
        // publicada. Tratar o segundo como endereço custou 318 pedidos da foto "true" ao TSE
        // em 22/09, com zero fotos e zero aviso. A autorização é respeitada: se a fonte diz
        // que não publica, nós também não.
        if (fotoJa.has(sq)) linha.foto_url = fotoJa.get(sq);
        else if (!PONTE && !SIMULAR && f.fotoUrl && f.fotoUrlPublicavel !== false) {
          const url = await subirFoto(f.fotoUrl, uf, sq);
          if (url) { linha.foto_url = url; fotos++; }
          else semFoto.push(`${uf}/${f.nomeUrna}`);
        }

        if (SIMULAR) {
          console.log(`   ${linha.nome_urna} (${linha.partido_sigla} ${linha.nr_candidato}) · ${linha.situacao_tse} · ${ficha.bens.length} bens · ${ficha.eleicoes_anteriores.length} eleições · vice: ${vice ? `${vice.nome} (${vice.partido})${vice.apto === true ? '' : ' [NÃO APTO]'}${vice.substituidos ? ` [substituiu ${vice.substituidos.map((x) => x.nome).join(', ')}]` : ''}` : 'nenhum'}`);
        } else {
          const { error } = await supabase.from(TABELA).upsert(linha, { onConflict: 'sq_candidato' });
          if (error) throw new Error(`gravação: ${error.message}`);
        }
        ok++;
      } catch (e) {
        falhou.push(`${uf}/${c.nomeUrna}: ${e.message}`);
        if (falhou.length <= 10) console.warn(`   ⚠ ${c.nomeUrna}: ${e.message}`);
      }
      await pausa();
    }
  }

  console.log(`\n📊 ${ok} candidatos${SIMULAR ? ' lidos' : ' gravados'}, ${fotos} fotos novas, ${falhou.length} falhas`);
  if (semVice) console.log(`   ${semVice} sem vice na ficha (a tela não inventa: mostra que a fonte não informa)`);
  if (titularNaoApto.length) console.log(`   ${titularNaoApto.length} com o TITULAR não apto, e o vice segue a chapa: ${titularNaoApto.join(', ')}`);
  if (semViceApto) console.log(`   ${semViceApto} com titular apto e vice não apto (substituição de vice em curso): a tela mostra a situação, não afirma vice confirmado`);
  if (viceDemais) console.warn(`⚠️  ${viceDemais} fichas trouxeram MAIS DE UM vice APTO. Ficamos com o primeiro, mas isso foge do que medimos em 24/09 e merece olhada.`);
  if (semFoto.length) console.warn(`⚠️  ${semFoto.length} fotos não baixaram: ${semFoto.slice(0, 8).join(', ')}${semFoto.length > 8 ? '…' : ''}`);
  if (ok === 0) {
    console.error('❌ Nenhum candidato lido. Se for 403, o Akamai recusou a origem; a ponte existe para isso.');
    if (process.env.GITHUB_ACTIONS) console.log('::error title=Candidatos a Governador::Nenhum candidato coletado.');
    process.exitCode = 1;
  }
}

main().catch((e) => { console.error('💥 Erro:', e.message); process.exitCode = 1; });
