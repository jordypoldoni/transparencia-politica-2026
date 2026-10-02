// POST /api/afinidade/candidatos  { uf: 'RS', respostas: { pergunta_id: 'a_favor'|'contra'|'sem_opiniao' } }
//
// MÓDULO 2 DA AFINIDADE: CANDIDATOS 2026. (Refeito em 27/09/2026, pedido do Jordy: "uma coisa
// para cada coisa".)
//
// A maioria dos candidatos nunca votou nenhuma dessas propostas, então aqui a comparação é com o
// PARTIDO: a maioria dos parlamentares que hoje estão nele (src/lib/afinidade/partidos.js), com
// a coesão, que diz o quanto essa maioria vale como estimativa. O resultado vem AGRUPADO POR
// PARTIDO: a estimativa é do partido, e os candidatos ficam dentro dele.
//
// Quem é candidato e HOJE tem mandato pelo estado ganha um selo que leva ao módulo 1
// (/api/afinidade/parlamentares), onde está o voto real dele. O voto real não é repetido aqui.
//
// SEM IA. As respostas chegam, são usadas no cálculo e não são guardadas: esta rota não grava nada.
import supabase from '../../../src/supabase_cliente.js';
import { buscarTudo } from '../../../src/lib/paginar.js';
import { todosCandidatosEstaduais } from '../../../src/lib/candidatosEstaduais.js';
import { lerPedido } from '../../../src/lib/afinidade/pedido.js';
import { carregarVotosReais } from '../../../src/lib/afinidade/fonteVotos.js';
import { posicoesPorPartido, compararPartido, normalizarSigla } from '../../../src/lib/afinidade/partidos.js';
import { CASAS_AFINIDADE, ASSEMBLEIAS_COM_VOTO } from '../../../src/lib/afinidade/casas.js';
import { mandatoEstadual } from '../../../src/lib/mandatoEstadual.js';

// Mesma fonte de votos do módulo 1, mais o que é só daqui (partidos e mandatos por id).
let extra = null;
async function carregarBase() {
  const { posicoes, agentes, em } = await carregarVotosReais();
  if (extra && extra.em === em) return extra;
  const casaAssembleia = CASAS_AFINIDADE.find((c) => c.id === 'assembleia');
  const estaduais = {};
  for (const a of agentes) if (casaAssembleia.ehDaCasa(a)) (estaduais[String(a.uf_sede || '').toUpperCase()] ||= []).push(a);
  extra = { em, porPartido: posicoesPorPartido(posicoes, agentes), estaduais, agentePorId: new Map(agentes.map((a) => [a.id, a])) };
  return extra;
}

// Ligação candidato estadual → mandato: src/lib/mandatoEstadual.js (a cédula usa a mesma).

// SELO: só quando a pessoa está na lista do módulo 1 deste estado (mesmos critérios da rota
// /api/afinidade/parlamentares), senão o selo levaria a uma busca vazia.
function selo(agente, uf) {
  if (!agente || agente.em_exercicio === false || String(agente.uf_sede || '').toUpperCase() !== uf) return null;
  const casa = CASAS_AFINIDADE.find((c) => c.ehDaCasa(agente));
  if (!casa || (casa.id === 'assembleia' && !ASSEMBLEIAS_COM_VOTO[uf])) return null;
  return { casa: casa.id, nome: agente.nome_urna };
}

const CARGOS = [
  { chave: 'senador', tabela: 'candidatos_senador', href: '/candidato-senador' },
  { chave: 'governador', tabela: 'candidatos_governador', href: '/candidato-governador' },
  { chave: 'deputado-federal', tabela: 'candidatos_deputado_federal', href: '/deputado-federal' },
];

const candidato = (l, href, mandato) => ({
  href, nome_urna: l.nome_urna, nr_candidato: l.nr_candidato || null, foto_url: l.foto_url || null, ...(mandato ? { mandato } : {}),
});

