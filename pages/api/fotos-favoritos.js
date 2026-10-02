// Fotos que faltam nos FAVORITOS. POST /api/fotos-favoritos  { chaves: ['/candidato-senador/...', ...] }
// (02/10/2026) Favoritos marcados antes de 01/10 foram guardados sem foto, e o banco 1 só é lido pelo
// servidor. A tela "Seus favoritos" manda os endereços (chaves) dos que estão sem foto e recebe
// { '/candidato-senador/x': 'https://...' }. Só devolve foto que o site já publica nas fichas.
import supabase from '../../src/supabase_cliente.js';
import { fotoTse } from '../../src/lib/tseAoVivo';
import { ID_ELEICAO_ESTADUAL } from '../../src/lib/candidatosEstaduais';

const MAX = 40;
// Rota da ficha -> tabela do banco 1. Estadual não tem tabela: a foto é montada pelo endereço do TSE.
const TABELA = {
  'candidato-senador': 'candidatos_senador',
  'candidato-governador': 'candidatos_governador',
  'deputado-federal': 'candidatos_deputado_federal',
  presidencial: 'candidatos_presidenciais',
  senador: 'agentes_politicos',
  deputado: 'agentes_politicos',
};

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({});
  const lista = Array.isArray(req.body?.chaves) ? req.body.chaves.slice(0, MAX) : [];
  const saida = {};
  const porTabela = {}; // tabela -> Map(slug -> chave)
  for (const chave of lista) {
    const m = /^\/([a-z-]+)\/([a-z0-9-]{1,160})$/.exec(String(chave));
    if (!m) continue;
    const [, rota, slug] = m;
    if (rota === 'candidato-estadual') {
      const e = /-(\d{9,15})-([a-z]{2})$/.exec(slug);
      if (e) saida[chave] = fotoTse(ID_ELEICAO_ESTADUAL, e[1], e[2]);
      continue;
    }
    const tabela = TABELA[rota];
    if (!tabela) continue;
    (porTabela[tabela] = porTabela[tabela] || new Map()).set(slug, chave);
  }
  await Promise.all(Object.entries(porTabela).map(async ([tabela, mapa]) => {
    const { data, error } = await supabase.from(tabela).select('slug, foto_url').in('slug', [...mapa.keys()]);
    if (error) { console.error('fotos-favoritos', tabela, error.message); return; }
    for (const r of data || []) if (r.foto_url && mapa.has(r.slug)) saida[mapa.get(r.slug)] = r.foto_url;
  }));
  res.setHeader('Cache-Control', 'no-store');
  res.status(200).json(saida);
}
