// Candidatos a Deputado ESTADUAL 2026, lidos do TSE NA HORA. (25/09/2026)
// GET /api/candidatos-deputado-estadual?uf=RS&busca=&pagina=
//
// Mesmo contrato das rotas dos outros cargos ({ itens, total }), para a página /candidatos-2026
// tratar a aba igual. A diferença é a origem: nada disto está no banco. A regra toda mora em
// src/lib/candidatosEstaduais.js, que o getServerSideProps da página também usa.
import { listarCandidatosEstaduais } from '../../src/lib/candidatosEstaduais';

const PORPAGINA = 25; // 5 colunas x 5 linhas, o mesmo número da página

export default async function handler(req, res) {
  try {
    const dados = await listarCandidatosEstaduais({
      uf: req.query.uf,
      busca: req.query.busca,
      pagina: parseInt(req.query.pagina, 10) || 1,
      porPagina: PORPAGINA,
    });
    // Borda da Vercel: 30 min servindo pronto, e até um dia servindo o antigo enquanto renova.
    if (!dados.precisaUf) res.setHeader('Cache-Control', 's-maxage=1800, stale-while-revalidate=86400');
    return res.status(200).json(dados);
  } catch (e) {
    console.error('candidatos-deputado-estadual:', e.message);
    // Falha da fonte não vira "zero candidatos": a página precisa saber que foi erro.
    return res.status(502).json({ itens: [], total: 0, erro: 'Não foi possível consultar o TSE agora. Tente de novo em alguns minutos.' });
  }
}
