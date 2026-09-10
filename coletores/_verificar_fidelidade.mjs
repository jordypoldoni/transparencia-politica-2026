// _verificar_fidelidade.mjs — o resumo está mesmo no PDF?
// Verificação LEXICAL, sem IA e sem gastar token: para cada proposta do resumo, procura as
// palavras de conteúdo e os NÚMEROS dela dentro do texto extraído do PDF. Não prova que o
// sentido está certo (só um humano lendo prova isso), mas pega o que importa: proposta
// inventada, número que não existe no documento e sigla que o plano nunca citou.
//
//   node coletores/_verificar_fidelidade.mjs              (todos que já têm resumo)
//   node coletores/_verificar_fidelidade.mjs --so=LULA    (um só)
//   node coletores/_verificar_fidelidade.mjs --tudo       (lista TODAS as propostas, não só as suspeitas)

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import { PDFParse } from 'pdf-parse';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const SO = (process.argv.find((a) => a.startsWith('--so=')) || '').slice(5).toUpperCase();
const TUDO = process.argv.includes('--tudo');
const CORTE = 0.6; // menos de 60% das palavras encontradas = suspeita

const VAZIAS = new Set(['para','como','pelo','pela','pelos','pelas','com','sem','dos','das','nos','nas','que','uma','uns','umas','ser','mais','menos','entre','sobre','todos','todas','todo','toda','seus','suas','este','esta','esses','essas','aquele','aquela','ate','apos','pode','podem','deve','devem','sera','serao','tem','tera','terao','pais','nacional','nacionais','publico','publica','publicos','publicas','novo','nova','novos','novas','maior','melhor','geral','gerais']);

function normalizar(t) {
  return String(t).toLowerCase()
    .replace(/-\s*\n/g, '')            // palavra quebrada no fim da linha do PDF
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9%]+/g, ' ')
    .replace(/\s+/g, ' ').trim();
}

const args = process.argv.join(' ');
let q = supabase.from('candidatos_presidenciais')
  .select('nome_urna, proposta_pdf_url, resumo_proposta')
  .not('resumo_proposta', 'is', null).order('nome_urna');
if (SO) q = q.eq('nome_urna', SO);
const { data, error } = await q;
if (error) { console.error('Erro no Supabase:', error.message); process.exit(1); }
if (!data.length) { console.log('Nenhum candidato com resumo.'); process.exit(0); }

let totalPontos = 0, totalSuspeitos = 0, totalNumeros = 0;

for (const c of data) {
  let texto = '';
  try {
    const r = await fetch(c.proposta_pdf_url);
    const parser = new PDFParse({ data: Buffer.from(await r.arrayBuffer()) });
    try { texto = normalizar((await parser.getText()).text || ''); } finally { await parser.destroy(); }
  } catch (e) {
    console.log(`\n${c.nome_urna}: ERRO ao ler o PDF (${e.message})`);
    continue;
  }

  const suspeitos = [];
  let n = 0;
  for (const tema of c.resumo_proposta) {
    for (const ponto of tema.pontos || []) {
      n++;
      const palavras = [...new Set(normalizar(ponto).split(' ').filter((w) => w.length > 4 && !VAZIAS.has(w)))];
      if (!palavras.length) continue;
      const achadas = palavras.filter((w) => texto.includes(w));
      const nota = achadas.length / palavras.length;

      // números e percentuais citados na proposta que NÃO aparecem no documento
      const numeros = [...new Set((normalizar(ponto).match(/\b\d+(?:%)?\b/g) || []))]
        .filter((x) => x.length > 1 && !texto.includes(x));

      if (nota < CORTE || numeros.length || TUDO) {
        suspeitos.push({ tema: tema.tema, ponto, nota, faltando: palavras.filter((w) => !texto.includes(w)), numeros });
      }
    }
  }

  totalPontos += n;
  const realmenteSuspeitos = suspeitos.filter((s) => s.nota < CORTE || s.numeros.length);
  totalSuspeitos += realmenteSuspeitos.filter((s) => s.nota < CORTE).length;
  totalNumeros += realmenteSuspeitos.filter((s) => s.numeros.length).length;

  const marca = realmenteSuspeitos.length === 0 ? 'OK' : `${realmenteSuspeitos.length} a conferir`;
  console.log(`\n${'='.repeat(70)}\n${c.nome_urna} — ${n} propostas — ${marca}`);
  for (const s of (TUDO ? suspeitos : realmenteSuspeitos)) {
    console.log(`\n  [${s.tema}] ${(s.nota * 100).toFixed(0)}% das palavras no documento`);
    console.log(`  "${s.ponto}"`);
    if (s.numeros.length) console.log(`  ⚠️  NÚMERO que não existe no PDF: ${s.numeros.join(', ')}`);
    if (s.faltando.length && s.nota < CORTE) console.log(`  palavras não encontradas: ${s.faltando.slice(0, 8).join(', ')}`);
  }
}

console.log(`\n${'='.repeat(70)}`);
console.log(`${totalPontos} propostas verificadas`);
console.log(`${totalSuspeitos} com menos de ${CORTE * 100}% das palavras no documento`);
console.log(`${totalNumeros} citando número que não aparece no PDF`);
console.log(`\nNota: o verificador é lexical. Palavra não encontrada pode ser sinônimo legítimo do`);
console.log(`modelo, e número ausente pode ser conta feita a partir de outros. O que ele entrega é`);
console.log(`a lista curta do que MERECE leitura humana, não um veredito.`);
