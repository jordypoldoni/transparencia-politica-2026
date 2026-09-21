// Ficha do TSE para os DEPUTADOS FEDERAIS (20/09/2026).
//
// O QUE ISTO ACRESCENTA
// A tabela candidatos_deputado_federal tem os 7.703 candidatos com o dado da candidatura, mas
// nada da ficha individual: situacao, patrimonio declarado, documentos, redes, substituicao.
// Isso existia so para os 14 presidenciaveis desde 13/09.
//
// DUAS COISAS MEDIDAS EM 20/09 QUE DEFINEM ESTE ARQUIVO
// 1. A ficha do deputado usa o MESMO idEleicao do presidente (20322002026), mas a abrangencia
//    tem que ser a UF. Com BR vem HTTP 200 e CORPO VAZIO, nao erro: corpo vazio nao e ausencia
//    de dado, e o script trata isso como falha e diz por que.
// 2. A listagem por UF NAO substitui a ficha: traz as 458 do RS em 1,1 MB com os campos nulos.
//
// RETOMADA, porque 7.703 fichas nao cabem numa execucao so: cada ficha gravada marca
// ficha_coletada_em, e o coletor busca sempre quem ainda esta sem marca. Cair no meio nao
// desperdica o que ja foi feito, e re-rodar nao repete trabalho.
//
// Uso:
//   node coletores/coletor_ficha_tse_federal.js --uf=AC --simular   (mede, nao grava)
//   node coletores/coletor_ficha_tse_federal.js --uf=RS
//   node coletores/coletor_ficha_tse_federal.js --limite=800        (todas as UFs, ate 800)
//   node coletores/coletor_ficha_tse_federal.js --refazer           (ignora o ja coletado)
//   node coletores/coletor_ficha_tse_federal.js --abertos           (so quem ainda pode mudar)
//
// --abertos (21/09/2026): a recoleta diaria até a eleição. Das 7.703, só 390 estavam numa
// situação que ainda muda (indeferido com recurso, deferido com recurso, pendente de
// julgamento). Recoletar todas todo dia seriam 100 mil requisições ao TSE até 04/10 passando
// pela mesma ponte, o que convida o Akamai a desconfiar dela também. O giro completo fica
// semanal, para pegar quem era definitivo e mudou.
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import { traduzir } from './ficha_tse_traduzir.js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const HOST_TSE = 'https://divulgacandcontas.tse.jus.br';
const REST = '/divulga/rest/v1/candidatura';
const ANO = 2026;
const ID_ELEICAO = 20322002026;   // o mesmo do presidente; o que muda e a abrangencia
const ID_ELEICAO_LISTA = 6257;    // o da listagem, outro numero (ver coletor_ficha_tse.js)
const CARGO = 6;                  // deputado federal
const UA = { 'User-Agent': 'Mozilla/5.0', Accept: 'application/json' };

const args = process.argv.slice(2);
const opcao = (nome) => { const a = args.find((x) => x.startsWith(`--${nome}=`)); return a ? a.split('=')[1] : null; };
const SIMULAR = args.includes('--simular');
const REFAZER = args.includes('--refazer');
const ABERTOS = args.includes('--abertos');
// A lista é do TSE, com a grafia do TSE. Situação nova que aparecer fica FORA do filtro diário e
// entra no giro semanal: é o lado seguro, porque o erro possível é recoletar pouco num dia, nunca
// deixar alguém de fora para sempre.
const SITUACOES_ABERTAS = ['Indeferido em prazo recursal ou com recurso', 'Deferido com recurso', 'Pendente de julgamento'];
const UF_ALVO = (opcao('uf') || '').toUpperCase() || null;
const LIMITE = parseInt(opcao('limite') || '0', 10) || null;
const PAUSA = parseInt(opcao('pausa') || '400', 10);

// A ponte do Supabase existe porque o Akamai do TSE bloqueia por origem (Vercel, GitHub Actions
// e nuvem levam 403; a maquina do Jordy e as Edge Functions passam). Ver supabase/functions/tse-ponte.
const PONTE = process.env.TSE_PONTE_URL || null;
const PONTE_TOKEN = process.env.PONTE_TOKEN || SUPABASE_KEY;

