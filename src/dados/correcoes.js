// Histórico público de correções (18/10/2026, B7). Mostrado em /correcoes, mais recente primeiro.
//
// REGRA: só entra o que foi de fato corrigido no site. Cada item diz o que estava errado, o que
// mudou e onde conferir. Sem adjetivo e sem culpa: fato e fonte (D-003).
//
// Formato de cada item:
// { data: 'AAAA-MM-DD', pagina: '/deputado/fulano' (ou texto livre), erro: 'o que estava errado',
//   correcao: 'o que mudou', fonte: 'onde conferir (texto ou link)' }
export const CORRECOES = [
  {
    data: '2026-10-18',
    pagina: 'Páginas de votação (/votacao/...)',
    erro: 'Votações do Senado e da Assembleia do RS apareciam com a casa e a explicação da Câmara dos Deputados.',
    correcao: 'Cada votação passa a mostrar a casa de origem (Câmara, Senado ou Assembleia) e a explicação dessa casa. Erro encontrado por nós, não enviado por leitor.',
    fonte: 'A ementa oficial de cada votação aparece na própria página, ao lado do resumo.',
  },
];
