// NÚCLEO DA AFINIDADE, sem IA. (26/09/2026; separado em 27/09/2026)
//
// Um núcleo só para os dois módulos (pedido do Jordy, 27/09): o módulo PARLAMENTARES (voto real,
// /api/afinidade/parlamentares) e o módulo CANDIDATOS 2026 (estimativa pelo partido). Aqui mora
// só a comparação; quem busca voto no banco é src/lib/afinidade/fonteVotos.js.
//
// Compara as respostas da pessoa com o VOTO REGISTRADO de cada parlamentar nas votações do
// catálogo (src/lib/perguntasAfinidade.js). Função pura: recebe os dados, devolve o resultado.
//
// REGRAS (cada uma é uma afirmação que a tela faz, então tem de ser verdade):
// - Só conta voto Sim ou Não. Abstenção, obstrução e ausência não dizem posição: ficam de fora
//   da conta, e a tela diz em quantas perguntas houve comparação.
// - "Sem opinião" da pessoa também fica de fora.
// - Quem votou a mesma pergunta em duas Casas (ex.: foi deputado e hoje é senador) vale o voto
//   MAIS RECENTE.
// - PARTIDO: regra em src/lib/afinidade/partidos.js.
import { PERGUNTAS_AFINIDADE } from '../perguntasAfinidade.js';

const oposto = (x) => (x === 'a_favor' ? 'contra' : x === 'contra' ? 'a_favor' : null);
const semAcento = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().trim();

// votação → { pergunta_id, simE }
export function mapaVotacoes(perguntas = PERGUNTAS_AFINIDADE) {
  const m = new Map();
  for (const p of perguntas) for (const v of p.votacoes) m.set(v.id, { pergunta_id: p.id, simE: v.simE, casa: v.casa });
  return m;
}

// Posição de cada parlamentar em cada pergunta: { agente_id: { pergunta_id: { pos, data, casa } } }
export function posicoesPorAgente(votos, mapa = mapaVotacoes()) {
  const r = {};
  for (const v of votos) {
    const ref = mapa.get(v.votacao_id_externa);
    if (!ref) continue;
    const tipo = semAcento(v.voto_tipo);
    const pos = tipo === 'SIM' ? ref.simE : tipo === 'NAO' ? oposto(ref.simE) : null;
    if (!pos) continue;
    const atual = (r[v.agente_id] ||= {})[ref.pergunta_id];
    if (!atual || String(v.data_voto) > String(atual.data)) r[v.agente_id][ref.pergunta_id] = { pos, data: v.data_voto, casa: ref.casa };
  }
  return r;
}

// Respostas da pessoa: só a_favor/contra entram na conta.
const respostasValidas = (respostas) => Object.fromEntries(
  Object.entries(respostas || {}).filter(([, r]) => r === 'a_favor' || r === 'contra'));

export function compararPessoa(posicoes, respostas) {
  const minhas = respostasValidas(respostas);
  let iguais = 0, comparaveis = 0;
  const detalhes = [];
  for (const [pid, voce] of Object.entries(minhas)) {
    const p = posicoes?.[pid];
    if (!p) { detalhes.push({ pergunta_id: pid, voce, votou: null }); continue; }
    comparaveis++;
    if (p.pos === voce) iguais++;
    detalhes.push({ pergunta_id: pid, voce, votou: p.pos, casa: p.casa });
  }
  return { iguais, comparaveis, detalhes };
}

// ORDEM (revista em 26/09/2026). A primeira versão ordenava pela porcentagem pura, e "1 de 1"
// (100%) ficava acima de "9 de 10" (90%): pouca evidência ganhava de muita. Agora:
//   1) quem tem pelo menos MIN_COMPARAVEIS perguntas comparáveis vem antes de quem tem menos
//      (a página mostra esses em grupo separado, "votou poucas dessas propostas");
//   2) dentro de cada grupo, o SALDO: iguais menos diferentes. 5 iguais e 1 diferente (saldo 4)
//      empata com 4 e 0 (saldo 4), e os dois ficam acima de 3 e 0 (saldo 3);
//   3) empate no saldo: quem votou mais perguntas (mais evidência) primeiro.
export const MIN_COMPARAVEIS = 3;
export const saldo = (x) => x.iguais - (x.comparaveis - x.iguais);
export const ordenarPorConcordancia = (a, b) =>
  (b.comparaveis >= MIN_COMPARAVEIS) - (a.comparaveis >= MIN_COMPARAVEIS)
  || saldo(b) - saldo(a)
  || b.comparaveis - a.comparaveis;

