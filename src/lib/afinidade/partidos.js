// PARTIDOS NA AFINIDADE. (26/09/2026; separado em 27/09/2026; refeito para o módulo 2 em 27/09/2026)
//
// Usado pelo módulo CANDIDATOS 2026 (/api/afinidade/candidatos): quem é candidato e nunca votou
// essas propostas só pode ser estimado pelo partido.
//
// Posição de cada partido = maioria dos parlamentares que HOJE estão nele e em exercício, entre
// os que votaram Sim ou Não. Não é a orientação oficial do partido na época, nem a bancada
// daquele dia. Empate não vira posição ("dividido").
//
// COESÃO (pedido do Jordy, 27/09: "com o quanto o partido vota unido"): em cada pergunta que a
// pessoa respondeu, a fatia dos parlamentares do partido que votou com a maioria (9 a 1 = 90%).
// A coesão é a média dessas fatias. É ela que diz o quanto a estimativa vale: num partido que
// vota 95% junto, o candidato provavelmente segue; num que racha 55 a 45, a maioria diz pouco.
const semAcento = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().trim();
export { semAcento as normalizarSigla };

const respostasValidas = (respostas) => Object.fromEntries(
  Object.entries(respostas || {}).filter(([, r]) => r === 'a_favor' || r === 'contra'));

// Faixas da coesão, na tela. Fonte única para rota e página.
export const faixaCoesao = (c) => (c == null ? null : c >= 0.9 ? 'Vota unido' : c >= 0.75 ? 'Maioria clara' : 'Dividido');

// Por partido: contagem por pergunta e quem votou o quê.
// { SIGLA: { perguntas: { pergunta_id: { pos, a_favor, contra } }, membros: { agente_id: Set(pergunta_id) } } }
export function posicoesPorPartido(posicoes, agentes) {
  const r = {};
  for (const a of agentes) {
    if (a.em_exercicio === false) continue;
    const sigla = semAcento(a.partido_atual);
    const pa = posicoes[a.id];
    if (!sigla || !pa) continue;
    const p = (r[sigla] ||= { perguntas: {}, membros: {} });
    for (const [pid, { pos }] of Object.entries(pa)) {
      const c = (p.perguntas[pid] ||= { a_favor: 0, contra: 0 });
      c[pos]++;
      (p.membros[a.id] ||= new Set()).add(pid);
    }
  }
  for (const p of Object.values(r)) {
    for (const c of Object.values(p.perguntas)) c.pos = c.a_favor > c.contra ? 'a_favor' : c.contra > c.a_favor ? 'contra' : 'dividido';
  }
  return r;
}

// Compara as respostas com a maioria do partido. Devolve também a coesão e quantos
// parlamentares de hoje votaram ao menos uma das perguntas respondidas (a base da estimativa).
export function compararPartido(partido, respostas) {
  const minhas = respostasValidas(respostas);
  let iguais = 0, comparaveis = 0, somaFatias = 0, comVoto = 0;
  const detalhes = [];
  for (const [pid, voce] of Object.entries(minhas)) {
    const p = partido?.perguntas?.[pid];
    if (!p) { detalhes.push({ pergunta_id: pid, voce, maioria: null, placar: null }); continue; }
    const placar = { a_favor: p.a_favor, contra: p.contra };
    somaFatias += Math.max(p.a_favor, p.contra) / (p.a_favor + p.contra);
    comVoto++;
    if (p.pos === 'dividido') { detalhes.push({ pergunta_id: pid, voce, maioria: 'dividido', placar }); continue; }
    comparaveis++;
    if (p.pos === voce) iguais++;
    detalhes.push({ pergunta_id: pid, voce, maioria: p.pos, placar });
  }
  const ids = Object.keys(minhas);
  const membros = Object.values(partido?.membros || {}).filter((s) => ids.some((id) => s.has(id))).length;
  return { iguais, comparaveis, detalhes, coesao: comVoto ? somaFatias / comVoto : null, membros };
}
