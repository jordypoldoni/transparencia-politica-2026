// PERGUNTAS DO QUESTIONÁRIO DE AFINIDADE (página "Pra você"). Aprovadas pelo Jordy em 25/09/2026.
//
// Cada pergunta É uma votação que aconteceu, e a comparação com candidatos se faz pelo voto
// registrado, nunca por interpretação. Critérios de escolha:
// - só a votação do TEXTO INTEIRO (a maioria das votações divididas é de emenda, urgência ou
//   preferência, e uma pergunta escrita pela ementa mediria outra coisa);
// - plenário dividido (votação quase unânime não separa ninguém);
// - tema classificado À MÃO (a classificação por palavra-chave pôs o arcabouço fiscal em Meio
//   Ambiente por causa de "sustentável").
//
// `id` é estável: é o que fica gravado no perfil (banco 2). Mudar o texto de uma pergunta de um
// jeito que mude o sentido pede um id NOVO, senão respostas antigas passam a valer para outra
// pergunta.
//
// `votacoes`: onde a mesma proposta foi votada. `simE` diz o que o voto Sim significa diante da
// pergunta como está escrita (em todas hoje, Sim = a favor; o campo existe para a primeira que
// não for assim). Casa sem votação correspondente fica de fora, e a tela diz que ali só há o
// voto da outra Casa.
export const VERSAO_PERGUNTAS = '2026-09-25';

export const PERGUNTAS_AFINIDADE = [
  {
    id: 'dosimetria-8-janeiro',
    tema: 'Segurança Pública',
    texto: 'Reduzir as penas dos condenados pelo 8 de janeiro e pela trama golpista, mudando o cálculo das penas (PL da Dosimetria)',
    proposta: 'PL 2162/2023',
    votacoes: [
      { casa: 'senado', id: 'SF-7041', data: '2025-12-17', simE: 'a_favor' },
      { casa: 'camara', id: '2358548-89', data: '2025-12-09', simE: 'a_favor' },
    ],
  },
  {
    id: 'decreto-armas-2019',
    tema: 'Segurança Pública',
    texto: 'Derrubar o decreto de 2019 que ampliou a posse e o porte de armas',
    proposta: 'PDL 233/2019',
    // A Câmara não chegou a votar: o decreto foi revogado pelo próprio governo em seguida.
    votacoes: [{ casa: 'senado', id: 'SF-5971', data: '2019-06-18', simE: 'a_favor' }],
  },
  {
    id: 'licenciamento-ambiental',
    tema: 'Meio Ambiente',
    texto: 'Aprovar a nova Lei Geral do Licenciamento Ambiental, que cria licenças mais simples e dispensa algumas atividades de licença',
    proposta: 'PL 2159/2021 (na Câmara, PL 3729/2004)',
    // Câmara: a busca pelo número não achou em 25/09; falta localizar pela proposição 257161.
    votacoes: [{ casa: 'senado', id: 'SF-6935', data: '2025-05-21', simE: 'a_favor' }],
  },
  {
    // Trocado em 25/09 da PEC 48/2023 (só o Senado votou) para a LEI do marco temporal, que as
    // duas Casas votaram em 2023: deputados e senadores comparados pelo mesmo texto.
    id: 'marco-temporal-lei',
    tema: 'Meio Ambiente',
    texto: 'Adotar em lei o marco temporal: só seriam terras indígenas as ocupadas em 5 de outubro de 1988',
    proposta: 'PL 2903/2023 (na Câmara, PL 490/2007)',
    votacoes: [
      { casa: 'senado', id: 'SF-6756', data: '2023-09-27', simE: 'a_favor' },
      { casa: 'camara', id: '345311-270', data: '2023-05-30', simE: 'a_favor' },
    ],
  },
  {
    id: 'reforma-tributaria-consumo',
    tema: 'Economia e Tributos',
    texto: 'Trocar cinco tributos sobre consumo (PIS, Cofins, IPI, ICMS e ISS) pela CBS e pelo IBS (reforma tributária)',
    proposta: 'PEC 45/2019',
    votacoes: [
      { casa: 'senado', id: 'SF-6777', data: '2023-11-08', simE: 'a_favor' },
      { casa: 'camara', id: '2196833-373', data: '2023-07-06', simE: 'a_favor' },
    ],
  },
  {
    id: 'arcabouco-fiscal',
    tema: 'Economia e Tributos',
    texto: 'Substituir o teto de gastos pelo arcabouço fiscal, que liga o crescimento da despesa ao crescimento da receita',
    proposta: 'PLP 93/2023',
    votacoes: [
      { casa: 'senado', id: 'SF-6714', data: '2023-06-21', simE: 'a_favor' },
      { casa: 'camara', id: '2357053-47', data: '2023-05-23', simE: 'a_favor' },
    ],
  },
  {
    id: 'pec-drogas-porte',
    tema: 'Saúde',
    texto: 'Pôr na Constituição que ter ou portar droga sem autorização é crime, em qualquer quantidade',
    proposta: 'PEC 45/2023',
    // Câmara: sem votação de plenário até 25/09/2026.
    // Senado: dois turnos no mesmo dia (SF-6824 e SF-6825); vale o segundo, o que aprovou.
    votacoes: [{ casa: 'senado', id: 'SF-6825', data: '2024-04-16', simE: 'a_favor' }],
  },
  {
    id: 'despejos-pandemia',
    tema: 'Habitação',
    texto: 'Suspender despejos e desocupações durante a pandemia de covid-19',
    proposta: 'PL 827/2020',
    votacoes: [
      { casa: 'senado', id: 'SF-6336', data: '2021-06-23', simE: 'a_favor' },
      { casa: 'camara', id: '2241695-65', data: '2021-05-18', simE: 'a_favor' },
    ],
  },
  {
    id: 'marco-saneamento',
    tema: 'Habitação',
    texto: 'Aprovar o novo marco do saneamento, que abre os serviços de água e esgoto à concorrência de empresas privadas',
    proposta: 'PL 4162/2019',
    // Câmara: a API lista a proposição sem votação de plenário; falta achar por outro caminho.
    votacoes: [{ casa: 'senado', id: 'SF-6144', data: '2020-06-24', simE: 'a_favor' }],
  },
  {
    id: 'escolas-civico-militares-rs',
    tema: 'Educação',
    texto: 'Autorizar o governo do Rio Grande do Sul a criar escolas cívico-militares',
    proposta: 'PL 344/2023 (ALERGS)',
    // Só a Assembleia do RS: compara apenas deputados estaduais gaúchos.
    uf: 'RS',
    votacoes: [{ casa: 'alergs', id: 'ALERGS-2024-04-09-PL344-2023', data: '2024-04-09', simE: 'a_favor' }],
  },
];

export const RESPOSTAS_VALIDAS = ['a_favor', 'contra', 'sem_opiniao'];
export const perguntaPorId = (id) => PERGUNTAS_AFINIDADE.find((p) => p.id === id) || null;
