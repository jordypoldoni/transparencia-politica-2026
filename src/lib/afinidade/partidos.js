// PARTIDOS NA AFINIDADE. (26/09/2026; separado em 27/09/2026)
//
// Posição de cada partido = maioria dos parlamentares que HOJE estão nele, entre os que votaram
// Sim ou Não. Não é a orientação oficial do partido na época, nem a bancada daquele dia. Empate
// não vira posição ("dividido"). Usado pelo módulo CANDIDATOS 2026 (estimativa pelo partido).
const semAcento = (s) => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().trim();
export { semAcento as normalizarSigla };

const respostasValidas = (respostas) => Object.fromEntries(
  Object.entries(respostas || {}).filter(([, r]) => r === 'a_favor' || r === 'contra'));

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

