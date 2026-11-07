// "Em destaque" no topo da lista de votações de cada casa (07/11/2026).
//
// MAIS IMPORTANTE: lista curada pela equipe do Lume, guardada em public.destaques_votacoes.
// Critérios, ditos pelo Jordy: a matéria aparece muito nas notícias E muda direto a vida dos
// brasileiros. O critério vale para qualquer partido ou governo; a lista nunca nasce de opinião
// sobre mérito. O texto do cartão vem do resumo "Entenda em 1 minuto" (resumos_entenda).
//
// PALAVRAS SIMPLES NO CARTÃO (decisão do Jordy, 07/11/2026): "promulgada" e "sancionada" não
// dizem nada ao leitor comum. O cartão usa a frase que ele entende ("Já vale", "Já é lei"); o
// termo oficial e o que ele significa aparecem na página da votação (explicarStatus).
import { chaveEntenda, normalizarEntenda } from './entenda.js';

const STATUS = {
  'promulgada': { rotulo: 'Já vale', tom: 'ok', explica: 'o Congresso publicou a mudança na Constituição, e ela já vale.' },
  'sancionada': { rotulo: 'Já é lei', tom: 'ok', explica: 'o presidente assinou o projeto, e ele virou lei.' },
  'virou lei': { rotulo: 'Já é lei', tom: 'ok', explica: 'o projeto passou por todas as etapas e hoje é lei.' },
  'aprovada': { rotulo: 'Ainda não vale', tom: 'espera', explica: 'o Congresso aprovou, mas a mudança ainda não vale. Falta a promulgação, que é o Congresso publicar a mudança oficialmente.' },
  'em análise': { rotulo: 'Em análise', tom: 'espera', explica: 'o projeto ainda está em discussão e nada foi decidido.' },
};

const chaveStatus = (rotulo) => String(rotulo || '').trim().toLowerCase();

// Rótulo curto do cartão. Termo desconhecido aparece como veio: melhor o termo oficial que nada.
export function statusSimples(rotulo) {
  const s = STATUS[chaveStatus(rotulo)];
  if (s) return { rotulo: s.rotulo, tom: s.tom };
  const bruto = String(rotulo || '').trim();
  return bruto ? { rotulo: bruto, tom: 'espera' } : null;
}

// Frase da página da votação: "Promulgada: o Congresso publicou...". Sem explicação, null.
export function explicarStatus(rotulo) {
  const s = STATUS[chaveStatus(rotulo)];
  return s ? { termo: String(rotulo).trim(), texto: s.explica } : null;
}

// Primeira frase de "o que muda", sem o negrito (**) e cortada em fim de palavra.
export function trechoCurto(texto, max = 150) {
  const limpo = String(texto || '').replace(/\*\*/g, '').replace(/\s+/g, ' ').trim();
  if (limpo.length <= max) return limpo;
  const corte = limpo.slice(0, max);
  const ultimo = corte.lastIndexOf(' ');
  return `${(ultimo > 60 ? corte.slice(0, ultimo) : corte).replace(/[,;:\s]+$/, '')}…`;
}

// destaques: linhas de destaques_votacoes; resumos: { 'casa:id': conteudo jsonb };
// alvos: { proposicao_id: votacao_id_externa } (a votação mais recente da matéria).
// Quem não tem resumo ou votação para abrir fica de fora: cartão sem destino é beco sem saída.
export function montarMaisImportantes({ casa, destaques, resumos, alvos }) {
  return [...(destaques || [])]
    .sort((a, b) => a.ordem - b.ordem)
    .map((d) => {
      const dados = normalizarEntenda((resumos || {})[chaveEntenda(casa, d.proposicao_id)]);
      const votacaoId = (alvos || {})[String(d.proposicao_id)];
      if (!dados || !dados.apelido || !votacaoId) return null;
      return {
        chave: `${casa}:${d.proposicao_id}`,
        apelido: dados.apelido,
        rotuloProposicao: dados.rotuloProposicao,
        status: dados.status ? statusSimples(dados.status.rotulo) : null,
        resumo: trechoCurto(dados.mudancas[0]),
        href: `/votacao/${encodeURIComponent(votacaoId)}`,
      };
    })
    .filter(Boolean);
}

// "Em alta": as matérias da lista "Mais importante" que o coletor achou em alta agora, na ordem
// dele, cada uma com as etiquetas das fontes. linhas: em_alta_votacoes já filtrada por validade.
export function montarEmAlta({ casa, cartoes, linhas, rotulos, max = 5 }) {
  const porChave = new Map((cartoes || []).map((c) => [c.chave, c]));
  return [...(linhas || [])]
    .sort((a, b) => b.pontos - a.pontos)
    .map((l) => {
      const c = porChave.get(`${casa}:${l.proposicao_id}`);
      return c ? { ...c, fontes: (l.fontes || []).map((f) => (rotulos || {})[f]).filter(Boolean) } : null;
    })
    .filter(Boolean)
    .slice(0, max);
}
