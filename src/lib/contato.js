// Contato público do Lume e o e-mail de "Encontrou um erro?" (18/10/2026, B7).
//
// Desde 02/11/2026 o botão abre o formulário /avisar-erro (linkAviso), que grava no banco 2. `linkErro` (e-mail pronto,
// o desenho original) fica sem uso na tela, só com teste; o e-mail do CONTATO segue valendo para pedidos sobre dados pessoais.
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

// Link do botão "Encontrou um erro? Avise": abre o formulário já com a página, o assunto e o dado em dúvida.
// Caminho interno do Lume, sem e-mail: funciona em qualquer aparelho, sem programa de e-mail configurado.
export function linkAviso({ caminho = '', assunto = '', detalhe = '' } = {}) {
  const limpo = String(caminho || '').split('#')[0];
  const q = new URLSearchParams();
  if (limpo) q.set('pagina', limpo.startsWith('/') ? limpo : `/${limpo}`);
  if (assunto) q.set('assunto', String(assunto).slice(0, 120));
  if (detalhe) q.set('detalhe', String(detalhe).slice(0, 120));
  const s = q.toString();
  return s ? `/avisar-erro?${s}` : '/avisar-erro';
}
