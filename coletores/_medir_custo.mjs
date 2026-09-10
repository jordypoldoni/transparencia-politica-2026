// _medir_custo.mjs — mede o custo REAL antes de rodar tudo.
// Roda o resumo de verdade em 3 blocos (comeco, meio e fim de um plano longo)
// + 1 fusao, le o campo `usage` que a Groq devolve em cada resposta e extrapola
// para a rodada completa. Nao escreve nada no banco.
//   node coletores/_medir_custo.mjs
// Roda no FREE tier (gasto zero). As pausas existem so pra nao bater no limite
// de 8.000 tokens/min do free.

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import { PDFParse } from 'pdf-parse';

const MODELO = process.env.GROK_MODEL || 'openai/gpt-oss-120b';
const PRECO_ENTRADA = 0.15 / 1e6;  // USD por token
const PRECO_SAIDA   = 0.60 / 1e6;
const BLOCO = 12000;
const TOTAL_BLOCOS_PREVISTOS = 153; // do _medir_pdfs.mjs
const TOTAL_FUSOES_PREVISTAS = 12;
const PAUSA_MS = 35000; // free = 8.000 tokens/min; ~1 chamada a cada 35s e seguro
const CANDIDATO_AMOSTRA = 'LULA'; // plano de tamanho mediano entre os longos

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const groq = new OpenAI({ apiKey: process.env.GROK_API_KEY, baseURL: 'https://api.groq.com/openai/v1' });

const PROMPT_SISTEMA = `Você extrai o conteúdo de planos de governo eleitorais brasileiros de forma ESTRITAMENTE factual e neutra.
Este é UM TRECHO de um documento maior. Extraia apenas o que estiver neste trecho.
Regras (inegociáveis):
- NÃO opine, NÃO avalie viabilidade, NÃO elogie nem critique.
- NÃO compare com outros candidatos ou partidos.
- NÃO adicione nenhuma informação que não esteja explicitamente no texto fornecido.
- Se o trecho for vago ou genérico, resuma como vago/genérico — não invente detalhe.
- Se o trecho for só sumário, índice, capa ou agradecimento, devolva {"temas": []}.
- Organize por tema (os que o próprio trecho aborda: economia, saúde, educação, segurança, meio ambiente, etc.).
- Para cada tema, liste de 2 a 5 propostas ou metas concretas citadas, em frases curtas, fiéis à linguagem original.

Responda SEMPRE e SOMENTE com um objeto JSON válido, sem nenhum texto antes ou depois, neste formato exato:
{"temas": [{"tema": "Nome curto do tema", "pontos": ["proposta 1", "proposta 2"]}]}`;

const PROMPT_FUSAO = `Você recebe listas de temas e propostas extraídas de PARTES DIFERENTES do mesmo plano de governo.
Consolide tudo numa lista única.
Regras (inegociáveis):
- Junte temas equivalentes num só ("Saúde" e "Saúde Pública" viram "Saúde").
- Devolva entre 5 e 10 temas, os mais presentes no documento.
- Cada tema com 3 a 6 pontos, sem repetir a mesma proposta em pontos diferentes.
- NÃO invente nada que não esteja nas listas recebidas. NÃO opine, NÃO avalie, NÃO compare candidatos.

Responda SEMPRE e SOMENTE com um objeto JSON válido, sem nenhum texto antes ou depois:
{"temas":[{"tema":"...","pontos":["..."]}]}`;

const dormir = (ms) => new Promise((r) => setTimeout(r, ms));

const { data: c, error } = await supabase
  .from('candidatos_presidenciais')
  .select('nome_urna, proposta_pdf_url')
  .eq('nome_urna', CANDIDATO_AMOSTRA).single();
if (error) { console.error('Erro no Supabase:', error.message); process.exit(1); }

console.log(`Amostra: ${c.nome_urna} | modelo: ${MODELO}\n`);

const r = await fetch(c.proposta_pdf_url);
const parser = new PDFParse({ data: Buffer.from(await r.arrayBuffer()) });
let texto = '';
try { texto = ((await parser.getText()).text || '').trim(); } finally { await parser.destroy(); }