// Agrupa por partido. Dentro do partido: quem tem mandato primeiro (tem voto real para conferir),
// depois em ordem alfabética.
function agrupar(itens) {
  const g = new Map();
  for (const { sigla, c } of itens) {
    const k = normalizarSigla(sigla) || 'SEM PARTIDO';
    if (!g.has(k)) g.set(k, { sigla: k, candidatos: [] });
    g.get(k).candidatos.push(c);
  }
  for (const x of g.values()) x.candidatos.sort((a, b) => (!!b.mandato - !!a.mandato) || a.nome_urna.localeCompare(b.nome_urna, 'pt-BR'));
  return [...g.values()];
}

// Monta as listas de candidatos de um estado, agrupadas por partido (cacheadas por listasPorUf).
const listasPorUf = new Map();
async function montarListas(uf, estaduais, agentePorId) {
  const cargos = {};
  // Os três cargos do banco e a lista do TSE ao mesmo tempo (antes era um depois do outro).
  const doBanco = Promise.all(CARGOS.map(async (c) => {
    const linhas = await buscarTudo(() => supabase.from(c.tabela)
      .select('slug, nome_urna, partido_sigla, nr_candidato, foto_url, agente_id')
      .eq('ano_eleicao', 2026).eq('uf', uf).eq('oculta', false), `afinidade.${c.tabela}`);
    cargos[c.chave] = agrupar(linhas.map((l) => ({
      sigla: l.partido_sigla,
      c: candidato(l, `${c.href}/${l.slug}`, selo(l.agente_id ? agentePorId.get(l.agente_id) : null, uf)),
    })));
  }));

  // Deputado estadual: lido do TSE na hora (DF elege distrital, fica vazio). Se o TSE falhar,
  // o cargo volta marcado como indisponível, e não como "nenhum candidato".
  let estadualIndisponivel = false;
  const doTse = todosCandidatosEstaduais(uf).then((lista) => {
    cargos['deputado-estadual'] = agrupar(lista.map((l) => ({
      sigla: l.partido_sigla,
      c: candidato(l, `/candidato-estadual/${l.slug}`, selo(mandatoEstadual(estaduais[uf], l), uf)),
    })));
  }).catch((e) => {
    console.error('afinidade.candidatos.estaduais:', e.message);
    cargos['deputado-estadual'] = [];
    estadualIndisponivel = true;
  });
  await Promise.all([doBanco, doTse]);
  // Ordem fixa das chaves, como antes (a tela lê por nome, mas o JSON fica previsível).
  const ordenados = Object.fromEntries(['senador', 'governador', 'deputado-federal', 'deputado-estadual'].map((k) => [k, cargos[k] || []]));
  return { cargos: ordenados, estadualIndisponivel };
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ erro: 'use POST' });
  const pedido = lerPedido(req.body);
  if (pedido.erro) return res.status(400).json({ erro: pedido.erro });
  const { uf, respostas } = pedido;

  try {
    const { porPartido, estaduais, agentePorId, em } = await carregarBase();
    // As listas de candidatos do estado não dependem das respostas: ficam 30 minutos na memória da
    // função (27/09/2026). Antes, cada cálculo refazia 3 consultas ao banco e a leitura do TSE, e a
    // resposta levava quase 2 segundos. Só a estimativa dos partidos é refeita a cada pedido.
    let pronto = listasPorUf.get(uf);
    if (!pronto || pronto.em !== em || Date.now() - pronto.criado > 30 * 60 * 1000) {
      pronto = { em, criado: Date.now(), ...(await montarListas(uf, estaduais, agentePorId)) };
      if (!pronto.estadualIndisponivel) listasPorUf.set(uf, pronto);
    }
    const { cargos, estadualIndisponivel } = pronto;

    // A estimativa de cada partido na disputa do estado, calculada uma vez para todos os cargos.
    const partidos = {};
    for (const grupos of Object.values(cargos)) for (const { sigla } of grupos) {
      if (!partidos[sigla]) partidos[sigla] = { sigla, ...compararPartido(porPartido[sigla], respostas) };
    }

    return res.status(200).json({ uf, cargos, partidos, estadualIndisponivel });
  } catch (e) {
    console.error('afinidade.candidatos:', e.message);
    return res.status(500).json({ erro: 'Não foi possível calcular agora. Tente de novo em instantes.' });
  }
}
