// AVISO DE ERRO (02/11/2026). Regras do formulário "Avisar de um erro", que grava na tabela `avisos_erro` do banco 2
// (supabase/banco2/003_avisos_erro.sql). Peça pura, sem rede nem tela, por isso tem teste.
//
// O que se guarda: a página, o que a pessoa escreveu (com o assunto e o dado em dúvida, quando o link
// trouxe), a fonte oficial que ela citou (opcional) e o e-mail de retorno (opcional).
// O que NÃO se guarda: endereço de internet e navegador. A trava de abuso é global (limite por hora na própria
// tabela), então não precisa identificar ninguém.

export const MIN_DESCRICAO = 10;
export const MAX_DESCRICAO = 1500; // o banco aceita 2000; o resto é do assunto, da fonte e do dado em dúvida
export const MAX_PAGINA = 300;
export const MAX_EMAIL = 200;
export const LIMITE_POR_HORA = 30;

const limpa = (s, n) => String(s == null ? '' : s).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '').trim().slice(0, n);

// Aceita só caminho interno do Lume (começa com "/"), sem "//" (evita endereço de outro site). Tira o "#".
export function caminhoSeguro(valor) {
  const c = limpa(valor, MAX_PAGINA).split('#')[0];
  if (!c.startsWith('/') || c.startsWith('//')) return '';
  return c;
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

// Devolve { ok: true, dados } ou { ok: false, motivo }. `robo: true` quando o campo escondido veio preenchido:
// o servidor responde "ok" sem gravar, para o robô não aprender nada.
export function validarAviso(entrada = {}) {
  if (limpa(entrada.site, 200)) return { ok: true, robo: true };

  const descricao = limpa(entrada.descricao, MAX_DESCRICAO + 1);
  if (descricao.length < MIN_DESCRICAO) return { ok: false, motivo: `Conte o que está errado, em pelo menos ${MIN_DESCRICAO} letras.` };
  if (descricao.length > MAX_DESCRICAO) return { ok: false, motivo: `Passou de ${MAX_DESCRICAO} letras. Resuma um pouco.` };

  const fonte = limpa(entrada.fonte, 300);
  if (fonte && !/^https?:\/\/\S+$/i.test(fonte)) return { ok: false, motivo: 'O link da fonte oficial precisa começar com http:// ou https://.' };

  const email = limpa(entrada.email, MAX_EMAIL + 1);
  if (email && (email.length > MAX_EMAIL || !EMAIL.test(email))) return { ok: false, motivo: 'Esse e-mail não parece certo. Confira ou deixe em branco.' };

  const pagina = caminhoSeguro(entrada.pagina) || '(não informada)';
  const assunto = limpa(entrada.assunto, 120).replace(/\s+/g, ' ');
  const detalhe = limpa(entrada.detalhe, 120).replace(/\s+/g, ' ');

  const partes = [];
  if (assunto) partes.push(`Assunto: ${assunto}`);
  if (detalhe) partes.push(`Dado em dúvida: ${detalhe}`);
  partes.push(descricao);
  if (fonte) partes.push(`Fonte oficial citada: ${fonte}`);

  return { ok: true, dados: { pagina, descricao: partes.join('\n'), email_retorno: email || null } };
}