const nBlocos = Math.ceil(texto.length / BLOCO);
const indices = [0, Math.floor(nBlocos / 2), nBlocos - 1];
console.log(`Documento: ${texto.length} chars = ${nBlocos} blocos. Testando os blocos ${indices.join(', ')}.\n`);

let somaEntrada = 0, somaSaida = 0, somaRaciocinio = 0;
const parciais = [];

for (const i of indices) {
  const trecho = texto.slice(i * BLOCO, (i + 1) * BLOCO);
  const resp = await groq.chat.completions.create({
    model: MODELO, max_tokens: 3000, reasoning_effort: 'low', response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: PROMPT_SISTEMA },
      { role: 'user', content: `Trecho do plano de governo de ${c.nome_urna}:\n\n${trecho}` },
    ],
  });
  const u = resp.usage;
  const raciocinio = u.completion_tokens_details?.reasoning_tokens ?? 0;
  somaEntrada += u.prompt_tokens; somaSaida += u.completion_tokens; somaRaciocinio += raciocinio;
  let temas = [];
  try { temas = JSON.parse(resp.choices[0].message.content).temas ?? []; } catch {}
  parciais.push(temas);
  console.log(`  bloco ${String(i).padStart(2)}: entrada ${String(u.prompt_tokens).padStart(5)} | saida ${String(u.completion_tokens).padStart(5)} (raciocinio ${raciocinio}) | ${temas.length} tema(s)`);
  await dormir(PAUSA_MS);
}

const respF = await groq.chat.completions.create({
  model: MODELO, max_tokens: 3000, reasoning_effort: 'low', response_format: { type: 'json_object' },
  messages: [
    { role: 'system', content: PROMPT_FUSAO },
    { role: 'user', content: `Listas extraídas do plano de governo de ${c.nome_urna}:\n\n${JSON.stringify(parciais)}` },
  ],
});
const uF = respF.usage;
console.log(`  fusao   : entrada ${String(uF.prompt_tokens).padStart(5)} | saida ${String(uF.completion_tokens).padStart(5)} (raciocinio ${uF.completion_tokens_details?.reasoning_tokens ?? 0})`);

const mediaEntrada = somaEntrada / indices.length;
const mediaSaida = somaSaida / indices.length;
const entradaTotal = mediaEntrada * TOTAL_BLOCOS_PREVISTOS + uF.prompt_tokens * TOTAL_FUSOES_PREVISTAS;
const saidaTotal = mediaSaida * TOTAL_BLOCOS_PREVISTOS + uF.completion_tokens * TOTAL_FUSOES_PREVISTAS;
const custo = entradaTotal * PRECO_ENTRADA + saidaTotal * PRECO_SAIDA;

console.log('\n----------------------------------------------');
console.log(`Media por bloco: ${Math.round(mediaEntrada)} entrada / ${Math.round(mediaSaida)} saida (raciocinio medio ${Math.round(somaRaciocinio / indices.length)})`);
console.log(`Projecao da rodada completa (${TOTAL_BLOCOS_PREVISTOS} blocos + ${TOTAL_FUSOES_PREVISTAS} fusoes):`);
console.log(`  entrada: ${Math.round(entradaTotal).toLocaleString('pt-BR')} tokens  = US$ ${(entradaTotal * PRECO_ENTRADA).toFixed(4)}`);
console.log(`  saida:   ${Math.round(saidaTotal).toLocaleString('pt-BR')} tokens  = US$ ${(saidaTotal * PRECO_SAIDA).toFixed(4)}`);
console.log(`  TOTAL:   US$ ${custo.toFixed(4)}   (com 30% de margem p/ retentativas: US$ ${(custo * 1.3).toFixed(4)})`);
console.log(custo * 1.3 < 1 ? '\nFica abaixo do primeiro dolar.' : '\nATENCAO: passa de US$ 1.');
console.log(`\nEsta medicao gastou: ${somaEntrada + uF.prompt_tokens} tokens de entrada e ${somaSaida + uF.completion_tokens} de saida (no free tier, custo zero).`);
