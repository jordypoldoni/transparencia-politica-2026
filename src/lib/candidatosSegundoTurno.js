// CANDIDATOS DO 2º TURNO (11/10/2026): o que a aba Candidatos mostra em ?turno=2. Só quem foi ao 2º turno:
// presidente (2 chapas) e governador (2 por estado, nos estados de ./turnos.js). Quem é finalista vem de
// ./finalistasTurno2.js (TSE, com verificação automática); aqui só se cruza essa lista com o nosso banco.
//
// As funções puras (cargoDoSegundoTurno, chapasFinalistas, governadoresFinalistas) não tocam banco nem rede,
// para serem testadas isoladas. `carregarSegundoTurno` é a que o getServerSideProps chama.
import { SEGUNDO_TURNO } from './turnos';
import { finalistasSegundoTurno } from './finalistasTurno2';

// No 2º turno só existem presidente e governador; qualquer outro cargo abre em presidente.
export const cargoDoSegundoTurno = (cargo) => (SEGUNDO_TURNO.cargos.includes(cargo) ? cargo : 'presidente');

// Chapas do banco cujo presidente é finalista (casa pelo sq_candidato do TSE: o número da urna não basta,
// o 28 do PRTB tem duas chapas). `semCadastro` conta finalistas que o site ainda não tem.
export function chapasFinalistas(chapas, finalistas) {
  const sqs = new Set((finalistas || []).map((f) => f.sq).filter(Boolean));
  const itens = (chapas || []).filter((c) => c && c.presidente && sqs.has(String(c.presidente.sq_candidato)));
  return { itens, semCadastro: Math.max(0, (finalistas || []).length - itens.length) };
}

// Governadores do banco que são finalistas, por UF (casa por UF + número da urna, único dentro do estado).
// `itensPorUf`: { AC: [candidato do banco...] }; `finalistasPorUf`: { AC: [{numero...}] | null }.
export function governadoresFinalistas(itensPorUf, finalistasPorUf) {
  return SEGUNDO_TURNO.ufs.map((uf) => {
    const fin = (finalistasPorUf || {})[uf];
    if (!fin) return { uf, itens: [], esperados: 0, falhou: true, semCadastro: 0 };
    const numeros = new Set(fin.map((f) => String(f.numero)));
    const itens = ((itensPorUf || {})[uf] || []).filter((c) => numeros.has(String(c.nr_candidato)));
    return { uf, itens, esperados: fin.length, falhou: false, semCadastro: Math.max(0, fin.length - itens.length) };
  });
}

// Props da página no 2º turno. `deps` existe para teste; em produção usa o banco e o TSE.
export async function carregarSegundoTurno(cargoPedido, deps = {}) {
  const cargo = cargoDoSegundoTurno(cargoPedido);
  const base = { turno: 2, cargo, chapas: [], governadores: [], semCadastro: 0, erro: null, totalGovernador: null };
  let finalistas = null;
  try { finalistas = await (deps.finalistas || finalistasSegundoTurno)(); } catch (e) { finalistas = null; }
  // 12/10/2026: a contagem da aba "Governador" sai da lista de finalistas do TSE, que já está carregada, e vale
  // em qualquer aba. Antes ela era somada dos cards carregados, que só existem na aba Governador: na aba
  // Presidente aparecia "(0)".
  if (finalistas && finalistas.governador) base.totalGovernador = Object.values(finalistas.governador).reduce((n, f) => n + (Array.isArray(f) ? f.length : 0), 0);

  const servico = deps.servico || (await import('../servicos/servico_api')).default;
  if (cargo === 'presidente') {
    if (!finalistas || !finalistas.presidente) return { ...base, erro: 'tse' };
    const todas = await servico.listarPresidenciaveis(2026).catch(() => []);
    const r = chapasFinalistas(todas, finalistas.presidente);
    return JSON.parse(JSON.stringify({ ...base, chapas: r.itens, semCadastro: r.semCadastro }));
  }
  if (!finalistas) return { ...base, erro: 'tse' };
  const itensPorUf = {};
  await Promise.all(SEGUNDO_TURNO.ufs.map(async (uf) => {
    if (!finalistas.governador[uf]) return;
    const r = await servico.listarCandidatosGovernador({ ano: 2026, uf, porPagina: 50 }).catch(() => ({ itens: [] }));
    itensPorUf[uf] = r.itens || [];
  }));
  return JSON.parse(JSON.stringify({ ...base, governadores: governadoresFinalistas(itensPorUf, finalistas.governador) }));
}
