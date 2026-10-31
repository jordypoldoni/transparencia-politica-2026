// Funções puras do bloco "Eleições" da home (31/10/2026, etapa 2). Ficam fora do componente para ter teste.

const MINUSCULAS = new Set(['da', 'de', 'do', 'das', 'dos', 'e']);

// "CELINA LEÃO" -> "Celina Leão" (preposições ficam em minúscula).
export function nomeBonito(nome) {
  return String(nome || '').toLowerCase().split(' ').filter(Boolean)
    .map((p, i) => (i > 0 && MINUSCULAS.has(p) ? p : p.charAt(0).toUpperCase() + p.slice(1))).join(' ');
}

// "52,17" -> 52.17
export const pctNum = (p) => Number(String(p == null ? '' : p).replace(/\./g, '').replace(',', '.')) || 0;

// Cadeiras por partido: conta os eleitos de cada partido e devolve os `n` maiores (empate: ordem alfabética)
// e o total dos demais em `outros`. Barra sempre por QUANTIDADE de eleitos.
export function cadeirasPorPartido(eleitos, n = 6) {
  const cont = {};
  for (const e of eleitos || []) {
    const p = String(e?.partido || '').trim();
    if (p) cont[p] = (cont[p] || 0) + 1;
  }
  return cadeirasDeContagem(cont, n);
}

// O mesmo, a partir de uma contagem pronta { PARTIDO: qtd } (o resumo do país já chega somado do servidor).
export function cadeirasDeContagem(contagem, n = 6) {
  const todos = Object.entries(contagem || {}).filter(([, q]) => q > 0).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'pt-BR'));
  const topo = todos.slice(0, n).map(([partido, qtd]) => ({ partido, qtd }));
  const outros = todos.slice(n).reduce((s, [, q]) => s + q, 0);
  const total = todos.reduce((s, [, q]) => s + q, 0);
  const maior = Math.max(1, outros, ...topo.map((x) => x.qtd));
  return { total, linhas: topo, outros, maior };
}

// Governador no 1º turno: o eleito, ou (se ninguém passou de 50%) os finalistas que foram ao 2º turno.
export function governoNoPrimeiroTurno(candidatos) {
  const lista = Array.isArray(candidatos) ? candidatos : [];
  const eleito = lista.find((c) => c.eleito);
  if (eleito) return { eleito, finalistas: [] };
  const finalistas = lista.filter((c) => c.segundoTurno).slice(0, 2);
  return { eleito: null, finalistas };
}

// A sigla é de um estado conhecido?
export const ufConhecida = (uf, lista) => lista.includes(String(uf || '').toUpperCase());
