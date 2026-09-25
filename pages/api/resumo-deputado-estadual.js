// Quantos candidatos a Deputado Estadual 2026 há no país e em cada estado. (25/09/2026)
// GET /api/resumo-deputado-estadual → { total, porUf, completo }
//
// Buscado pelo navegador DEPOIS de a página abrir, e não no servidor: contar exige as 26 listas
// do TSE, e a página não pode esperar isso. Guardado um dia na borda da Vercel e na memória.
// Com algum estado fora do ar, total vem null e a aba fica sem número (em vez de um número errado).
import { resumoCandidatosEstaduais } from '../../src/lib/candidatosEstaduais';

export default async function handler(req, res) {
  try {
    const dados = await resumoCandidatosEstaduais();
    if (dados.completo) res.setHeader('Cache-Control', 's-maxage=86400, stale-while-revalidate=86400');
    return res.status(200).json({ total: dados.total, porUf: dados.porUf, completo: dados.completo });
  } catch (e) {
    console.error('resumo-deputado-estadual:', e.message);
    return res.status(200).json({ total: null, porUf: {}, completo: false });
  }
}
