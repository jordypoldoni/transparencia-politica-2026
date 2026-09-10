// _medir_pdfs.mjs — só mede. Não chama IA, não escreve no banco.
// Baixa cada PDF de proposta, extrai o texto e mostra quantos caracteres tem,
// para dimensionar o tamanho do bloco e o custo em tokens antes de rodar o resumo.
//   node coletores/_medir_pdfs.mjs

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import { PDFParse } from 'pdf-parse';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const BLOCO = 12000; // caracteres por bloco na estratégia nova

const { data, error } = await supabase
  .from('candidatos_presidenciais')
  .select('nome_urna, proposta_pdf_url')
  .not('proposta_pdf_url', 'is', null)
  .order('nome_urna');

if (error) { console.error('Erro no Supabase:', error.message); process.exit(1); }

let totalChars = 0, totalBlocos = 0;

for (const c of data) {
  try {
    const r = await fetch(c.proposta_pdf_url);
    if (!r.ok) throw new Error('HTTP ' + r.status);
    const parser = new PDFParse({ data: Buffer.from(await r.arrayBuffer()) });
    let texto = '', paginas = 0;
    try {
      const out = await parser.getText();
      texto = (out.text || '').trim();
      paginas = out.pages?.length ?? out.total ?? 0;
    } finally { await parser.destroy(); }

    const chars = texto.length;
    const blocos = Math.max(1, Math.ceil(chars / BLOCO));
    totalChars += chars; totalBlocos += blocos;
    const aviso = chars < 2000 ? '  <-- POUCO TEXTO (PDF escaneado/imagem?)' : '';
    console.log(`${c.nome_urna.padEnd(28)} ${String(chars).padStart(8)} chars  ${String(paginas).padStart(4)} pag  ${String(blocos).padStart(3)} blocos${aviso}`);
  } catch (e) {
    console.log(`${c.nome_urna.padEnd(28)} ERRO: ${e.message}`);
  }
}

const tokensEstimados = (totalBlocos + data.length) * 4000; // blocos + 1 fusao por candidato
console.log('\n----------------------------------------------');
console.log(`Total: ${totalChars} caracteres, ${totalBlocos} blocos de ${BLOCO}`);
console.log(`Chamadas estimadas: ${totalBlocos} + ${data.length} fusoes = ${totalBlocos + data.length}`);
console.log(`Tokens estimados: ~${tokensEstimados.toLocaleString('pt-BR')}  (teto diario da Groq free: 200.000)`);
console.log(tokensEstimados > 200000 ? 'NAO cabe numa rodada so.' : 'Cabe numa rodada so.');
