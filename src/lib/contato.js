// Contato público do Lume e o e-mail de "Encontrou um erro?" (18/10/2026, B7).
//
// O botão não usa formulário nem banco: abre o e-mail do próprio cidadão já preenchido com a página,
// o assunto e o dado em dúvida. Zero passos além de escrever o que viu. Peça pura, com teste.
//
// CONTATO é o mesmo e-mail público da /privacidade (escolhido pelo Jordy em 26/09/2026).
export const CONTATO = 'jordyoldoni07@gmail.com';
export const BASE_SITE = 'https://www.lumecidadao.com.br';

// caminho: o caminho da página (ex.: '/deputado/fulano?x=1#votos'). assunto: o que a página mostra
// (ex.: 'Perfil de Fulano (PL-RS)'). detalhe: o dado em dúvida, quando o botão está ao lado de um dado.
export function linkErro({ caminho = '', assunto = '', detalhe = '' } = {}) {
  const limpo = String(caminho || '').split('#')[0];
  const url = limpo ? `${BASE_SITE}${limpo.startsWith('/') ? limpo : `/${limpo}`}` : BASE_SITE;
  const titulo = assunto ? `Erro no Lume: ${assunto}` : 'Erro no Lume';
  const corpo = [
    'Olá! Encontrei um possível erro no Lume Cidadão.',
    '',
    `Página: ${url}`,
    assunto ? `Assunto: ${assunto}` : null,
    detalhe ? `Dado em dúvida: ${detalhe}` : null,
    '',
    'O que está errado (escreva aqui):',
    '',
    '',
    'O que a fonte oficial mostra, se você souber (um link ou print ajuda):',
    '',
  ].filter((x) => x !== null).join('\n');
  return `mailto:${CONTATO}?subject=${encodeURIComponent(titulo)}&body=${encodeURIComponent(corpo)}`;
}