let bytesLidos = 0;
async function buscarTse(caminho) {
  const r = PONTE
    ? await fetch(`${PONTE}?caminho=${encodeURIComponent(caminho)}`, { headers: { Authorization: `Bearer ${PONTE_TOKEN}` } })
    : await fetch(HOST_TSE + caminho, { headers: UA });
  const erroDaPonte = r.headers.get('x-ponte-erro');
  if (erroDaPonte) throw new Error(`ponte: ${erroDaPonte}`);
  return r;
}

const pausa = (ms = PAUSA) => new Promise((r) => setTimeout(r, ms));

// Nome de quem substituiu, por UF: a listagem daquela UF ja tem todos os nomes, entao e uma
// requisicao por UF, nao uma por candidato.
async function mapaDeNomes(uf) {
  try {
    const r = await buscarTse(`${REST}/listar/${ANO}/${uf}/${ID_ELEICAO_LISTA}/${CARGO}/candidatos`);
    if (!r.ok) { console.warn(`   ⚠ listagem ${uf}: HTTP ${r.status}`); return {}; }
    const j = await r.json();
    const mapa = {};
    for (const c of j.candidatos || []) if (c?.id) mapa[String(c.id)] = c.nomeUrna || c.nomeCompleto || null;
    return mapa;
  } catch (e) { console.warn(`   ⚠ listagem ${uf}: ${e.message}`); return {}; }
}

