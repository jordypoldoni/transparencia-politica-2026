// Fotos e fichas de candidatos a governador e senador 2026 (31/10/2026), para a home mostrar o rosto dos eleitos.
// GET /api/fotos-candidatos?cargo=governador|senador[&uf=RS]. As fotos já estão no Storage do Banco 1
// (governadores-candidatos-fotos, senadores-candidatos-fotos); aqui só se liga número do candidato -> foto e ficha.
// Cache de borda de 1 hora: os dados de candidatura quase não mudam.
import ServicoAPI from '../../src/servicos/servico_api';
import { UFS } from '../../src/lib/apuracaoTse';
import supabase from '../../src/supabase_cliente.js';
import { buscarTudo } from '../../src/lib/paginar.js';
import { chaveNomeNascimento, cargoAtualDoCandidato } from '../../src/lib/cargoAtual';

async function cargoAtualPorCandidato(cargo, uf) {
  const mapa = new Map();
  try {
    const tabela = cargo === 'governador' ? 'candidatos_governador' : 'candidatos_senador';
    let q = supabase.from(tabela).select('id, agente_id, nome_completo, data_nascimento, genero, partido_sigla').eq('ano_eleicao', 2026).eq('oculta', false);
    if (uf) q = q.eq('uf', uf);
    const [{ data: cands, error }, agentes] = await Promise.all([
      q.range(0, 399),
      buscarTudo(() => supabase.from('agentes_politicos').select('id, nome_completo, data_nascimento, cargo_atual, partido_atual, em_exercicio, sexo')),
    ]);
    if (error) throw new Error(error.message);
    const porId = new Map(); const porNome = new Map();
    for (const a of agentes || []) { porId.set(a.id, a); const k = chaveNomeNascimento(a.nome_completo, a.data_nascimento); if (k && !porNome.has(k)) porNome.set(k, a); }
    for (const c of cands || []) { const a = cargoAtualDoCandidato(c, porId, porNome); if (a) mapa.set(c.id, a); }
  } catch (e) { console.error('cargoAtualPorCandidato:', e.message); }
  return mapa;
}

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ erro: 'use GET' });
  const cargo = String(req.query.cargo || '');
  const uf = String(req.query.uf || '').toUpperCase();
  if (cargo !== 'governador' && cargo !== 'senador') return res.status(400).json({ erro: 'cargo inválido' });
  if (uf && !UFS.includes(uf)) return res.status(400).json({ erro: 'uf inválida' });
  try {
    const listar = cargo === 'governador' ? ServicoAPI.listarCandidatosGovernador : ServicoAPI.listarCandidatosSenador;
    const r = await listar({ ano: 2026, uf: uf || null, pagina: 1, porPagina: 400 });
    // Cargo atual (02/11/2026): liga o candidato ao parlamentar (por agente_id ou por nome completo + nascimento). Se falhar, segue sem.
    const atuais = await cargoAtualPorCandidato(cargo, uf);
    const itens = (r.itens || []).map((d) => ({ uf: d.uf, numero: String(d.nr_candidato || ''), foto: d.foto_url || null, slug: d.slug || null, atual: atuais.get(d.id) || null }));
    res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400');
    return res.status(200).json({ itens });
  } catch (e) {
    console.error('fotos-candidatos:', e.message);
    res.setHeader('Cache-Control', 'public, s-maxage=10');
    return res.status(200).json({ itens: [] });
  }
}
