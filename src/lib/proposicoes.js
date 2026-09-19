// Tradução das siglas de proposição para português comum.
//
// POR QUE EXISTE (11/09/2026)
// A ficha do parlamentar mostrava "REQ 1234/2026" e "PRL 1/2026". Para quem nao e do meio,
// isso nao diz nada - e a regra do site e nao pressupor conhecimento ("nao explicar azul
// pra quem nao conhece azul", ver Diretrizes de Design).
//
// Os nomes abaixo vieram da REFERENCIA OFICIAL da Camara
// (dadosabertos.camara.leg.br/api/v2/referencias/tiposProposicao), nao de memoria.
//
// REGRA IMPORTANTE: sigla desconhecida devolve a propria sigla. Nunca inventar um nome
// plausivel - um rotulo errado e pior que um rotulo tecnico, porque o leitor acredita nele.

const NOMES = {
  // --- Proposicoes que viram norma (o que a maioria entende por "projeto")
  PL: 'Projeto de Lei',
  PLP: 'Projeto de Lei Complementar',
  PEC: 'Proposta de Emenda à Constituição',
  PDL: 'Projeto de Decreto Legislativo',
  PDC: 'Projeto de Decreto Legislativo',
  PLV: 'Projeto de Lei de Conversão',
  PRC: 'Projeto de Resolução',
  PLN: 'Projeto de Lei (Congresso Nacional)',
  MPV: 'Medida Provisória',
  // Senado
  PLS: 'Projeto de Lei do Senado',
  PRS: 'Projeto de Resolução do Senado',

  // --- Atividade de procedimento
  REQ: 'Requerimento',
  RIC: 'Requerimento de Informação',
  RPD: 'Requerimento de Adiamento de Pauta',
  RQS: 'Requerimento',
  REC: 'Recurso',
  INC: 'Indicação',
  DOC: 'Documento',

  // --- Relatoria e emendas
  PRL: 'Parecer do Relator',
  PRLP: 'Parecer Preliminar',
  EMC: 'Emenda na Comissão',
  EMP: 'Emenda de Plenário',
  EMR: 'Emenda de Relator',
  SBT: 'Substitutivo',
  RDF: 'Redação Final',
};

// Tipos que criam ou alteram norma juridica. E a separacao que o leitor espera quando le
// "o que ele propos": projeto de lei nao e a mesma coisa que requerimento de adiamento.
export const TIPOS_PROJETO = ['PL', 'PLP', 'PEC', 'PDL', 'PDC', 'PLV', 'PRC', 'PLN'];

export function nomeTipoProposicao(sigla) {
  const s = String(sigla || '').trim().toUpperCase();
  return NOMES[s] || s || null;
}

export function ehProjeto(sigla) {
  return TIPOS_PROJETO.includes(String(sigla || '').trim().toUpperCase());
}

