// Genero do parlamentar para flexionar o texto ("ele", "ela", "Eleito", "Eleita").
//
// POR QUE EXISTE (12/10/2026): os titulos das secoes do perfil diziam "ele" para todos
// ("Em que ele gastou"), inclusive para as 89 deputadas e 17 senadoras. Jordy: "as frases
// dizem ele em todas".
//
// O dado vem das fontes oficiais, nao de palpite pelo primeiro nome: a Camara grava "M" ou
// "F", o Senado grava "Masculino" ou "Feminino" e o TSE grava "MASCULINO" ou "FEMININO".
// Sem dado (deputados estaduais, ex-senadores, alguns senadores) NAO se adivinha: o texto
// cai numa forma neutra, que le bem para qualquer pessoa.

export function generoDe(valor) {
  const s = String(valor ?? '').trim().toLowerCase();
  if (s === 'm' || s === 'masculino') return 'M';
  if (s === 'f' || s === 'feminino') return 'F';
  return null;
}

// "Em que" + (ele | ela | nada) + "gastou". Sem genero conhecido, o sujeito some.
export function comSujeito(genero, antes, depois) {
  const p = genero === 'F' ? 'ela' : genero === 'M' ? 'ele' : null;
  return [antes, p, depois].filter(Boolean).join(' ');
}

// Eleito / Eleita / Eleito(a), quando o genero e desconhecido (mesma convencao do resto do site).
export function eleitoDe(genero) {
  return genero === 'F' ? 'Eleita' : genero === 'M' ? 'Eleito' : 'Eleito(a)';
}
