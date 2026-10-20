// Rota de foto para o card de cobrança (20/10/2026). GET /api/foto?u=<endereço da foto>
// Por quê: a Câmara, o Senado e as assembleias não liberam a imagem para o canvas de outro site (CORS), e
// sem canvas não há card com foto. O servidor busca a imagem e devolve do mesmo endereço do site.
// SEGURANÇA: só responde para endereços https de uma lista fechada (as origens de foto que o Lume já usa);
// qualquer outro endereço é recusado, o que impede usar a rota para chegar a servidores internos (SSRF).
// Só devolve se a resposta for imagem e tiver até 3 MB.
const PERMITIDOS = new Set([
  'www.camara.leg.br',
  'www.senado.leg.br',
  'legis.senado.leg.br', // o Senado redireciona www.senado.leg.br/senadores/img/... para ca
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
  // O banco guarda parte das fotos em http:// (Senado, por exemplo). Para endereço da lista, sobe para https.
  if (alvo.protocol === 'http:' && PERMITIDOS.has(alvo.hostname) && !alvo.port) alvo.protocol = 'https:';
  if (alvo.protocol !== 'https:' || alvo.username || alvo.password || alvo.port || !PERMITIDOS.has(alvo.hostname)) return res.status(400).end();
  try {
    // Redirecionamento só para outro endereço da mesma lista (até 3 saltos).
    let atual = alvo.toString();
    let r;
    for (let salto = 0; salto < 4; salto++) {
      r = await fetch(atual, { redirect: 'manual', signal: AbortSignal.timeout(6000), headers: { 'user-agent': 'LumeCidadao/1.0 (+https://www.lumecidadao.com.br)' } });
      if (r.status < 300 || r.status >= 400) break;
      let prox;
      try { prox = new URL(r.headers.get('location') || '', atual); } catch { return res.status(404).end(); }
      if (prox.protocol === 'http:' && PERMITIDOS.has(prox.hostname) && !prox.port) prox.protocol = 'https:';
      if (prox.protocol !== 'https:' || prox.port || !PERMITIDOS.has(prox.hostname)) {
        res.setHeader('X-Foto-Motivo', `redirecionou ${r.status} para ${prox.protocol}//${prox.hostname}${prox.port ? ':' + prox.port : ''}`.slice(0, 120));
        return res.status(404).end();
      }
      atual = prox.toString();
    }
    const tipo = r.headers.get('content-type') || '';
    if (!r.ok || !/^image\/(jpeg|png|webp|gif)/i.test(tipo)) {
      res.setHeader('X-Foto-Motivo', `origem ${r.status} ${tipo}`.slice(0, 120));
      return res.status(404).end();
    }
    const buf = Buffer.from(await r.arrayBuffer());
    if (buf.length > MAX_BYTES) return res.status(413).end();
    res.setHeader('Content-Type', tipo.split(';')[0]);
    res.setHeader('Cache-Control', 'public, max-age=86400, s-maxage=604800, immutable');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    return res.status(200).send(buf);
  } catch (e) {
    res.setHeader('X-Foto-Motivo', `erro ${String((e && (e.cause && e.cause.code || e.name)) || 'desconhecido')}`.slice(0, 120));
    return res.status(404).end();
  }
}
