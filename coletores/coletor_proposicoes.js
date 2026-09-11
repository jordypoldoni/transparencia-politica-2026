// Coletor DIARIO das proposicoes mais recentes de deputados federais e senadores.
//
// POR QUE EXISTE SEPARADO DO coletor_biografia.js (11/09/2026)
// As proposicoes de um parlamentar mudam toda semana; a biografia dele quase nunca. O
// coletor_biografia faz muitas chamadas por parlamentar (cadastro, profissao, orgaos, etc.)
// e NAO estava no agendamento diario - por isso as proposicoes dos federais ficavam congeladas
// na ultima vez que alguem rodou aquilo a mao. Este aqui faz so uma coisa, e pode rodar todo dia.
//
// O QUE GUARDA: as 20 MAIS RECENTES por data de apresentacao, substituindo a lista inteira a
// cada rodada. Nao e preciso inserir e remover item a item: pegar sempre o topo da fonte ja
// produz a janela deslizante que o Jordy pediu.
//
// POR QUE SO 20: os federais e senadores declaram 258.368 proposicoes somadas (media 431,
// maior 4.292). Guardar tudo daria ~112 MB, contra 213 MB livres no Supabase free. A lista
// COMPLETA o leitor ve pela rota /api/proposicoes, buscada na hora - ver pages/api/proposicoes.js.
//
// GANHO DE PRECISAO: o coletor_biografia ordenava por `id` (aproximacao de recencia). Aqui a
// ordenacao e por `dataApresentacao`, que e a data de verdade, e o campo VEM na propria
// listagem - junto com o `id`, que vira o link da ficha de tramitacao sem custo nenhum.
//
// USO:
//   node coletores/coletor_proposicoes.js            (federais + senadores)
//   node coletores/coletor_proposicoes.js --so=camara
//   node coletores/coletor_proposicoes.js --so=senado

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SUPABASE_KEY) { console.error('❌ Faltam credenciais Supabase (.env).'); process.exit(1); }
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const CAMARA = 'https://dadosabertos.camara.leg.br/api/v2';
const SENADO = 'https://legis.senado.leg.br/dadosabertos';
const MANDATO_INICIO = '2023-02-01';
const GUARDAR = 20;
const PAUSA_MS = 150;
const TENTATIVAS = 3;
const SO = (process.argv.find((a) => a.startsWith('--so=')) || '').slice(5).toLowerCase();

const dormir = (ms) => new Promise((r) => setTimeout(r, ms));
const limpo = (t) => String(t ?? '').replace(/\s+/g, ' ').trim() || null;
const fmt = (n) => n.toLocaleString('pt-BR');

async function getJson(url, tentativa = 0) {
  try {
    const r = await fetch(url, { headers: { Accept: 'application/json' } });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return await r.json();
  } catch (e) {
    if (tentativa < TENTATIVAS - 1) { await dormir(1000 * (tentativa + 1)); return getJson(url, tentativa + 1); }
    throw e;
  }
}

// ---------- Camara ----------
// GOTCHA (11/09/2026): a API da Camara NAO aceita `ordenarPor=dataApresentacao` - devolve
// HTTP 400, mesmo sem filtro de autor. Os valores validos sao outros (id, numero, ano...).
// Mas `dataApresentacao` VEM no corpo da resposta, entao a solucao e pedir ordenado por `id`
// (que cresce com o tempo) e ordenar por data aqui, localmente. Buscar 100 e escolher as 20
// mais novas cobre com folga qualquer descompasso entre ordem de id e ordem de data.
const ITENS_BUSCA = 100;
// Tipos que criam ou alteram norma. O filtro idDeputadoAutor mistura tudo: projeto de lei,
// requerimento, parecer de relator, emenda, redacao final. Contar so o total faz a tela dizer
// "13.782 proposicoes" embaixo de "O que ele propos" - correto e enganoso ao mesmo tempo.
const TIPOS_PROJETO = ['PL', 'PLP', 'PEC', 'PDL', 'PDC', 'PLV', 'PRC', 'PLN'];

