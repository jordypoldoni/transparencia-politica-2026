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
