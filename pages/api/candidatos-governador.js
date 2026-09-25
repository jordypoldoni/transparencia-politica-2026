// Busca de candidatos a Governador 2026. GET /api/candidatos-governador?uf=&busca=&pagina=
// Mesmo padrão de /api/candidatos-senador. (24/09/2026)
import ServicoAPI from '../../src/servicos/servico_api';

const PORPAGINA = 25; // igual à página /candidatos-2026 (5x5). Era 24: a 1ª página vinha com 25 do servidor e as seguintes pulavam/repetiam itens.

export default async function handler(req, res) {
  const { uf, busca, pagina } = req.query;
  try {
    const dados = await ServicoAPI.listarCandidatosGovernador({
      ano: 2026,
      uf: uf ? String(uf).toUpperCase().slice(0, 2) : null,
      busca: busca ? String(busca).slice(0, 80) : null,
      pagina: Math.max(1, parseInt(pagina, 10) || 1),
      porPagina: PORPAGINA,
    });
    res.status(200).json(dados);
  } catch (e) {
    console.error('candidatos-governador:', e.message);
    res.status(200).json({ itens: [], total: 0 });
  }
}
