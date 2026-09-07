// Coletor — Deputados Estaduais do RIO GRANDE DO SUL (ALERGS): cadastro + VOTOS EM PLENARIO.
//
// Por que este coletor existe: a ALESP (SP) nao publica votacao nominal, entao ate agora o site
// so tinha voto de parlamentar federal. O portal de transparencia da ALERGS publica o voto de
// cada deputado, materia por materia, de 2011 em diante. Este e o primeiro voto ESTADUAL do site.
//
// Fontes (as duas usam o MESMO id de deputado, o que dispensa casar por nome):
//   1) Lista .... https://ww4.al.rs.gov.br:5000/listarDestaqueDeputados   (JSON, porta 5000)
//                 {"lista":[{idDeputado, nomeDeputado, siglaPartido, nomePartido,
//                            emailDeputado, telefoneDeputado, fotoGrandeDeputado, codStatus}]}
//                 ATENCAO: a pagina /deputados NAO serve pra raspar — os cartoes sao montados
//                 por JavaScript no navegador, o HTML cru vem sem nenhum deputado. Este endpoint
//                 e o que a propria pagina consome (visto em alergs_deputados/js/deputados.js).
//                 O nome "Destaque" engana: ele devolve os 55 deputados em exercicio.
//   2) Votos .... https://transparencia.al.rs.gov.br/parlamentares/votos-plenario/pesquisa
//                 ?solicitante={id}&ano={ano}
//                 A resposta e uma pagina HTML (Drupal), MAS cada linha do resultado carrega o
//                 registro ja estruturado no atributo data-item, em JSON:
//                 {"nomeDeputado","dataVotacao","tipoProjeto","numProposicao","anoProposicao",
//                  "materia","voto","resultadoVotacao"}
//                 Por isso nao raspamos tabela: lemos o data-item e damos JSON.parse.
//
// Uso:
//   node coletores/coletor_votos_alergs.js                 -> legislatura atual (2023..2026)
//   node coletores/coletor_votos_alergs.js 2026            -> so um ano
//   node coletores/coletor_votos_alergs.js 2023 2024 2025  -> anos avulsos
//   node coletores/coletor_votos_alergs.js --so-cadastro   -> so sincroniza os deputados
//
// Idempotente: upsert por id_externo_api (deputado), por votacao_id_externa (votacao) e por
// (votacao_id_externa, agente_id) (voto). Rodar duas vezes nao duplica nada.
//
// Precisa de SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no .env.

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const URL_LISTA = 'https://ww4.al.rs.gov.br:5000/listarDestaqueDeputados';
const URL_VOTOS = 'https://transparencia.al.rs.gov.br/parlamentares/votos-plenario/pesquisa';
const UF = 'RS';
const FONTE = 'alergs';
const DELAY_MS = 300; // gentileza com o portal: ~3 req/s

const args = process.argv.slice(2);
const SO_CADASTRO = args.includes('--so-cadastro');
const anosArg = args.filter((a) => /^\d{4}$/.test(a)).map(Number);
const ANOS = anosArg.length ? anosArg : [2023, 2024, 2025, 2026]; // legislatura atual

const dorme = (ms) => new Promise((r) => setTimeout(r, ms));

const slugify = (s) => String(s || '').normalize('NFD').replace(/\p{Diacritic}/gu, '')
  .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

// O data-item vem BRUTALMENTE escapado: alem de &quot;, o portal codifica ate chave, dois-pontos,
// espaco e barra como entidade hexadecimal (&#x7B; &#x3A; &#x20; &#x2F; &#x5C;). Decodificar so
// as nomeadas nao resolve — o JSON continua ilegivel. Por isso um decodificador generico.
// Passe unico de proposito: assim &amp;quot; vira o texto "&quot;" e nao aspas de verdade.
const ENTIDADES_NOMEADAS = { quot: '"', apos: "'", lt: '<', gt: '>', amp: '&', nbsp: ' ' };

function decodificarEntidades(s) {
  return String(s).replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (todo, corpo) => {
    if (corpo[0] === '#') {
      const cp = corpo[1].toLowerCase() === 'x'
        ? parseInt(corpo.slice(2), 16)
        : parseInt(corpo.slice(1), 10);
      return Number.isFinite(cp) ? String.fromCodePoint(cp) : todo;
    }
    const achou = ENTIDADES_NOMEADAS[corpo.toLowerCase()];
    return achou !== undefined ? achou : todo;
  });
}

// "25/08/2026 00:00" -> "2026-08-25T00:00:00-03:00"
function paraISO(dataBR) {
  const m = String(dataBR || '').match(/(\d{2})\/(\d{2})\/(\d{4})(?:\s+(\d{2}):(\d{2}))?/);
  if (!m) return null;
  const [, d, mes, a, h = '00', min = '00'] = m;
  return `${a}-${mes}-${d}T${h}:${min}:00-03:00`;
}

