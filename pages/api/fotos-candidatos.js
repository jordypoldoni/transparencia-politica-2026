// Fotos e fichas de candidatos a governador e senador 2026 (31/10/2026), para a home mostrar o rosto dos eleitos.
// GET /api/fotos-candidatos?cargo=governador|senador[&uf=RS]. As fotos já estão no Storage do Banco 1
// (governadores-candidatos-fotos, senadores-candidatos-fotos); aqui só se liga número do candidato -> foto e ficha.
// Cache de borda de 1 hora: os dados de candidatura quase não mudam.
import ServicoAPI from '../../src/servicos/servico_api';
import { UFS } from '../../src/lib/apuracaoTse';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ erro: 'use GET' });
  const cargo = String(req.query.cargo || '');
  const uf = String(req.query.uf || '').toUpperCase();
  if (cargo !== 'governador' && cargo !== 'senador') return res.status(400).json({ erro: 'cargo inválido' });
  if (uf && !UFS.includes(uf)) return res.status(400).json({ erro: 'uf inválida' });
  try {
    const listar = cargo === 'governador' ? ServicoAPI.listarCandidatosGovernador : ServicoAPI.listarCandidatosSenador;
    const r = await listar({ ano: 2026, uf: uf || null, pagina: 1, porPagina: 400 });
    const itens = (r.itens || []).map((d) => ({ uf: d.uf, numero: String(d.nr_candidato || ''), foto: d.foto_url || null, slug: d.slug || null }));
    res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400');
    return res.status(200).json({ itens });
  } catch (e) {
    console.error('fotos-candidatos:', e.message);
    res.setHeader('Cache-Control', 'public, s-maxage=10');
    return res.status(200).json({ itens: [] });
  }
}
