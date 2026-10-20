// Rota de foto para o card de cobrança (20/10/2026). GET /api/foto?u=<endereço da foto>
// Por quê: a Câmara, o Senado e as assembleias não liberam a imagem para o canvas de outro site (CORS), e
// sem canvas não há card com foto. O servidor busca a imagem e devolve do mesmo endereço do site.
// SEGURANÇA: só responde para endereços https de uma lista fechada (as origens de foto que o Lume já usa);
// qualquer outro endereço é recusado, o que impede usar a rota para chegar a servidores internos (SSRF).
// Só devolve se a resposta for imagem e tiver até 3 MB.
const PERMITIDOS = new Set([
  'www.camara.leg.br',
  'www.senado.leg.br',
  'www.almg.gov.br',
  'ww2.al.rs.gov.br',
  'fedxytdorrecllugnicu.supabase.co',
  'divulgacandcontas.tse.jus.br',
]);
const MAX_BYTES = 3 * 1024 * 1024;

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();
  let alvo;
  try { alvo = new URL(String(req.query.u || '')); } catch { return res.status(400).end(); }
  if (alvo.protocol !== 'https:' || alvo.username || alvo.password || alvo.port || !PERMITIDOS.has(alvo.hostname)) return res.status(400).end();
  try {
    const r = await fetch(alvo.toString(), { redirect: 'error', signal: AbortSignal.timeout(6000), headers: { 'user-agent': 'LumeCidadao/1.0 (+https://www.lumecidadao.com.br)' } });
    const tipo = r.headers.get('content-type') || '';
    if (!r.ok || !/^image\/(jpeg|png|webp|gif)/i.test(tipo)) return res.status(404).end();
    const buf = Buffer.from(await r.arrayBuffer());
    if (buf.length > MAX_BYTES) return res.status(413).end();
    res.setHeader('Content-Type', tipo.split(';')[0]);
    res.setHeader('Cache-Control', 'public, max-age=86400, s-maxage=604800, immutable');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    return res.status(200).send(buf);
  } catch {
    return res.status(404).end();
  }
}
