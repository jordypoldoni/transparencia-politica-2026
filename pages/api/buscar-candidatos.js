// Busca de candidatos 2026 para a home (31/10/2026). GET /api/buscar-candidatos?q=nome[&uf=RS]
// Procura em presidente, governador, senador e deputado federal do país e, com `uf`, em deputado estadual.
// Devolve { grupos:[{cargo,rotulo,hrefBase,total,itens}], estadual:bool }. Lógica em src/lib/buscaCandidatosHome.js.
import ServicoAPI from '../../src/servicos/servico_api';
import { listarCandidatosEstaduais, UFS_ESTADUAL } from '../../src/lib/candidatosEstaduais';
import { termoValido, filtrarPresidentes, montarGrupos, POR_CARGO } from '../../src/lib/buscaCandidatosHome';

const vazio = { itens: [], total: 0 };

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ erro: 'use GET' });
  const termo = termoValido(req.query.q);
  const uf = String(req.query.uf || '').toUpperCase();
  const estadual = UFS_ESTADUAL.includes(uf);
  if (!termo) return res.status(200).json({ grupos: [], estadual });
  try {
    const args = { ano: 2026, busca: termo, pagina: 1, porPagina: POR_CARGO };
    const [chapas, gov, sen, dep, est] = await Promise.all([
      ServicoAPI.listarPresidenciaveis(2026).catch(() => []),
      ServicoAPI.listarCandidatosGovernador(args).catch(() => vazio),
      ServicoAPI.listarCandidatosSenador(args).catch(() => vazio),
      ServicoAPI.listarCandidatosDeputadoFederal(args).catch(() => vazio),
      estadual ? listarCandidatosEstaduais({ uf, busca: termo, pagina: 1, porPagina: POR_CARGO }).catch(() => vazio) : Promise.resolve(vazio),
    ]);
    const pres = filtrarPresidentes(chapas, termo);
    const grupos = montarGrupos([
      { cargo: 'presidente', rotulo: 'Presidente', hrefBase: '/presidencial', total: pres.length, itens: pres },
      { cargo: 'governador', rotulo: 'Governador', hrefBase: '/candidato-governador', ...gov },
      { cargo: 'senador', rotulo: 'Senador', hrefBase: '/candidato-senador', ...sen },
      { cargo: 'deputado-federal', rotulo: 'Deputado Federal', hrefBase: '/deputado-federal', ...dep },
      { cargo: 'deputado-estadual', rotulo: 'Deputado Estadual', hrefBase: '/candidato-estadual', ...est },
    ]);
    res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300');
    return res.status(200).json({ grupos, estadual });
  } catch (e) {
    console.error('buscar-candidatos:', e.message);
    return res.status(200).json({ grupos: [], estadual, erro: true });
  }
}