// ---------------------------------------------------------------------------
// CAMADA ZERO DAS PROPOSIÇÕES (15/09/2026) - POR REGRA, SEM IA.
//
// POR QUE NÃO É IA, como foi nas votações: escala. São 20.184 proposições guardadas no banco e
// 474.494 no universo declarado, e as que aparecem em "ver todas" são buscadas ao vivo pela
// /api/proposicoes, então nunca passam pelo banco. Resumir em lote custaria ~2,7 milhões de
// tokens só para as guardadas, e ainda assim não cobriria as buscadas na hora. Por regra o
// custo é zero, a latência é zero e vale igual para as 474 mil.
//
// O QUE ESTA CAMADA FAZ E O QUE NÃO FAZ: ela explica o INSTRUMENTO, não o conteúdo do projeto.
// O leitor descobre que um Requerimento de Informação não muda lei nenhuma, e que uma PEC mexe
// na Constituição. O que aquele projeto específico propõe continua sendo a ementa, que segue
// na tela. É teto baixo e conhecido, aceito na decisão de 13/09.
//
// MESMA REGRA DO NOMES ACIMA: sigla desconhecida devolve null, e a tela simplesmente não mostra
// a linha. Nunca inventar uma explicação plausível.
const O_QUE_FAZ = {
  PL: 'proposta para criar ou mudar uma lei comum. Precisa passar pela Câmara, pelo Senado e pela sanção do presidente.',
  PLP: 'proposta para criar ou mudar uma lei complementar, exigida pela Constituição em certos temas. Precisa de maioria absoluta.',
  PEC: 'proposta para mudar o texto da Constituição. Exige três quintos dos votos, em dois turnos, nas duas Casas.',
  PDL: 'decisão do Congresso que não passa pela sanção do presidente. Usada para sustar atos do Executivo, aprovar tratados e indicações.',
  PDC: 'decisão do Congresso que não passa pela sanção do presidente. Usada para sustar atos do Executivo, aprovar tratados e indicações.',
  MPV: 'norma editada pelo presidente que JÁ ESTÁ VALENDO desde que foi publicada. O Congresso decide depois se ela vira lei em definitivo.',
  PLV: 'versão de uma medida provisória depois de alterada pelo Congresso.',
  PRC: 'norma interna da Casa legislativa. Não vira lei federal.',
  PRS: 'norma interna do Senado. Não vira lei federal.',
  PLS: 'proposta para criar ou mudar uma lei, apresentada no Senado.',
  PLN: 'proposta de lei sobre orçamento e créditos, votada pelo Congresso reunido.',
  REQ: 'pedido sobre o andamento dos trabalhos. Não cria nem altera lei.',
  RQS: 'pedido sobre o andamento dos trabalhos. Não cria nem altera lei.',
  RIC: 'pedido formal para que um ministério ou órgão do governo preste informação. Não cria nem altera lei.',
  RPD: 'pedido para adiar a votação de um item da pauta.',
  REC: 'contestação de uma decisão tomada durante a tramitação.',
  INC: 'sugestão encaminhada a outro poder ou órgão. Não obriga ninguém a fazer nada.',
  PRL: 'análise de quem foi designado para examinar a proposta, com voto pela aprovação ou pela rejeição.',
  PRLP: 'análise preliminar de quem foi designado para examinar a proposta.',
  EMC: 'proposta de mudança no texto de outra proposição, apresentada em comissão.',
  EMP: 'proposta de mudança no texto de outra proposição, apresentada em plenário.',
  EMR: 'proposta de mudança no texto feita pelo relator.',
  SBT: 'texto alternativo que substitui integralmente a proposta original.',
  RDF: 'ajuste de forma no texto já aprovado, sem mudar o conteúdo.',
};

