// POST /api/afinidade/parlamentares  { uf: 'RS', respostas: { pergunta_id: 'a_favor'|'contra'|'sem_opiniao' } }
//
// MÓDULO 1 DA AFINIDADE: PARLAMENTARES EM EXERCÍCIO. (27/09/2026)
// Só fatos: compara as respostas com o VOTO REGISTRADO de quem hoje tem mandato pelo estado
// escolhido, na Câmara, no Senado e na Assembleia (onde o site tem os votos). Candidatos de 2026
// são o módulo 2 (/api/afinidade/candidatos), com outra lógica. SEM IA. Não grava nada.
import { lerPedido } from '../../../src/lib/afinidade/pedido.js';
import { compararPessoa, ordenarPorConcordancia } from '../../../src/lib/afinidade/nucleo.js';
import { carregarVotosReais } from '../../../src/lib/afinidade/fonteVotos.js';
import { CASAS_AFINIDADE, ASSEMBLEIAS_COM_VOTO } from '../../../src/lib/afinidade/casas.js';
import { hrefPerfil } from '../../../src/lib/casa.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ erro: 'use POST' });
  const pedido = lerPedido(req.body);
  if (pedido.erro) return res.status(400).json({ erro: pedido.erro });
  const { uf, respostas } = pedido;

  try {
    const { posicoes, agentes } = await carregarVotosReais();
    const casas = {};
    for (const casa of CASAS_AFINIDADE) {
      // Assembleia sem voto publicado: diz isso, em vez de mostrar deputados "sem voto".
      if (casa.id === 'assembleia' && !ASSEMBLEIAS_COM_VOTO[uf]) { casas[casa.id] = { lista: [], semDados: true }; continue; }
      const lista = agentes
        .filter((a) => String(a.uf_sede || '').toUpperCase() === uf && a.em_exercicio !== false && casa.ehDaCasa(a))
        .map((a) => {
          const comp = compararPessoa(posicoes[a.id], respostas);
          const votou = comp.comparaveis > 0;
          return {
            href: hrefPerfil(a), nome_urna: a.nome_urna, partido_sigla: a.partido_atual || null, foto_url: a.foto_url || null,
            iguais: votou ? comp.iguais : 0, comparaveis: votou ? comp.comparaveis : 0, ...(votou ? { detalhes: comp.detalhes } : {}),
          };
        })
        .sort((a, b) => (b.comparaveis > 0) - (a.comparaveis > 0) || ordenarPorConcordancia(a, b) || String(a.nome_urna).localeCompare(String(b.nome_urna), 'pt-BR'));
      casas[casa.id] = { lista, ...(casa.id === 'assembleia' ? { nome: ASSEMBLEIAS_COM_VOTO[uf].nome } : {}) };
    }
    return res.status(200).json({ uf, casas });
  } catch (e) {
    console.error('afinidade.parlamentares:', e.message);
    return res.status(500).json({ erro: 'Não foi possível calcular agora. Tente de novo em instantes.' });
  }
}
