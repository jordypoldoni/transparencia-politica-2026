// Quem propôs a matéria de uma votação: rótulo do cargo e escolha do perfil (07/11/2026).
//
// O banco guarda só autor_nome e autor_tipo ("Deputado(a)"), e isso não diz se o autor é federal
// ou estadual. Quem diz é a CASA da votação: o plenário da Câmara dos Deputados só recebe autor
// federal, o da Assembleia Legislativa do RS só estadual. Por isso o cargo vem do perfil achado
// ou, sem perfil, da casa.

const CARGO_DA_CASA = { camara: 'Deputado Federal', rs: 'Deputado Estadual' };

export function cargoProcurado(casaChave) {
  return CARGO_DA_CASA[casaChave] || null;
}

export function rotuloCargoAutor(agente, casaChave) {
  const cargo = String((agente && agente.cargo_atual) || cargoProcurado(casaChave) || '').toLowerCase();
  const fem = agente && agente.sexo === 'F';
  if (cargo.includes('federal')) return fem ? 'Deputada federal' : 'Deputado federal';
  if (cargo.includes('estadual')) return fem ? 'Deputada estadual' : 'Deputado estadual';
  if (cargo.startsWith('senador')) return fem ? 'Senadora' : 'Senador';
  return null;
}

// Só liga ao perfil quando há UMA pessoa com aquele nome no cargo certo. Duas pessoas com o
// mesmo nome levam à pessoa errada, e isso é pior que não ter link.
export function escolherPerfilUnico(candidatos) {
  const lista = Array.isArray(candidatos) ? candidatos.filter((c) => c && c.slug) : [];
  return lista.length === 1 ? lista[0] : null;
}
