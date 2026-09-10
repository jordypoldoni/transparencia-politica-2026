// _testar_compound.mjs — o groq/compound serve para resumir os planos?
// Testa 3 coisas num bloco denso de plano de governo:
//   1. da pra DESLIGAR as ferramentas (enabled_tools: []) - senao o modelo busca na
//      web e injeta no resumo coisa que nao esta no PDF (mata a neutralidade)
//   2. o compound aceita response_format json_object
//   3. a qualidade e comparavel ao gpt-oss-120b (mesmo bloco, mesmo prompt)
// Nao escreve nada no banco.  node coletores/_testar_compound.mjs

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import { PDFParse } from 'pdf-parse';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const groq = new OpenAI({ apiKey: process.env.GROK_API_KEY, baseURL: 'https://api.groq.com/openai/v1' });
const BLOCO = 12000, INDICE = 7;

const PROMPT_SISTEMA = `Você extrai o conteúdo de planos de governo eleitorais brasileiros de forma ESTRITAMENTE factual e neutra.
Este é UM TRECHO de um documento maior. Extraia apenas o que estiver neste trecho.
Regras (inegociáveis):
- NÃO opine, NÃO avalie viabilidade, NÃO elogie nem critique.
- NÃO compare com outros candidatos ou partidos.
- NÃO busque informação externa. NÃO adicione nada que não esteja explicitamente no texto fornecido.
- Se o trecho for só sumário, índice, capa ou agradecimento, devolva {"temas": []}.
- Para cada tema, liste de 2 a 5 propostas concretas citadas, em frases curtas, fiéis à linguagem original.

Responda SEMPRE e SOMENTE com um objeto JSON válido, sem nenhum texto antes ou depois, neste formato exato:
{"temas": [{"tema": "Nome curto do tema", "pontos": ["proposta 1", "proposta 2"]}]}`;

const { data: c } = await supabase.from('candidatos_presidenciais')
  .select('nome_urna, proposta_pdf_url').eq('nome_urna', 'LULA').single();
const r = await fetch(c.proposta_pdf_url);
const parser = new PDFParse({ data: Buffer.from(await r.arrayBuffer()) });
let texto = '';
try { texto = ((await parser.getText()).text || '').trim(); } finally { await parser.destroy(); }
const trecho = texto.slice(INDICE * BLOCO, (INDICE + 1) * BLOCO);
console.log(`Bloco ${INDICE} do plano de ${c.nome_urna} (${trecho.length} chars)\n`);

const dormir = (ms) => new Promise((r) => setTimeout(r, ms));

const CENARIOS = [
  { nome: 'compound-mini | tools:[] | json mode', modelo: 'groq/compound-mini', tools: [], json: true },
  { nome: 'compound-mini | tools:[] | sem json mode', modelo: 'groq/compound-mini', tools: [], json: false },
  { nome: 'compound      | tools:[] | json mode', modelo: 'groq/compound', tools: [], json: true },
];

for (const cen of CENARIOS) {
  console.log(`--- ${cen.nome}`);
  try {
    const corpo = {
      model: cen.modelo,
      max_tokens: 3000,
      messages: [
        { role: 'system', content: PROMPT_SISTEMA },
        { role: 'user', content: `Trecho do plano de governo de ${c.nome_urna}:\n\n${trecho}` },
      ],
      compound_custom: { tools: { enabled_tools: cen.tools } },
    };
    if (cen.json) corpo.response_format = { type: 'json_object' };

    const t0 = Date.now();
    const resp = await groq.chat.completions.create(corpo);
    const seg = ((Date.now() - t0) / 1000).toFixed(1);
    const msg = resp.choices[0].message;
    const u = resp.usage;

    // compound devolve as ferramentas que REALMENTE rodou - a prova de que nao buscou na web
    const usou = msg.executed_tools ?? resp.choices[0].executed_tools ?? null;
    console.log(`    ok em ${seg}s | entrada ${u.prompt_tokens} | saida ${u.completion_tokens}`);
    console.log(`    ferramentas executadas: ${usou ? JSON.stringify(usou).slice(0, 300) : 'nenhuma'}`);

    let temas = null;
    try { temas = JSON.parse(msg.content).temas; } catch { }
    if (temas) {
      console.log(`    ${temas.length} tema(s): ${temas.map((t) => t.tema).join(', ')}`);
      console.log(`    amostra: ${JSON.stringify(temas[0]).slice(0, 400)}`);
    } else {
      console.log(`    NAO veio JSON valido. Comeco da resposta: ${String(msg.content).slice(0, 400)}`);
    }
  } catch (e) {
    console.log(`    FALHOU: ${e.status ?? ''} ${e.message}`);
  }
  console.log();
  await dormir(3000);
}
