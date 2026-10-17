// Qual linha de fonte_status cada tela deve mostrar (T10 / D-036). A regra mora aqui, uma vez so:
// o nome da fonte e o escopo tem de ser os mesmos que o coletor passa a registrarStatus().
import { casaDoPerfil } from './casa';

// Gastos (cota parlamentar / verba de gabinete) do parlamentar. null = sem coleta registrada.
export function fonteGastosDoPerfil(perfil) {
  const c = casaDoPerfil(perfil);
  if (c.ehSenado) return { fonte: 'gastos_senado' };
  if (c.ehAlergs) return { fonte: 'gastos_alergs', escopo: 'RS', mensal: true };
  if (c.ehAlesp) return { fonte: 'gastos_alesp', escopo: 'SP', mensal: true };
  if (c.ehAlmg) return { fonte: 'gastos_almg', escopo: 'MG' };
  if (c.ehEstadual) return null;
  return { fonte: 'gastos_camara' };
}

// Votos em plenario do parlamentar. SP e MG ainda nao tem coleta de votos.
export function fonteVotosDoPerfil(perfil) {
  const c = casaDoPerfil(perfil);
  if (c.ehSenado) return { fonte: 'votos_senado' };
  if (c.ehAlergs) return { fonte: 'votos_alergs', escopo: 'RS' };
  if (c.ehEstadual) return null;
  return { fonte: 'votos_camara' };
}

// Gastos por UF (rankings): 'RS' | 'SP' | 'MG' | outras. Federal e Senado nao dependem de UF.
export function fonteGastosEstadual(uf) {
  const u = String(uf || '').toUpperCase();
  if (u === 'RS') return { fonte: 'gastos_alergs', escopo: 'RS', mensal: true };
  if (u === 'SP') return { fonte: 'gastos_alesp', escopo: 'SP', mensal: true };
  if (u === 'MG') return { fonte: 'gastos_almg', escopo: 'MG' };
  return null;
}

// Fichas e listas de candidatos 2026 por cargo (tipo 'ficha': "Ficha atualizada em ..."). Candidato a
// deputado estadual vem ao vivo do TSE, sem tabela: o selo diz isso. null = sem selo.
export function seloDoCargoCandidato(cargo) {
  switch (cargo) {
    case 'presidente': return { fonte: 'ficha_presidenciaveis', tipo: 'ficha' };
    case 'governador': return { fonte: 'candidatos_governador', tipo: 'ficha' };
    case 'senador': return { fonte: 'candidatos_senador', tipo: 'ficha' };
    case 'deputado-federal': return { fonte: 'ficha_deputado_federal', tipo: 'ficha' };
    case 'deputado-estadual': return { aoVivo: true, rotulo: 'Lista lida ao vivo do TSE, no momento em que você abre a página.' };
    default: return null;
  }
}
