// CÁLCULO DA AFINIDADE, sem IA. (26/09/2026)
//
// Compara as respostas da pessoa com o VOTO REGISTRADO de cada parlamentar nas votações do
// catálogo (src/lib/perguntasAfinidade.js). Função pura: recebe os dados, devolve o resultado.
// Quem busca no banco é a rota /api/afinidade; quem testa é quem quiser, sem banco.
//
// REGRAS (cada uma é uma afirmação que a tela faz, então tem de ser verdade):
// - Só conta voto Sim ou Não. Abstenção, obstrução e ausência não dizem posição: ficam de fora
//   da conta, e a tela diz em quantas perguntas houve comparação.
// - "Sem opinião" da pessoa também fica de fora.
// - Quem votou a mesma pergunta em duas Casas (ex.: foi deputado e hoje é senador) vale o voto
//   MAIS RECENTE.
// - PARTIDO: é a maioria dos parlamentares que HOJE estão no partido, entre os que votaram Sim ou
//   Não. Não é a orientação oficial do partido na época, nem a bancada daquele dia: a tela diz
//   exatamente isso. Empate não vira posição ("dividido").
import { PERGUNTAS_AFINIDADE } from './perguntasAfinidade.js';

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

// Maioria dos ATUAIS membros de cada partido, por pergunta.
export function posicoesPorPartido(posicoes, agentes) {
  const cont = {}; // sigla → pergunta → {a_favor, contra}
  for (const a of agentes) {
    const sigla = semAcento(a.partido_atual);
    const pa = posicoes[a.id];
    if (!sigla || !pa) continue;
    for (const [pid, { pos }] of Object.entries(pa)) {
      const c = ((cont[sigla] ||= {})[pid] ||= { a_favor: 0, contra: 0 });
      c[pos]++;
    }
  }
  const r = {};
  for (const [sigla, porPergunta] of Object.entries(cont)) {
    r[sigla] = {};
    for (const [pid, c] of Object.entries(porPergunta)) {
      const pos = c.a_favor > c.contra ? 'a_favor' : c.contra > c.a_favor ? 'contra' : 'dividido';
      r[sigla][pid] = { pos, a_favor: c.a_favor, contra: c.contra };
    }
  }
  return r;
}

export function compararPartido(porPergunta, respostas) {
  const minhas = respostasValidas(respostas);
  let iguais = 0, comparaveis = 0;
  const detalhes = [];
  for (const [pid, voce] of Object.entries(minhas)) {
    const p = porPergunta?.[pid];
    if (!p || p.pos === 'dividido') { detalhes.push({ pergunta_id: pid, voce, maioria: p ? 'dividido' : null, placar: p ? { a_favor: p.a_favor, contra: p.contra } : null }); continue; }
    comparaveis++;
    if (p.pos === voce) iguais++;
    detalhes.push({ pergunta_id: pid, voce, maioria: p.pos, placar: { a_favor: p.a_favor, contra: p.contra } });
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

export { semAcento as normalizarSigla };
