// Resumo visual "Entenda em 1 minuto" de uma proposição (07/11/2026).
//
// O conteúdo mora em public.resumos_entenda (coluna jsonb `conteudo`), uma linha por proposição,
// porque várias votações dividem a mesma proposição (a PEC 18/2025 tem 4 no Senado).
// Quem escreve é o Claude, lendo o texto oficial e conferindo nas fontes; o site só mostra.
// Esta função existe para o site NUNCA quebrar por causa de um JSON mal formado: tudo é
// conferido, cortado e filtrado, e o que não presta some em vez de virar erro na tela.

const txt = (v, max = 600) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const lista = (v, max) => (Array.isArray(v) ? v.slice(0, max) : []);
const numero = (v) => (typeof v === 'number' && Number.isFinite(v) && v >= 0 ? v : null);
const urlSegura = (u) => (typeof u === 'string' && /^https:\/\//i.test(u.trim()) ? u.trim().slice(0, 500) : null);

// Chave da linha: casa + id da proposição. O id sozinho colide entre Câmara dos Deputados e Senado Federal.
export function chaveEntenda(casaChave, proposicaoId) {
  if (!casaChave || proposicaoId === null || proposicaoId === undefined || proposicaoId === '') return null;
  return `${casaChave}:${proposicaoId}`;
}

export function normalizarEntenda(bruto) {
  if (!bruto || typeof bruto !== 'object') return null;
  const mudancas = lista(bruto.mudancas, 8).map((m) => txt(m, 400)).filter(Boolean);

  let barras = null;
  if (bruto.barras && typeof bruto.barras === 'object') {
    const itens = lista(bruto.barras.itens, 6).map((i) => ({
      rotulo: txt(i && i.rotulo, 120), sub: txt(i && i.sub, 120), valor: numero(i && i.valor),
      unidade: txt(i && i.unidade, 12), destaque: !!(i && i.destaque),
    })).filter((i) => i.rotulo && i.valor !== null);
    if (itens.length) {
      const max = Math.max(...itens.map((i) => i.valor)) || 1;
      barras = { titulo: txt(bruto.barras.titulo, 120), itens: itens.map((i) => ({ ...i, largura: Math.max(8, Math.round((i.valor / max) * 1000) / 10) })) };
    }
  }

  let dias = null;
  if (bruto.dias && typeof bruto.dias === 'object') {
    const linhas = lista(bruto.dias.linhas, 4).map((l) => ({
      rotulo: txt(l && l.rotulo, 80),
      trabalho: Math.min(7, Math.floor(numero(l && l.trabalho) ?? 0)),
      descanso: Math.min(7, Math.floor(numero(l && l.descanso) ?? 0)),
    })).filter((l) => l.rotulo && l.trabalho + l.descanso > 0);
    if (linhas.length) dias = { titulo: txt(bruto.dias.titulo, 120), linhas };
  }

  let fluxo = null;
  if (bruto.fluxo && typeof bruto.fluxo === 'object') {
    const etapas = lista(bruto.fluxo.etapas, 5).map((e) => ({ titulo: txt(e && e.titulo, 100), texto: txt(e && e.texto, 300), final: !!(e && e.final) })).filter((e) => e.titulo);
    if (etapas.length) fluxo = { etapas, nota: txt(bruto.fluxo.nota, 400) };
  }

  const fontes = lista(bruto.fontes, 6).map((f) => ({ rotulo: txt(f && f.rotulo, 120), url: urlSegura(f && f.url) })).filter((f) => f.rotulo);
  const status = bruto.status && typeof bruto.status === 'object' && txt(bruto.status.rotulo, 40)
    ? { rotulo: txt(bruto.status.rotulo, 40), texto: txt(bruto.status.texto, 200) } : null;

  const dados = {
    rotuloProposicao: txt(bruto.rotulo_proposicao, 160),
    apelido: txt(bruto.apelido, 80),
    status, mudancas, barras, dias, fluxo,
    excecoes: lista(bruto.excecoes, 8).map((e) => txt(e, 400)).filter(Boolean),
    fontes, consultadoEm: txt(bruto.consultado_em, 10),
  };
  // Sem nenhum bloco de conteúdo, não há o que mostrar.
  return dados.mudancas.length || dados.barras || dados.dias || dados.fluxo || dados.excecoes.length ? dados : null;
}
