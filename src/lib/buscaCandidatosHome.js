// BUSCA DE CANDIDATOS DA HOME (31/10/2026, etapa 4 do bloco "Eleições"). Só quem foi candidato em 2026
// (parlamentar em exercício tem os próprios campos de busca). Funções puras; a rota é pages/api/buscar-candidatos.js.
// Cargos: presidente (28 chapas, filtro em memória), governador, senador e deputado federal (banco) e, SÓ com estado
// escolhido, deputado estadual (o TSE só lista por UF). Cada cargo devolve poucos nomes + o total; "Ver todos" leva à
// página /eleicoes, onde a busca de cada cargo já existe.

export const POR_CARGO = 5;

const semAcento = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

// Termo limpo: texto de 2+ letras ou número de 1+ dígito. Devolve '' se não serve.
export function termoValido(q) {
  const t = String(q || '').trim().replace(/[%,()]/g, '').slice(0, 80);
  if (/^\d+$/.test(t)) return t;
  return t.length >= 2 ? t : '';
}

// Presidente: nome de urna, nome completo, sigla igual ou começo do número (mesma regra dos outros cargos).
export function filtrarPresidentes(chapas, termo) {
  const t = termoValido(termo);
  if (!t) return [];
  const q = semAcento(t);
  return (chapas || []).map((c) => c.presidente).filter(Boolean).filter((p) => (/^\d+$/.test(t)
    ? String(p.nr_candidato || '').startsWith(t)
    : semAcento(p.nome_urna).includes(q) || semAcento(p.nome_completo).includes(q) || semAcento(p.partido_sigla) === q));
}

// Item enxuto: só o que a lista mostra e o que o clique usa.
export const itemEnxuto = (d) => ({ slug: d.slug, nome: d.nome_urna, partido: d.partido_sigla || '', uf: d.uf || null, numero: d.nr_candidato ? String(d.nr_candidato) : '', foto: d.foto_url || null });

// Monta os grupos na ordem do cargo e descarta os vazios.
export function montarGrupos(entradas) {
  return entradas
    .filter((e) => e && e.total > 0 && (e.itens || []).length)
    .map((e) => ({ cargo: e.cargo, rotulo: e.rotulo, hrefBase: e.hrefBase, total: e.total, itens: e.itens.slice(0, POR_CARGO).map(itemEnxuto) }));
}

// Endereço de "Ver todos os resultados": o cargo com mais resultados (empate: o primeiro na ordem).
export function hrefTodos(grupos, termo, uf) {
  if (!grupos.length) return '/eleicoes';
  const g = grupos.reduce((m, x) => (x.total > m.total ? x : m), grupos[0]);
  const p = new URLSearchParams({ cargo: g.cargo });
  if (g.cargo !== 'presidente') {
    if (termo) p.set('busca', termo);
    if (uf && g.cargo === 'deputado-estadual') p.set('uf', uf);
  }
  return `/eleicoes?${p.toString()}`;
}