// Total exato de uma consulta sem baixar tudo: a resposta traz o link da ultima pagina,
// e so essa pagina precisa ser lida para saber quantos itens ela tem.
async function contarCamara(base) {
  const j = await getJson(`${base}&pagina=1`);
  const primeira = (j?.dados || []).length;
  const ultima = (j?.links || []).find((l) => l.rel === 'last')?.href;
  const m = ultima && /pagina=(\d+)/.exec(ultima);
  if (!m || parseInt(m[1], 10) <= 1) return { total: primeira, primeiraPagina: j };
  const n = parseInt(m[1], 10);
  const jf = await getJson(`${base}&pagina=${n}`);
  return { total: (n - 1) * ITENS_BUSCA + (jf?.dados || []).length, primeiraPagina: j };
}

async function proposicoesCamara(idDeputado) {
  const base = `${CAMARA}/proposicoes?idDeputadoAutor=${idDeputado}&dataApresentacaoInicio=${MANDATO_INICIO}&ordem=DESC&ordenarPor=id&itens=${ITENS_BUSCA}`;
  const j = await getJson(`${base}&pagina=1`);
  const lote = j?.dados || [];

  const mapear = (p) => ({
    tipo: limpo(p.siglaTipo),
    numero: p.numero ? String(p.numero) : null,
    ano: p.ano ? String(p.ano) : null,
    ementa: limpo(p.ementa),
    data: p.dataApresentacao ? String(p.dataApresentacao).slice(0, 10) : null,
    // O id ja vem nesta resposta: o link da ficha de tramitacao sai de graca. Era exatamente
    // isso que o coletor_biografia descartava ao guardar so quatro campos.
    link: p.id ? `https://www.camara.leg.br/proposicoesWeb/fichadetramitacao?idProposicao=${p.id}` : null,
  });

  const lista = lote.map(mapear)
    .filter((p) => p.ementa || p.tipo)
    .sort((a, b) => (b.data || '').localeCompare(a.data || ''))
    .slice(0, GUARDAR);

  // Total exato: a resposta nao traz contagem, mas traz o link da ultima pagina. Uma
  // requisicao a mais por parlamentar troca um numero aproximado por um numero certo - e o
  // site mostra esse total na tela ("431 no total"), entao vale a chamada.
  let total = lote.length;
  const ultima = (j?.links || []).find((l) => l.rel === 'last')?.href;
  const m = ultima && /pagina=(\d+)/.exec(ultima);
  if (m && parseInt(m[1], 10) > 1) {
    const nUltima = parseInt(m[1], 10);
    const jf = await getJson(`${base}&pagina=${nUltima}`);
    total = (nUltima - 1) * ITENS_BUSCA + (jf?.dados || []).length;
  }

  // Segunda contagem, so dos tipos que viram norma. A API filtra por siglaTipo com lista
  // separada por virgula (conferido em 11/09/2026), entao sao 1 ou 2 requisicoes a mais.
  let projetos = null;
  try {
    const baseProjetos = `${base}&siglaTipo=${TIPOS_PROJETO.join(',')}`;
    projetos = (await contarCamara(baseProjetos)).total;
  } catch (e) {
    // Contagem parcial e melhor que rodada abortada: n_projetos fica null e a tela omite.
    console.warn(`     (sem contagem de projetos: ${e.message})`);
  }

  return { lista, total, projetos };
}

// ---------- Senado ----------
const comoArray = (x) => (x == null ? [] : Array.isArray(x) ? x : [x]);

