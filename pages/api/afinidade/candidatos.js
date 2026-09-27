// POST /api/afinidade/candidatos  { uf: 'RS', respostas: { pergunta_id: 'a_favor'|'contra'|'sem_opiniao' } }
//
// MÓDULO 2 DA AFINIDADE: CANDIDATOS 2026. (Movida em 27/09/2026 de /api/afinidade, sem mudar a
// lógica. Será refeita no passo do módulo 2: estimativa pelo partido, agrupada por partido, com
// ponte para o módulo 1 quando o candidato tem mandato.)
//
// Compara as respostas com o VOTO REGISTRADO dos candidatos de 2026 e com a maioria dos atuais
// parlamentares de cada partido. SEM IA. (26/09/2026)
// As respostas chegam, são usadas no cálculo e não são guardadas: esta rota não grava nada.
//
// Devolve TODOS os candidatos do estado, separados por cargo (a tela mostra um cargo por vez e
// deixa buscar por nome, partido ou número, inclusive quem nunca votou essas propostas, para a
// pessoa tirar a dúvida sobre um nome específico). Quem votou vem com a comparação.
import supabase from '../../../src/supabase_cliente.js';
import { buscarTudo } from '../../../src/lib/paginar.js';
import { todosCandidatosEstaduais } from '../../../src/lib/candidatosEstaduais.js';
import { lerPedido } from '../../../src/lib/afinidade/pedido.js';
import { carregarVotosReais } from '../../../src/lib/afinidade/fonteVotos.js';
import { compararPessoa, ordenarPorConcordancia } from '../../../src/lib/afinidade/nucleo.js';
import { posicoesPorPartido, compararPartido, normalizarSigla } from '../../../src/lib/afinidade/partidos.js';

const nome = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().replace(/\s+/g, ' ').trim();

// Mesma fonte de votos do módulo 1 (src/lib/afinidade/fonteVotos.js), mais o que é só daqui.
let extra = null;
async function carregarBase() {
  const { posicoes, agentes, em } = await carregarVotosReais();
  if (extra && extra.em === em) return extra;
  // Deputados estaduais do cadastro, por estado, para ligar ao candidato a deputado estadual
  // (que vem do TSE sem ligação nenhuma com o mandato).
  const estaduais = {};
  for (const a of agentes) {
    const f = String(a.fonte_api || '').toLowerCase();
    if (!(f.includes('alergs') || f.includes('alesp') || /estadual/i.test(a.cargo_atual || ''))) continue;
    (estaduais[String(a.uf_sede || '').toUpperCase()] ||= []).push(a);
  }
  extra = { em, posicoes, porPartido: posicoesPorPartido(posicoes, agentes), estaduais };
  return extra;
}

// LIGAÇÃO candidato estadual → mandato na assembleia. Nome de urna igual, no mesmo estado; ou o
// nome do cadastro COMEÇANDO pelo da urna e o MESMO partido ("ADÃO PRETTO" na urna, "Adão Pretto
// Filho" no cadastro, os dois do PT). Sem o partido batendo, o começo do nome sozinho não liga:
// "João Silva" e "João Silva Santos" podem ser duas pessoas.
function mandatoEstadual(lista, c) {
  const n = nome(c.nome_urna);
  if (!n || !lista) return null;
  const exato = lista.filter((a) => nome(a.nome_urna) === n);
  if (exato.length === 1) return exato[0];
  const prefixo = lista.filter((a) => nome(a.nome_urna).startsWith(`${n} `) && normalizarSigla(a.partido_atual) === normalizarSigla(c.partido_sigla));
  return prefixo.length === 1 ? prefixo[0] : null;
}

const CARGOS = [
  { chave: 'deputado-federal', tabela: 'candidatos_deputado_federal', href: '/deputado-federal' },
  { chave: 'senador', tabela: 'candidatos_senador', href: '/candidato-senador' },
  { chave: 'governador', tabela: 'candidatos_governador', href: '/candidato-governador' },
];

function montar(l, href, posicoesAgente, respostas) {
  const comp = posicoesAgente ? compararPessoa(posicoesAgente, respostas) : null;
  const votou = comp && comp.comparaveis > 0;
  return {
    href, nome_urna: l.nome_urna, partido_sigla: l.partido_sigla, nr_candidato: l.nr_candidato, foto_url: l.foto_url || null,
    iguais: votou ? comp.iguais : 0, comparaveis: votou ? comp.comparaveis : 0, ...(votou ? { detalhes: comp.detalhes } : {}),
  };
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ erro: 'use POST' });
  const pedido = lerPedido(req.body);
  if (pedido.erro) return res.status(400).json({ erro: pedido.erro });
  const { uf, respostas } = pedido;

  try {
    const { posicoes, porPartido, estaduais } = await carregarBase();
    const cargos = {};
    const siglasNaDisputa = new Set();

    for (const c of CARGOS) {
      const linhas = await buscarTudo(() => supabase.from(c.tabela)
        .select('slug, nome_urna, partido_sigla, nr_candidato, foto_url, agente_id')
        .eq('ano_eleicao', 2026).eq('uf', uf), `afinidade.${c.tabela}`);
      cargos[c.chave] = linhas.map((l) => {
        if (l.partido_sigla) siglasNaDisputa.add(normalizarSigla(l.partido_sigla));
        return montar(l, `${c.href}/${l.slug}`, l.agente_id ? posicoes[l.agente_id] : null, respostas);
      }).sort((a, b) => (b.comparaveis > 0) - (a.comparaveis > 0) || ordenarPorConcordancia(a, b) || a.nome_urna.localeCompare(b.nome_urna, 'pt-BR'));
    }

    // Deputado estadual: lido do TSE na hora (DF elege distrital, fica vazio). Se o TSE falhar,
    // o cargo volta marcado como indisponível, e não como "nenhum candidato".
    let estadualIndisponivel = false;
    try {
      const lista = await todosCandidatosEstaduais(uf);
      cargos['deputado-estadual'] = lista.map((l) => {
        if (l.partido_sigla) siglasNaDisputa.add(normalizarSigla(l.partido_sigla));
        const m = mandatoEstadual(estaduais[uf], l);
        return montar(l, `/candidato-estadual/${l.slug}`, m ? posicoes[m.id] : null, respostas);
      }).sort((a, b) => (b.comparaveis > 0) - (a.comparaveis > 0) || ordenarPorConcordancia(a, b) || a.nome_urna.localeCompare(b.nome_urna, 'pt-BR'));
    } catch (e) {
      console.error('afinidade.estaduais:', e.message);
      cargos['deputado-estadual'] = [];
      estadualIndisponivel = true;
    }

    const partidos = [];
    const semParlamentares = [];
    for (const sigla of siglasNaDisputa) {
      const comp = compararPartido(porPartido[sigla], respostas);
      if (comp.comparaveis === 0) semParlamentares.push(sigla);
      else partidos.push({ sigla, ...comp });
    }
    partidos.sort(ordenarPorConcordancia);

    return res.status(200).json({ uf, cargos, estadualIndisponivel, partidos, semParlamentares: semParlamentares.sort() });
  } catch (e) {
    console.error('afinidade:', e.message);
    return res.status(500).json({ erro: 'Não foi possível calcular agora. Tente de novo em instantes.' });
  }
}