// O portal da ALERGS devolve a pagina VAZIA (sem as linhas de voto) para clientes que nao
// parecem navegador: com User-Agent proprio o GET responde 200, mas sem nenhum resultado.
// Por isso mandamos cabecalhos de navegador de verdade. Nao e burla de bloqueio: o conteudo
// e publico e a requisicao e a mesma que a pagina faz.
const CABECALHOS_NAVEGADOR = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
  'Accept-Language': 'pt-BR,pt;q=0.9,en;q=0.8',
  'Accept-Encoding': 'gzip, deflate, br',
};

async function baixar(url, tentativas = 4, aceita = 'text/html', referer = null) {
  for (let i = 1; i <= tentativas; i++) {
    try {
      const res = await fetch(url, {
        headers: {
          ...CABECALHOS_NAVEGADOR,
          Accept: aceita === 'application/json'
            ? 'application/json, text/plain, */*'
            : 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          ...(referer ? { Referer: referer } : {}),
        },
      });
      if (res.status === 429 || res.status >= 500) throw new Error(`HTTP ${res.status}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.text();
    } catch (e) {
      if (i === tentativas) throw new Error(`Falhou ${url}: ${e.message}`);
      await dorme(600 * i * i); // backoff
    }
  }
}

// ---------------------------------------------------------------- 1) cadastro

async function lerLista() {
  const bruto = await baixar(URL_LISTA, 4, 'application/json');
  let json;
  try {
    json = JSON.parse(bruto);
  } catch {
    throw new Error('A lista de deputados nao voltou em JSON (o endpoint da porta 5000 mudou ou esta fora do ar).');
  }
  const lista = Array.isArray(json) ? json : (json.lista || []);
  const vistos = new Set();
  const deputados = [];
  for (const d of lista) {
    const id = String(d.idDeputado || '').trim();
    if (!id || vistos.has(id)) continue;
    vistos.add(id);
    deputados.push({
      id,
      nome: String(d.nomeDeputado || '').trim(),
      partido: String(d.siglaPartido || '').trim() || 'S/P',
      // a propria pagina troca _G por _S pro tamanho de avatar; fazemos o mesmo (imagem leve)
      foto: d.fotoGrandeDeputado ? String(d.fotoGrandeDeputado).replace(/_G\.(jpg|png)$/i, '_S.$1') : null,
      email: String(d.emailDeputado || '').trim() || null,
    });
  }
  return deputados.filter((d) => d.nome);
}

async function sincronizarDeputados(deputados) {
  const { data: existentes, error } = await supabase
    .from('agentes_politicos').select('id, id_externo_api').eq('fonte_api', FONTE);
  if (error) throw error;
  const idPorExterno = new Map((existentes || []).map((e) => [String(e.id_externo_api), e.id]));

  const usados = new Set((existentes || []).map(() => null).filter(Boolean));
  const novos = [];
  for (const d of deputados) {
    const externo = `ALERGS-${d.id}`;
    let slug = slugify(d.nome);
    if (usados.has(slug)) slug = `${slug}-rs`;
    usados.add(slug);

    const linha = {
      nome_urna: d.nome,
      nome_completo: d.nome,
      partido_atual: d.partido,
      cargo_atual: 'Deputado Estadual',
      uf_sede: UF,
      fonte_api: FONTE,
      casa_legislativa: 'estadual',
      id_externo_api: externo,
      foto_url: d.foto,
      email_oficial: d.email,
      slug,
    };

    const existeId = idPorExterno.get(externo);
    if (existeId) {
      const { error: errUp } = await supabase.from('agentes_politicos').update({
        nome_urna: linha.nome_urna,
        partido_atual: linha.partido_atual,
        cargo_atual: linha.cargo_atual,
        uf_sede: linha.uf_sede,
        casa_legislativa: linha.casa_legislativa,
        foto_url: linha.foto_url,
        email_oficial: linha.email_oficial,
        slug: linha.slug,
      }).eq('id', existeId);
      if (errUp) throw errUp;
    } else {
      novos.push(linha);
    }
  }

  if (novos.length) {
    const { data: ins, error: errIns } = await supabase
      .from('agentes_politicos').insert(novos).select('id, id_externo_api');
    if (errIns) throw errIns;
    for (const a of ins || []) idPorExterno.set(String(a.id_externo_api), a.id);
  }
  console.log(`Deputados RS sincronizados: ${deputados.length} (${novos.length} novos).`);
  return idPorExterno;
}

// ------------------------------------------------------------------ 2) votos

// ATENCAO: no HTML servido, o atributo vem com ASPAS SIMPLES (data-item='...'), diferente do que
// o navegador mostra no inspetor (ele reserializa com aspas duplas). O regex aceita os dois.
function extrairVotos(html) {
  const itens = [];
  const re = /data-item=(["'])([\s\S]*?)\1/g;
  let m;
  while ((m = re.exec(html)) !== null) {
    try {
      itens.push(JSON.parse(decodificarEntidades(m[2])));
    } catch {
      // linha malformada: ignora em vez de derrubar a coleta inteira
    }
  }
  return itens;
}

// Id estavel e COMPARTILHADO entre os 55 deputados da mesma votacao: e isso que permite
// juntar os votos individuais numa votacao so (placar, "quem votou").
function idVotacao(item) {
  const iso = paraISO(item.dataVotacao) || '';
  const dia = iso.slice(0, 10) || 'sem-data';
  const tipo = String(item.tipoProjeto || '').trim().replace(/\s+/g, '') || 'XX';
  return `ALERGS-${dia}-${tipo}${item.numProposicao || 0}-${item.anoProposicao || 0}`;
}

async function coletarAno(ano, deputados, idPorExterno) {
  const votacoes = new Map(); // votacao_id_externa -> linha de `votacoes`
  const votos = new Map();    // `${votacao}|${agente}` -> linha de `votos_parlamentares`
  let semDeputado = 0;

  for (const d of deputados) {
    const agenteId = idPorExterno.get(`ALERGS-${d.id}`);
    if (!agenteId) { semDeputado++; continue; }

    const html = await baixar(
      `${URL_VOTOS}?solicitante=${d.id}&ano=${ano}`,
      4,
      'text/html',
      'https://transparencia.al.rs.gov.br/parlamentares/votos-plenario',
    );
    const itens = extrairVotos(html);

    // Diagnostico: se o PRIMEIRO deputado do ano vier vazio, o problema quase sempre e a
    // resposta (bloqueio/estrutura), nao a ausencia de votos. Mostra o suficiente pra decidir.
    if (!itens.length && d === deputados[0]) {
      console.log(`  [diagnostico] resposta com ${html.length} chars · tem "linha-voto": ${html.includes('linha-voto')} · tem "data-item": ${html.includes('data-item')} · pede filtro: ${html.includes('preencha os campos')}`);
    }
    for (const it of itens) {
      const vid = idVotacao(it);
      const dataISO = paraISO(it.dataVotacao);
      const resultado = (it.resultadoVotacao || '').trim() || null;
      const aprovacao = resultado ? (/aprovad/i.test(resultado) ? 1 : 0) : null;
      const proposicao = `${String(it.tipoProjeto || '').trim()} ${it.numProposicao || ''}/${it.anoProposicao || ''}`.trim();

      if (!votacoes.has(vid)) {
        votacoes.set(vid, {
          votacao_id_externa: vid,
          descricao: it.materia || null,
          ementa: it.materia || null,
          proposicao_id: proposicao,
          proposicao_titulo: proposicao,
          descricao_tipo: String(it.tipoProjeto || '').trim() || null,
          data_voto: dataISO,
          resultado,
          aprovacao,
        });
      }

      votos.set(`${vid}|${agenteId}`, {
        agente_id: agenteId,
        votacao_id_externa: vid,
        voto_tipo: (it.voto || '').trim() || null,
        data_voto: dataISO,
        descricao_votacao: it.materia || null,
        ementa_resumida_voto: proposicao,
        aprovacao,
      });
    }
    console.log(`  ${ano} · ${d.nome}: ${itens.length} votos`);
    await dorme(DELAY_MS);
  }

  const metas = [...votacoes.values()];
  for (let i = 0; i < metas.length; i += 200) {
    const { error } = await supabase.from('votacoes')
      .upsert(metas.slice(i, i + 200), { onConflict: 'votacao_id_externa' });
    if (error) throw error;
  }

  const linhas = [...votos.values()];
  for (let i = 0; i < linhas.length; i += 500) {
    const { error } = await supabase.from('votos_parlamentares')
      .upsert(linhas.slice(i, i + 500), { onConflict: 'votacao_id_externa,agente_id' });
    if (error) throw error;
  }

  console.log(`${ano}: ${metas.length} votacoes e ${linhas.length} votos gravados` +
    (semDeputado ? ` (${semDeputado} deputados sem cadastro)` : '') + '.');
  return { votacoes: metas.length, votos: linhas.length };
}

// -------------------------------------------------------------------- main

async function main() {
  console.log('ALERGS (RS) - cadastro de deputados estaduais e votos em plenario');

  const deputados = await lerLista();
  if (!deputados.length) throw new Error('Nenhum deputado veio do endpoint de lista da ALERGS (porta 5000).');
  console.log(`${deputados.length} deputados na lista da ALERGS.`);

  const idPorExterno = await sincronizarDeputados(deputados);
  if (SO_CADASTRO) { console.log('--so-cadastro: parando aqui.'); return; }

  let totalV = 0, totalP = 0;
  for (const ano of ANOS) {
    const r = await coletarAno(ano, deputados, idPorExterno);
    totalV += r.votacoes; totalP += r.votos;
  }
  console.log(`Concluido: ${deputados.length} deputados, ${totalV} votacoes e ${totalP} votos (RS, anos ${ANOS.join('/')}).`);
}

main().catch((e) => { console.error('ERRO:', e.message); process.exit(1); });
