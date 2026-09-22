// Candidatos a SENADOR nas eleições de 2026, com a ficha completa do TSE. (22/09/2026)
//
// DIFERENTE DO COLETOR DOS DEPUTADOS, de propósito: aquele lê o arquivo em lote do TSE
// (consulta_cand_2026.zip, 7.600 linhas) e depois a ficha. Aqui são 318 candidatos (medido em
// 22/09, de 7 em AL a 20 no PI), e a ficha individual já traz tudo o que o lote traria e mais:
// nome completo, nascimento, escolaridade, foto, patrimônio, trajetória, documentos e os DOIS
// SUPLENTES. Uma fonte só, numa passada.
//
// O QUE MEDIMOS ANTES DE ESCREVER (22/09, no navegador, que passa pelo Akamai):
//   - listagem: /listar/2026/{UF}/6257/5/candidatos (cargo 5 = Senador)
//   - ficha: mesmo idEleicao do presidente e do deputado (20322002026), abrangência = UF
//   - a ficha traz os suplentes no campo `vices`, que no presidente é o vice
//
// A tradução dos campos da ficha é a MESMA dos outros dois coletores (ficha_tse_traduzir.js).
//
// FOTO: baixada da fonte e guardada no nosso armazenamento, como a dos deputados. Só roda
// falando DIRETO com o TSE (máquina do Jordy): a ponte do Supabase devolve texto, e imagem
// passada como texto chega corrompida. Pela ponte (GitHub Actions) a foto é pulada, e quem já
// tem foto não perde.
//
// Uso:
//   node coletores/coletor_candidatos_senador_2026.js --uf=RS --simular   (mede, não grava)
//   node coletores/coletor_candidatos_senador_2026.js                     (todas as UFs)
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
const CARGO = 5; // Senador
const BUCKET_FOTOS = 'senadores-candidatos-fotos';
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

// SUPLENTES. No presidente o campo `vices` é o vice; no senador são o 1º e o 2º suplente da
// chapa. A ORDEM importa (o 1º assume antes), então ela sai do rótulo do cargo que a fonte manda
// quando manda; sem rótulo, fica a posição na lista e a tela não afirma qual é qual.
function suplentesDa(f) {
  return (Array.isArray(f.vices) ? f.vices : []).map((v, i) => {
    const rotulo = v.ds_CARGO || v.dsCargo || v.nm_CARGO || v.cargo?.nome || null;
    const ordem = /1/.test(rotulo || '') ? 1 : /2/.test(rotulo || '') ? 2 : null;
    return {
      ordem,
      posicao: i + 1,
      cargo: rotulo,
      nome: v.nm_URNA || v.nm_CANDIDATO || null,
      nome_completo: v.nm_CANDIDATO || null,
      sq: v.sq_CANDIDATO ? String(v.sq_CANDIDATO) : null,
      partido: v.sg_PARTIDO || null,
      apto: typeof v.candidatoApto === 'boolean' ? v.candidatoApto : null,
    };
  }).sort((a, b) => (a.ordem || a.posicao) - (b.ordem || b.posicao));
}

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
  console.log(`🚀 Candidatos a Senador ${ANO}${SIMULAR ? ' (SIMULAÇÃO, nada gravado)' : ''}`);
  console.log(PONTE ? `🌉 via ponte (fotos puladas)` : '🔌 direto no TSE (com fotos)');

  // Quem já tem foto guardada não baixa de novo. buscarTudo, sempre: é a regra desde 20/09.
  const existentes = await buscarTudo(() => supabase.from('candidatos_senador').select('sq_candidato, foto_url'), 'senador.existentes');
  const fotoJa = new Map(existentes.filter((e) => e.foto_url).map((e) => [e.sq_candidato, e.foto_url]));
  if (!SIMULAR && !PONTE) await garantirBucket(BUCKET_FOTOS);

  let ok = 0, fotos = 0, semSuplente = 0, vistoRotulo = false;
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

        // Na primeira ficha, mostra os campos crus dos suplentes: se a fonte não mandar o rótulo
        // do cargo, a ordem 1º/2º não é afirmada, e isto aparece aqui antes de ir para a tela.
        if (!vistoRotulo && Array.isArray(f.vices) && f.vices.length) {
          console.log(`   (campos do suplente na fonte: ${Object.keys(f.vices[0]).join(', ')})`);
          vistoRotulo = true;
        }

        const { vices, uf_nascimento, ...ficha } = traduzir(f, (id) => nomes[String(id)] || null, sq, { ano: ANO, idEleicao: ID_ELEICAO, abrangencia: uf });
        const suplentes = suplentesDa(f);
        if (!suplentes.length) semSuplente++;

        const linha = {
          ano_eleicao: ANO,
          uf,
          sq_candidato: sq,
          id_externo_api: sq,
          nr_candidato: f.numero != null ? String(f.numero) : null,
          nome_urna: f.nomeUrna || null,
          nome_completo: f.nomeCompleto || null,
          slug: `${slugify(f.nomeUrna)}-${f.numero || 's'}-${sq}-${uf.toLowerCase()}-senador-${ANO}`,
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
          suplentes,
          ...ficha,
          atualizado_em: new Date().toISOString(),
        };

        // `fotoUrl` é o endereço; `fotoUrlPublicavel` é um SIM/NÃO dizendo se a foto pode ser
        // publicada. A primeira versão tratou o segundo como endereço e pediu ao TSE a foto
        // "true" 318 vezes, com zero fotos e zero aviso (22/09). A autorização é respeitada:
        // se a fonte diz que não publica, nós também não.
        if (fotoJa.has(sq)) linha.foto_url = fotoJa.get(sq);
        else if (!PONTE && !SIMULAR && f.fotoUrl && f.fotoUrlPublicavel !== false) {
          const url = await subirFoto(f.fotoUrl, uf, sq);
          if (url) { linha.foto_url = url; fotos++; }
          else semFoto.push(`${uf}/${f.nomeUrna}`);
        }

        if (SIMULAR) {
          console.log(`   ${linha.nome_urna} (${linha.partido_sigla} ${linha.nr_candidato}) · ${linha.situacao_tse} · ${ficha.bens.length} bens · ${ficha.eleicoes_anteriores.length} eleições · suplentes: ${suplentes.map((s) => `${s.cargo || s.posicao + 'º?'} ${s.nome}`).join(' / ') || 'nenhum'}`);
        } else {
          const { error } = await supabase.from('candidatos_senador').upsert(linha, { onConflict: 'sq_candidato' });
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
  if (semSuplente) console.log(`   ${semSuplente} sem suplente na ficha (a tela não inventa: mostra que a fonte não informa)`);
  if (semFoto.length) console.warn(`⚠️  ${semFoto.length} fotos não baixaram: ${semFoto.slice(0, 8).join(', ')}${semFoto.length > 8 ? '…' : ''}`);
  if (ok === 0) {
    console.error('❌ Nenhum candidato lido. Se for 403, o Akamai recusou a origem; a ponte existe para isso.');
    if (process.env.GITHUB_ACTIONS) console.log('::error title=Candidatos a Senador::Nenhum candidato coletado.');
    process.exitCode = 1;
  }
}

main().catch((e) => { console.error('💥 Erro:', e.message); process.exitCode = 1; });
