// Ordem das notas dentro de um tipo de despesa (07/11/2026, pedido do Jordy).
// A regra geral continua sendo da maior para a menor (ver components/NotasDaCategoria.jsx).
// Exceção: "Divulgação da atividade parlamentar" vai do comprovante mais recente ao mais antigo,
// porque ali o que interessa é quando a divulgação foi paga, não quanto custou cada peça.

export function ehDivulgacaoAtividade(tipo) {
  return /divulga[cç][aã]o da atividade parlamentar/i.test(String(tipo || ''));
}

// Devolve uma cópia ordenada. Nota sem data vai para o fim, e a maior vem antes (desempate).
export function ordenarNotas(tipo, notas) {
  const lista = [...(notas || [])];
  const valor = (n) => parseFloat(n.valor_liquido || 0);
  if (ehDivulgacaoAtividade(tipo)) {
    const dia = (n) => (n.data_emissao ? String(n.data_emissao).slice(0, 10) : '');
    return lista.sort((a, b) => {
      const da = dia(a), db = dia(b);
      if (da !== db) return !da ? 1 : !db ? -1 : db.localeCompare(da);
      return valor(b) - valor(a);
    });
  }
  return lista.sort((a, b) => valor(b) - valor(a));
}
