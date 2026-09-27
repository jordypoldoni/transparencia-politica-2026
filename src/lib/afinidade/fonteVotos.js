// FONTE DE VOTOS REAIS (servidor). (27/09/2026)
//
// Lê do banco 1 os votos de TODAS as votações do catálogo de perguntas e o cadastro dos
// parlamentares, e devolve a posição de cada um em cada pergunta (src/lib/afinidade/nucleo.js).
// Votos e cadastro só mudam quando um coletor roda: guardado 1 hora na memória da função.
import supabase from '../../supabase_cliente.js';
import { buscarTudo } from '../paginar.js';
import { PERGUNTAS_AFINIDADE } from '../perguntasAfinidade.js';
import { mapaVotacoes, posicoesPorAgente } from './nucleo.js';

let base = null;
export async function carregarVotosReais() {
  if (base && Date.now() - base.em < 60 * 60 * 1000) return base;
  const ids = PERGUNTAS_AFINIDADE.flatMap((p) => p.votacoes.map((v) => v.id));
  const [votos, agentes] = await Promise.all([
    buscarTudo(() => supabase.from('votos_parlamentares').select('agente_id, votacao_id_externa, voto_tipo, data_voto').in('votacao_id_externa', ids), 'afinidade.votos'),
    buscarTudo(() => supabase.from('agentes_politicos').select('id, slug, nome_urna, partido_atual, uf_sede, foto_url, cargo_atual, casa_legislativa, fonte_api, em_exercicio'), 'afinidade.agentes'),
  ]);
  base = { em: Date.now(), posicoes: posicoesPorAgente(votos, mapaVotacoes()), agentes };
  return base;
}
