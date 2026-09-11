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