async function main() {
  const modo = ABERTOS ? ' · só situações em aberto' : REFAZER ? ' · todos, refazendo' : '';
  console.log(`🚀 Ficha do TSE, deputados federais${modo}${SIMULAR ? ' (SIMULAÇÃO, nada gravado)' : ''}`);
  console.log(PONTE ? `🌉 via ponte: ${PONTE}` : '🔌 direto no TSE (sem ponte)');
  if (!SUPABASE_URL || !SUPABASE_KEY) { console.error('❌ Faltam credenciais Supabase.'); process.exitCode = 1; return; }
  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

  // PAGINAÇÃO OBRIGATÓRIA: o Supabase devolve no máximo 1.000 linhas por requisição, SEM erro
  // e SEM aviso. A primeira versão disto pedia as 7.703 de uma vez e recebia 1.000, anunciando
  // "1000 fichas pendentes em 5 UFs" como se fosse o total — as outras 6.703 simplesmente não
  // existiam para o script. É o mesmo corte silencioso que fez 281 votações sumirem da tela em
  // 19/09, e a lição estava escrita. Comparar o que se pediu com o que voltou é o único jeito
  // de flagrar: se veio exatamente o tamanho da página, provavelmente há mais.
  const PAGINA = 1000;
  const candidatos = [];
  for (let inicio = 0; ; inicio += PAGINA) {
    let consulta = supabase.from('candidatos_deputado_federal')
      .select('id, uf, sq_candidato, nome_urna').eq('ano_eleicao', ANO)
      .not('sq_candidato', 'is', null).order('uf').order('nome_urna')
      .range(inicio, inicio + PAGINA - 1);
    if (UF_ALVO) consulta = consulta.eq('uf', UF_ALVO);
    if (ABERTOS) consulta = consulta.in('situacao_tse', SITUACOES_ABERTAS);
    else if (!REFAZER) consulta = consulta.is('ficha_coletada_em', null);

    const { data: pagina, error } = await consulta;
    if (error) { console.error('❌ Supabase:', error.message); process.exitCode = 1; return; }
    candidatos.push(...(pagina || []));
    if (!pagina || pagina.length < PAGINA) break;          // página incompleta = acabou
    if (LIMITE && candidatos.length >= LIMITE) break;
  }
  if (LIMITE) candidatos.length = Math.min(candidatos.length, LIMITE);
  if (!candidatos?.length) {
    console.log(ABERTOS
      ? '✅ Nenhum candidato em situação aberta: todos estão em situação definitiva.'
      : '✅ Nada pendente: todas as fichas do recorte já foram coletadas.');
    return;
  }

  const porUf = {};
  for (const c of candidatos) (porUf[c.uf] = porUf[c.uf] || []).push(c);
  console.log(`📥 ${candidatos.length} fichas pendentes em ${Object.keys(porUf).length} UF(s)\n`);

  const inicio = Date.now();
  let ok = 0, semCorpo = 0;
  const falhou = [];

  for (const [uf, lista] of Object.entries(porUf)) {
    const nomes = await mapaDeNomes(uf);
    const nomeDe = (id) => (id ? (nomes[String(id)] || null) : null);
    console.log(`── ${uf}: ${lista.length} fichas`);

    for (const c of lista) {
      try {
        const r = await buscarTse(`${REST}/buscar/${ANO}/${uf}/${ID_ELEICAO}/candidato/${c.sq_candidato}`);
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const texto = await r.text();
        bytesLidos += texto.length;
        // Corpo vazio com 200 e o jeito do TSE dizer "combinação de parâmetros sem resultado".
        // Tratar como ficha vazia gravaria ausência de dado como se fosse dado.
        if (!texto) { semCorpo++; throw new Error('corpo vazio (abrangência ou id de eleição errados?)'); }

        const bruto = traduzir(JSON.parse(texto), nomeDe, c.sq_candidato, { ano: ANO, idEleicao: ID_ELEICAO, abrangencia: uf });
        // Deputado federal não tem vice, e a UF de nascimento já mora em naturalidade_uf nesta
        // tabela: manter as duas seria garantir que uma envelheça diferente da outra.
        const { vices, uf_nascimento, ...campos } = bruto;
        if (uf_nascimento) campos.naturalidade_uf = uf_nascimento;

        if (!SIMULAR) {
          const { error: e2 } = await supabase.from('candidatos_deputado_federal').update(campos).eq('id', c.id);
          if (e2) throw new Error(`gravação: ${e2.message}`);
        }
        ok++;
        if (ok % 25 === 0 || SIMULAR) {
          const s = (Date.now() - inicio) / 1000;
          console.log(`   ${String(ok).padStart(4)} fichas · ${(ok / s).toFixed(1)}/s · ${(bytesLidos / 1048576).toFixed(1)} MB lidos` +
            (SIMULAR ? ` · última: ${c.nome_urna} (${campos.situacao_tse || '?'}, ${campos.bens.length} bens, ${campos.documentos.length} docs)` : ''));
        }
      } catch (e) {
        falhou.push(`${c.uf}/${c.nome_urna}: ${e.message}`);
        if (falhou.length <= 10) console.warn(`   ⚠ ${c.nome_urna}: ${e.message}`);
      }
      await pausa();
    }
  }

  const seg = (Date.now() - inicio) / 1000;
  console.log(`\n📊 ${ok} fichas${SIMULAR ? ' lidas' : ' gravadas'}, ${falhou.length} falhas, ${seg.toFixed(0)}s, ${(bytesLidos / 1048576).toFixed(1)} MB`);
  if (ok) console.log(`   ritmo: ${(ok / seg).toFixed(1)} fichas/s · média de ${Math.round(bytesLidos / ok)} bytes por ficha`);
  if (semCorpo) console.log(`   ${semCorpo} vieram com corpo vazio (200 sem conteúdo), que NÃO é o mesmo que candidato sem dado`);

  if (ok === 0) {
    console.error('❌ Nenhuma ficha lida.');
    console.error('   Se as falhas forem HTTP 403, o Akamai do TSE recusou o IP de onde isto rodou;');
    console.error('   é para isso que existe a ponte (TSE_PONTE_URL). Não é erro de código.');
    if (process.env.GITHUB_ACTIONS) console.log('::error title=Ficha do TSE (federais)::Nenhuma ficha coletada.');
    process.exitCode = 1;
    return;
  }
  if (falhou.length && process.env.GITHUB_ACTIONS) {
    console.log(`::warning title=Ficha do TSE (federais)::${falhou.length} de ${candidatos.length} falharam: ${falhou.slice(0, 5).join(' | ').slice(0, 300)}`);
  }
}

main().catch((e) => { console.error('💥 Erro:', e.message); process.exitCode = 1; });
