// Rehospeda as fotos dos deputados da ALESP no Supabase Storage (bucket "deputados"),
// redimensionando para um avatar leve. Atualiza agentes_politicos.foto_url para a URL do Storage.
//
// Pré-requisito: npm install sharp
// Uso: node coletores/rehospedar_fotos_alesp.js
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import sharp from 'sharp';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SUPABASE_KEY) { console.error('Faltam SUPABASE_URL / SERVICE_ROLE_KEY.'); process.exit(1); }

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const FOTO_BASE = 'https://www3.al.sp.gov.br/legis/biografia/fotos';
const BUCKET = 'deputados';
const TAM = 320;        // lado do avatar quadrado (px)
const QUALIDADE = 80;   // qualidade JPEG

// Descobre a foto mais recente do deputado lendo a listagem de diretório (índice Apache).
async function fonteFoto(matricula) {
  if (!matricula) return null;
  const dir = `${FOTO_BASE}/${matricula}/`;
  const ctrl = new AbortController();
  const to = setTimeout(() => ctrl.abort(), 20000);
  try {
    const res = await fetch(dir, { signal: ctrl.signal, headers: { 'User-Agent': 'Mozilla/5.0' } });
    if (!res.ok) return null;
    const html = Buffer.from(await res.arrayBuffer()).toString('latin1');
    const re = /<a href="([^"]+\.(?:jpe?g|png))">[^<]*<\/a>\s+(\d{4}-\d{2}-\d{2} \d{2}:\d{2})/gi;
    let m, melhor = null;
    while ((m = re.exec(html)) !== null) {
      if (/^index|favicon/i.test(m[1])) continue;
      if (!melhor || m[2] > melhor.data) melhor = { arquivo: m[1], data: m[2] };
    }
    return melhor ? dir + melhor.arquivo : null;
  } catch { return null; }
  finally { clearTimeout(to); }
}

async function baixar(url) {
  const ctrl = new AbortController();
  const to = setTimeout(() => ctrl.abort(), 30000);
  try {
    const res = await fetch(url, { signal: ctrl.signal, headers: { 'User-Agent': 'Mozilla/5.0' } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return Buffer.from(await res.arrayBuffer());
  } finally { clearTimeout(to); }
}

async function main() {
  console.log('📸 Rehospedando fotos da ALESP no Supabase Storage…');
  const { data: ags, error } = await supabase
    .from('agentes_politicos')
    .select('id, id_externo_api, nome_urna')
    .eq('fonte_api', 'alesp')
    .order('nome_urna');
  if (error) throw error;
  console.log(`${ags.length} deputados na base.`);

  let ok = 0, semFoto = 0, erros = 0;
  for (const a of ags) {
    const mat = String(a.id_externo_api || '').trim();
    try {
      const src = await fonteFoto(mat);
      if (!src) { semFoto++; continue; }

      const original = await baixar(src);
      const avatar = await sharp(original)
        .rotate() // respeita orientação EXIF
        .resize(TAM, TAM, { fit: 'cover', position: sharp.strategy.attention })
        .jpeg({ quality: QUALIDADE, mozjpeg: true })
        .toBuffer();

      const caminho = `sp/${mat}.jpg`;
      const { error: upErr } = await supabase.storage.from(BUCKET)
        .upload(caminho, avatar, { contentType: 'image/jpeg', upsert: true });
      if (upErr) throw upErr;

      const publica = `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${caminho}`;
      const { error: updErr } = await supabase.from('agentes_politicos').update({ foto_url: publica }).eq('id', a.id);
      if (updErr) throw updErr;

      const kb = (avatar.length / 1024).toFixed(0);
      console.log(`  ✅ ${a.nome_urna} (${mat}) → ${kb} KB`);
      ok++;
    } catch (e) {
      console.warn(`  ⚠️  ${a.nome_urna} (${mat}): ${e.message}`);
      erros++;
    }
  }
  console.log(`\n🏁 Rehospedadas: ${ok} · sem foto na origem: ${semFoto} · erros: ${erros}`);
}

main().catch((e) => { console.error('ERRO:', e.message); process.exit(1); });
