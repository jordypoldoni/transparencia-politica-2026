// Busca de candidatos a Deputado Federal 2026 (autocomplete/paginação ao vivo).
// Server-side (usa service_role via ServicoAPI). GET /api/candidatos-deputado-federal?uf=&partido=&busca=&pagina=
// Existe porque são 7.703 candidatos — não dá pra carregar tudo no cliente e filtrar na hora
// como a página /deputados faz com os ~600 parlamentares eleitos. Mesmo padrão do
// /api/buscar-ente.js (usado pela busca de município): endpoint fino + fetch do componente.
import ServicoAPI from '../../src/servicos/servico_api';

const PORPAGINA = 24;

export default async function handler(req, res) {
  const { uf, partido, busca, pagina } = req.query;
  try {
    const dados = await ServicoAPI.listarCandidatosDeputadoFederal({
      ano: 2026,
      uf: uf ? String(uf).toUpperCase().slice(0, 2) : null,
      partido: partido ? String(partido).toUpperCase() : null,
      busca: busca ? String(busca).slice(0, 80) : null,
      pagina: Math.max(1, parseInt(pagina, 10) || 1),
      porPagina: PORPAGINA,
    });
    res.status(200).json(dados);
  } catch (e) {
    console.error('candidatos-deputado-federal:', e.message);
    res.status(200).json({ itens: [], total: 0 });
  }
}
