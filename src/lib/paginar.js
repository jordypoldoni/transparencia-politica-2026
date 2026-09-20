// buscarTudo() — lê TODAS as linhas de uma consulta Supabase, não as primeiras mil.
//
// POR QUE ISTO EXISTE (20/09/2026)
// O PostgREST do Supabase devolve no máximo 1.000 linhas por requisição. Não é erro, não é
// aviso, não é campo na resposta: a consulta volta 200 com mil linhas e parece completa.
// Um `.limit(4000)` não ajuda, porque o teto do servidor vence o do cliente.
//
// Este projeto foi mordido três vezes pela mesma coisa:
//   19/09 - a /votacoes perdeu as 281 mais antigas quando a tabela passou de 1.000;
//   20/09 - o coletor de fichas do TSE anunciou "1.000 pendentes" achando que era o total;
//   20/09 - a auditoria encontrou o pior caso, que estava no ar sem ninguém ver: 247 dos 741
//           parlamentares têm mais de 1.000 lançamentos de despesa, então total, média mensal,
//           gráfico e categorias estavam calculados sobre um recorte arbitrário.
//
// Nas três vezes a regra existia escrita e a defesa era lembrar dela ao escrever cada consulta
// nova. Não funcionou. Por isso a defesa agora é esta função: quem lê tabela que pode passar de
// mil linhas chama buscarTudo(), e quem chama .select() direto numa tabela grande é a exceção,
// que fica visível na revisão.
//
// Uso:
//   const linhas = await buscarTudo(() => supabase.from('despesas_parlamentares')
//     .select('valor_liquido, mes, ano').eq('agente_id', id));
//
// A função recebe uma FÁBRICA de consulta (uma função que devolve a consulta), não a consulta
// pronta: cada página precisa de um .range() diferente, e uma consulta do supabase-js só pode
// ser executada uma vez.

const PAGINA = 1000;
const TETO_PADRAO = 100000; // trava contra laço infinito se algo mudar no servidor

export async function buscarTudo(fabricaDeConsulta, nome = 'buscarTudo', { pagina = PAGINA, teto = TETO_PADRAO } = {}) {
  const todas = [];
  for (let inicio = 0; inicio < teto; inicio += pagina) {
    const { data, error } = await fabricaDeConsulta().range(inicio, inicio + pagina - 1);
    // Erro no meio NÃO vira lista vazia nem silêncio: devolve o que veio e grita, porque meia
    // lista apresentada como inteira é o problema que esta função existe para impedir.
    if (error) { console.error(`${nome}:`, error.message); return todas; }
    const lote = data || [];
    todas.push(...lote);
    // Página incompleta significa fim. Página cheia NÃO significa fim, e foi exatamente essa
    // confusão que causou os três casos acima.
    if (lote.length < pagina) return todas;
  }
  console.warn(`⚠ buscarTudo parou no teto de ${teto} linhas. Confira se isso era esperado.`);
  return todas;
}

export default buscarTudo;
