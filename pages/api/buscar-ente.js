// Busca de entes por nome (autocomplete de município na home).
// Server-side (usa service_role via ServicoAPI). GET /api/buscar-ente?q=...
import ServicoAPI from '../../src/servicos/servico_api';

export default async function handler(req, res) {
  const q = req.query.q || '';
  try {
    const itens = await ServicoAPI.buscarEntesFiscais(q, 20);
    res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate');
    res.status(200).json(itens);
  } catch (e) {
    console.error('buscar-ente:', e.message);
    res.status(200).json([]);
  }
}