// ---------------------------------------------------------------------------
// O QUE ISSO ALCANÇA NA VIDA DE QUEM LÊ. (19/09/2026)
//
// POR QUE ESTA CAMADA EXISTE, SEPARADA DO O_QUE_FAZ ACIMA
// O `oQueFaz` responde "que instrumento é este e como ele tramita". É a resposta certa numa
// ficha de parlamentar, onde o leitor já está olhando uma proposição específica. Não é a
// resposta certa em quem chega à página de votações sem saber o que procura: ali a pergunta
// é "isso mexe em quê da minha vida?", e taxonomia não responde isso.
//
// A LINHA QUE NÃO SE ATRAVESSA: aqui se descreve o ALCANCE DO INSTRUMENTO, com exemplos do
// TIPO de coisa que se decide por ele. Nunca o que uma votação específica vai causar. Dizer
// "este PL vai aumentar seu imposto" seria previsão, e previsão é opinião com cara de dado.
// Dizer "lei comum é o que define imposto, pena de crime e regra de trabalho" é verificável.
//
// FEDERAL E ESTADUAL PRECISAM DE TEXTOS DIFERENTES, e isto corrige um erro que foi ao ar hoje:
// o cartão da Assembleia do RS anunciava que um projeto de lei "precisa passar pela Câmara,
// pelo Senado e pela sanção do presidente". É a tramitação federal descrevendo uma lei
// estadual. O texto de 15/09 nasceu numa tela só de federais e nunca tinha sido posto diante
// de um contexto estadual.
const NA_SUA_VIDA = {
  Federal: {
    PL: 'É por aqui que se decide o que é crime e qual a pena, regra de trabalho e de aposentadoria, o que o plano de saúde é obrigado a cobrir, o que vem escrito no rótulo do que você compra e as regras de trânsito.',
    PLS: 'É por aqui que se decide o que é crime e qual a pena, regra de trabalho e de aposentadoria, o que o plano de saúde é obrigado a cobrir, o que vem escrito no rótulo do que você compra e as regras de trânsito.',
    PLP: 'Trata do que a Constituição mandou detalhar, e quase sempre é dinheiro: como cada imposto é cobrado e repartido entre União, estados e municípios, limite de dívida dos governos e as regras do sistema financeiro.',
    PEC: 'Mexe na regra que está acima de todas as outras, então alcança o que lei comum não pode contrariar: idade e tempo de aposentadoria, quanto e como se cobra imposto, e quais direitos ficam protegidos.',
    MPV: 'Já está valendo enquanto é votada, por isso costuma tratar do que não espera: programa de transferência de renda, crédito, socorro a um setor em crise, preço administrado. Se o Congresso não aprovar no prazo, ela perde o efeito e o que valeu nesse meio-tempo precisa ser resolvido.',
    PDL: 'É o Congresso decidindo sem passar pelo presidente: derrubar uma regra que o governo editou, aprovar acordos com outros países e confirmar ou recusar nomes indicados para cargos como ministro de tribunal, diretor de agência e embaixador.',
    PDC: 'É o Congresso decidindo sem passar pelo presidente: derrubar uma regra que o governo editou, aprovar acordos com outros países e confirmar ou recusar nomes indicados para cargos.',
    PLV: 'É a medida provisória já com as mudanças que o Congresso fez. O que valia desde a publicação pode sair daqui diferente do que entrou.',
    PLN: 'Decide para onde vai o dinheiro público do ano: quanto cada área recebe, e de onde sai verba extra quando o governo precisa gastar além do previsto.',
    PRC: 'Não muda lei nenhuma: define como a própria Casa funciona. Alcança a sua vida de forma indireta, porque é o que determina o ritmo e a ordem com que tudo o mais é votado.',
    PRS: 'Não muda lei nenhuma: define como o Senado funciona por dentro, o que determina o ritmo e a ordem com que tudo o mais é votado.',
  },
  Estadual: {
    PL: 'Lei estadual alcança o que o estado administra diretamente: escola e hospital da rede estadual, polícia militar e civil, ICMS e IPVA (os impostos estaduais), rodovias sob gestão do estado e concessões de serviço público.',
    PLC: 'Trata do que a Constituição do estado mandou detalhar, geralmente a organização da administração estadual e as regras de carreira do serviço público do estado.',
    PEC: 'Muda a Constituição do estado, que está acima das leis estaduais: organiza os poderes do estado e fixa regras que nenhuma lei estadual pode contrariar.',
    PDL: 'É a Assembleia decidindo sem passar pelo governador, em geral para sustar um ato do Executivo estadual ou julgar as contas do governo.',
    PRC: 'Não muda lei nenhuma: define como a própria Assembleia funciona por dentro.',
  },
};

// Devolve a frase de alcance, ou null quando nao ha texto para aquela sigla NAQUELE ambito.
// Null faz a tela simplesmente nao mostrar a linha: sigla sem texto proprio nunca herda o
// texto de outro ambito, porque foi exatamente assim que a tramitacao federal foi parar na
// descricao de uma lei estadual.
export function naSuaVida(sigla, ambito = 'Federal') {
  const s = String(sigla || '').trim().toUpperCase();
  const mapa = NA_SUA_VIDA[ambito] || NA_SUA_VIDA.Federal;
  return mapa[s] || null;
}

// Devolve { nome, oQueFaz } ou null quando a sigla é desconhecida.
export function explicarProposicao(sigla) {
  const s = String(sigla || '').trim().toUpperCase();
  const nome = NOMES[s];
  const oQueFaz = O_QUE_FAZ[s];
  if (!nome || !oQueFaz) return null;
  return { sigla: s, nome, oQueFaz };
}

// Legenda dos tipos PRESENTES numa lista, sem repetir.
//
// POR QUE LEGENDA E NÃO UMA LINHA POR ITEM: numa ficha com 20 proposições, explicar o
// instrumento item a item repetiria o mesmo texto várias vezes e acrescentaria ~40 linhas à
// tela. A legenda diz cada coisa uma vez só. É o mesmo padrão que as Diretrizes de Design já
// fixaram para ressalva que governa uma lista: faixa no topo, não repetição no corpo.
export function legendaDosTipos(proposicoes, max = 4) {
  const vistos = new Map();
  for (const p of proposicoes || []) {
    const e = explicarProposicao(p?.tipo);
    if (e && !vistos.has(e.sigla)) vistos.set(e.sigla, e);
  }
  return [...vistos.values()].slice(0, max);
}
