// CARGO ATUAL DO CANDIDATO (02/11/2026). Os cartões da home mostram "Atualmente é deputado federal pelo PL"
// no lugar do cargo que a pessoa ganhou agora (governador/senador). Só se afirma o que o banco sabe:
// candidato ligado a um parlamentar de agentes_politicos, sem marca de "fora de exercício". Sem isso, a home mostra só o partido.

const semAcento = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().replace(/\s+/g, ' ').trim();

// Chave para casar candidato com parlamentar quando agente_id está vazio: nome completo sem acento + data de nascimento.
export const chaveNomeNascimento = (nomeCompleto, nascimento) => {
  const n = semAcento(nomeCompleto);
  const d = String(nascimento || '').slice(0, 10);
  return n && /^\d{4}-\d{2}-\d{2}$/.test(d) ? `${n}|${d}` : null;
};

// ('Deputado Federal', false, 'FEM.') -> 'deputada federal'. Retorna null quando não dá para afirmar.
export function cargoAtualTexto(cargoAtual, emExercicio, genero) {
  if (emExercicio === false) return null;
  const fem = /^F/i.test(String(genero || ''));
  const c = semAcento(cargoAtual);
  if (c === 'DEPUTADO FEDERAL') return fem ? 'deputada federal' : 'deputado federal';
  if (c === 'DEPUTADO ESTADUAL') return fem ? 'deputada estadual' : 'deputado estadual';
  if (c === 'SENADOR' || c === 'SENADOR(A)') return fem ? 'senadora' : 'senador';
  return null;
}

// Monta { cargo, partido } de um candidato a partir dos parlamentares. porId: Map id -> agente; porNome: Map chave -> agente.
export function cargoAtualDoCandidato(cand, porId, porNome) {
  const ag = (cand.agente_id != null && porId.get(cand.agente_id))
    || porNome.get(chaveNomeNascimento(cand.nome_completo, cand.data_nascimento)) || null;
  if (!ag) return null;
  const cargo = cargoAtualTexto(ag.cargo_atual, ag.em_exercicio, cand.genero || ag.sexo);
  if (!cargo) return null;
  return { cargo, partido: String(ag.partido_atual || cand.partido_sigla || '').trim() || null };
}

// Linha de baixo do nome no cartão da home.
export function linhaAtual(atual, partido) {
  if (atual && atual.cargo) return atual.partido ? `Atualmente é ${atual.cargo} pelo ${atual.partido}` : `Atualmente é ${atual.cargo}`;
  return partido || '';
}