async function proposicoesSenado(codigo) {
  const j = await getJson(`${SENADO}/senador/${codigo}/autorias.json`);
  const raiz = j?.MateriasAutoriaParlamentar?.Parlamentar?.Autorias?.Autoria
    ?? j?.AutoriasParlamentar?.Parlamentar?.Autorias?.Autoria
    ?? j?.AutoriasParlamentar?.Autorias?.Autoria;
  const todas = comoArray(raiz).map((a) => {
    const m = a?.Materia || {};
    return {
      tipo: limpo(m.Sigla),
      numero: m.Numero ? String(m.Numero) : null,
      ano: m.Ano ? String(m.Ano) : null,
      ementa: limpo(m.Ementa),
      // Campos conferidos na resposta real em 11/09/2026: Materia { Codigo, Sigla, Numero,
      // Ano, Ementa, Data }. Eu tinha chutado "CodigoMateria" e o link saiu nulo em todos os
      // 89 senadores - conferir o nome do campo custa menos que refazer a coleta.
      data: m.Data ? String(m.Data).slice(0, 10) : null,
      link: m.Codigo ? `https://www25.senado.leg.br/web/atividade/materias/-/materia/${m.Codigo}` : null,
    };
  }).filter((p) => p.ementa || p.tipo);

  // Ordena pela data real; cai para ano + numero quando a materia vier sem data.
  todas.sort((a, b) => {
    if (a.data && b.data) return b.data.localeCompare(a.data);
    return (b.ano || '').localeCompare(a.ano || '') || (parseInt(b.numero || 0, 10) - parseInt(a.numero || 0, 10));
  });
  // No Senado a lista inteira ja veio numa resposta so, entao a contagem por tipo sai de graca.
  const projetos = todas.filter((p) => TIPOS_PROJETO.includes(String(p.tipo || '').toUpperCase())).length;
  return { lista: todas.slice(0, GUARDAR), total: todas.length, projetos };
}

async function main() {
  console.log('🚀 Proposições mais recentes (federais e senadores)');

  const { data: parlamentares, error } = await supabase
    .from('agentes_politicos')
    .select('id, nome_urna, id_externo_api, fonte_api')
    .or('fonte_api.ilike.%camara%,fonte_api.ilike.%senado%')
    .order('nome_urna');
  if (error) { console.error(error.message); process.exit(1); }

  const fila = parlamentares.filter((p) => {
    const f = (p.fonte_api || '').toLowerCase();
    if (SO === 'camara') return f.includes('camara');
    if (SO === 'senado') return f.includes('senado');
    return true;
  });
  console.log(`📥 ${fila.length} parlamentar(es).\n`);

  let ok = 0, falhou = 0, semId = 0;
  for (const p of fila) {
    const f = (p.fonte_api || '').toLowerCase();
    const idExterno = String(p.id_externo_api || '').split('-').pop();
    if (!idExterno) { semId++; continue; }
    try {
      const { lista, total, projetos } = f.includes('camara')
        ? await proposicoesCamara(idExterno)
        : await proposicoesSenado(idExterno);

      const { error: upErr } = await supabase.from('agentes_politicos')
        .update({ proposicoes: lista, n_proposicoes: total, n_projetos: projetos ?? null, data_atualizacao: new Date().toISOString() })
        .eq('id', p.id);
      if (upErr) throw new Error(upErr.message);
      ok++;
      if (ok % 50 === 0) process.stdout.write(`\r   ${ok} atualizados…   `);
    } catch (e) {
      console.warn(`\n  ⚠️  ${p.nome_urna}: ${e.message}`);
      falhou++;
    }
    await dormir(PAUSA_MS);
  }

  // Trava de seguranca no mesmo espirito dos outros coletores: se ninguem foi atualizado, a
  // fonte mudou ou caiu - gritar em vez de deixar o banco com listas zeradas.
  if (ok === 0) {
    console.error('\n💥 ABORTADO: nenhum parlamentar atualizado. Conferir a fonte antes de rodar de novo.');
    process.exit(1);
  }

  console.log(`\n\n✅ ${fmt(ok)} atualizado(s)${falhou ? ` · ⚠️ ${falhou} com erro` : ''}${semId ? ` · ${semId} sem id externo` : ''}`);
}

main().catch((e) => { console.error('💥 Erro:', e.message); process.exit(1); });
