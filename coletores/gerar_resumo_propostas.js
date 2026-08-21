// gerar_resumo_propostas.js — resumo por IA (OFFLINE, EM LOTE) dos planos de governo.
//
// Reabre a decisão "sem IA" de 2026-08-20 (ver Decisões.md, mesma data, 2ª entrada): o
// Jordy pediu um resumo de verdade (principais objetivos/metas), e isso exige compreensão
// de texto corrido — regex/heurística só extrai títulos se o PDF tiver seção nomeada, não
// sintetiza. Decisão: gerar 1x por candidato, OFFLINE, salvar no banco — nunca por request
// (já pré-aprovado como a única exceção em Diretrizes de Design.md). Custo previsível e
// baixo: ~13-20 documentos, uma vez (roda de novo só se o candidato atualizar o PDF).
//
// Modelo: Groq (api.groq.com) — o Jordy já tem chave própria com limite folgado.
// CUIDADO DE NOME (gotcha real, 20/08): "Grok" (xAI, Elon Musk, chaves "xai-...") e
// "Groq" (empresa de inferência rápida, chaves "gsk_...") são coisas DIFERENTES apesar
// do nome quase igual. A chave do Jordy é "gsk_..." → é Groq. A variável no .env ficou
// chamada GROK_API_KEY (nome que ele já tinha criado) mas o valor é da Groq mesmo — só
// não renomeei de novo a variável pra não gerar mais um round de ajuste no .env.
// A API da Groq é compatível com o formato OpenAI (mesmo SDK `openai`, só troca a
// `baseURL`). Modelo padrão: openai/gpt-oss-120b (o maior modelo de instrução geral
// disponível na conta — os outros da lista são voz/guarda-corpo/árabe, não servem aqui).
//
// Rodar LOCAL. Precisa no .env, além de SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY:
//   GROK_API_KEY=gsk_...   (a chave da Groq, apesar do nome da variável)
// (opcional: GROK_MODEL=... se quiser trocar o modelo — rodar
// coletores/_testar_chave_grok.js lista os disponíveis na conta). E da lib:
//   npm install openai pdf-parse
//
// Idempotente: só gera resumo pra quem ainda não tem (resumo_proposta IS NULL). Pra
// regenerar tudo (ex.: depois de mudar o prompt), rode com --force:
//   node coletores/gerar_resumo_propostas.js --force

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import { PDFParse } from 'pdf-parse';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const GROQ_KEY = process.env.GROK_API_KEY;
const MODELO = process.env.GROK_MODEL || 'openai/gpt-oss-120b';

if (!SUPABASE_URL || !SUPABASE_KEY) { console.error('❌ Faltam credenciais Supabase (.env).'); process.exit(1); }
if (!GROQ_KEY) { console.error('❌ Falta GROK_API_KEY no .env (a chave da Groq que você já criou).'); process.exit(1); }

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const grok = new OpenAI({ apiKey: GROQ_KEY, baseURL: 'https://api.groq.com/openai/v1' });

const FORCE = process.argv.includes('--force');
// Ponto de partida generoso — se estourar o limite de tokens/minuto do tier gratuito da
// Groq (erro 413 "Request too large"), resumirComIA() corta pela metade e tenta de novo
// sozinho, então não precisa acertar esse número de primeira.
const MAX_CARACTERES_PDF_INICIAL = 24000; // ~6k tokens de entrada, com folga pro system+ferramenta+saída
const MIN_CARACTERES_PDF = 3000; // abaixo disso desiste — resumo ficaria vazio de conteúdo
const PAUSA_ENTRE_CANDIDATOS_MS = 1500; // evita rajada contra o limite por minuto

// GOTCHA (20/08): tentei primeiro com tool-calling forçado (tool_choice), mas os
// modelos gpt-oss na Groq têm um bug conhecido de parser nesse modo (formato interno
// deles chamado "harmony", que a Groq ainda não trata bem quando força uma ferramenta
// específica) — dava "did not call a tool" ou JSON malformado, de forma consistente,
// não por azar. Troquei pra response_format: json_object (o modelo escreve o JSON
// direto na resposta, sem passar pelo mecanismo de tool-calling) — bem mais maduro e
// estável em qualquer provedor. O formato exigido fica descrito no próprio prompt.

const PROMPT_SISTEMA = `Você extrai o conteúdo de planos de governo eleitorais brasileiros de forma ESTRITAMENTE factual e neutra.
Regras (inegociáveis):
- NÃO opine, NÃO avalie viabilidade, NÃO elogie nem critique.
- NÃO compare com outros candidatos ou partidos.
- NÃO adicione nenhuma informação que não esteja explicitamente no texto fornecido.
- Se o texto for vago ou genérico num trecho, resuma como vago/genérico — não invente detalhe que não existe.
- Organize por tema (use os temas que o próprio documento aborda: economia, saúde, educação, segurança, meio ambiente, etc.).
- Para cada tema, liste de 2 a 5 propostas ou metas concretas citadas no texto, em frases curtas, o mais fiel possível à linguagem original.
- Se o documento não tiver 5 temas distintos, liste só os que existem — não force conteúdo.

Responda SEMPRE e SOMENTE com um objeto JSON válido, sem nenhum texto antes ou depois, neste formato exato:
{"temas": [{"tema": "Nome curto do tema", "pontos": ["proposta 1", "proposta 2"]}]}`;

async function baixarTextoPdf(url) {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`HTTP ${r.status} ao baixar PDF`);
  const buf = Buffer.from(await r.arrayBuffer());
  // pdf-parse v2 reescreveu a API por completo: não é mais uma função, é a classe
  // PDFParse (construtor recebe { data: buffer }, getText() é assíncrono e devolve
  // { text, pages, ... }). destroy() libera os recursos internos (worker/canvas).
  const parser = new PDFParse({ data: buf });
  try {
    const { text } = await parser.getText();
    return (text || '').trim();
  } finally {
    await parser.destroy();
  }
}

const dormir = (ms) => new Promise((r) => setTimeout(r, ms));

function ehErroDeTamanho(e) {
  return e.status === 413 || e.status === 429 || /too large|tokens per minute|rate.?limit/i.test(e.message || '');
}

// Mesmo em json_object mode, um modelo pode ocasionalmente devolver algo que não
// bate 100% com o formato pedido (JSON cortado, campo faltando). Isso é falha
// momentânea do modelo, não do nosso código: vale tentar de novo.
const MAX_TENTATIVAS_FORMATO = 3;
function ehErroDeFormato(e) {
  return /JSON malformado|resposta vazia|campo "temas" ausente|did not call a tool|failed to parse tool call/i.test(e.message || '');
}

// Tenta com MAX_CARACTERES_PDF_INICIAL; se a Groq recusar por passar do limite de
// tokens/minuto do tier gratuito (413) ou dar rate limit (429), corta o texto pela
// metade e tenta de novo — até caber ou bater no MIN_CARACTERES_PDF. Se a falha for de
// FORMATO (o modelo não chamou a ferramenta / JSON malformado), tenta de novo sem
// mexer no tamanho, até MAX_TENTATIVAS_FORMATO vezes.
async function resumirComIA(textoPdf, nomeCandidato) {
  let limite = MAX_CARACTERES_PDF_INICIAL;
  let tentativasFormato = 0;

  while (true) {
    const texto = textoPdf.length > limite ? textoPdf.slice(0, limite) : textoPdf;
    const truncado = textoPdf.length > limite;

    try {
      const resp = await grok.chat.completions.create({
        model: MODELO,
        max_tokens: 1024,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: PROMPT_SISTEMA },
          {
            role: 'user',
            content: `Plano de governo de ${nomeCandidato}${truncado ? ' (texto truncado — documento mais longo que isso)' : ''}:\n\n${texto}`,
          },
        ],
      });

      const conteudo = resp.choices?.[0]?.message?.content;
      if (!conteudo) throw new Error('Resposta vazia da IA (sem conteúdo na mensagem).');
      let input;
      try {
        input = JSON.parse(conteudo);
      } catch {
        throw new Error('JSON malformado na resposta da IA.');
      }
      if (!Array.isArray(input.temas)) throw new Error('Resposta da IA sem o formato esperado (campo "temas" ausente).');
      return input.temas;
    } catch (e) {
      if (ehErroDeTamanho(e) && limite > MIN_CARACTERES_PDF) {
        limite = Math.floor(limite / 2);
        console.warn(`     ↩️  Requisição grande/rápida demais pro limite da Groq — tentando com texto menor (~${limite} caracteres)…`);
        await dormir(1000); // dá um respiro antes de tentar de novo (rate limit é por minuto)
        continue;
      }
      if (ehErroDeFormato(e) && tentativasFormato < MAX_TENTATIVAS_FORMATO) {
        tentativasFormato++;
        console.warn(`     ↩️  A IA não respondeu no formato esperado (${e.message}) — tentando de novo (${tentativasFormato}/${MAX_TENTATIVAS_FORMATO})…`);
        await dormir(800);
        continue;
      }
      throw e;
    }
  }
}

async function main() {
  console.log(`🚀 Resumo dos planos de governo (modelo: ${MODELO})…`);
  const q = supabase.from('candidatos_presidenciais').select('id, nome_urna, proposta_pdf_url, resumo_proposta').not('proposta_pdf_url', 'is', null);
  const { data: candidatos, error } = FORCE ? await q : await q.is('resumo_proposta', null);
  if (error) { console.error(error.message); process.exit(1); }

  if (!candidatos.length) { console.log('✅ Nada a fazer — todos já têm resumo (use --force pra regenerar).'); return; }
  console.log(`📥 ${candidatos.length} candidato(s) com PDF pra resumir.`);

  let ok = 0, falhou = 0;
  for (const c of candidatos) {
    try {
      console.log(`  📄 ${c.nome_urna}…`);
      const texto = await baixarTextoPdf(c.proposta_pdf_url);
      if (texto.length < 200) { console.warn(`     ⚠️  PDF com pouquíssimo texto extraível (${texto.length} caracteres) — pode ser digitalizado/imagem. Pulando.`); falhou++; continue; }
      const temas = await resumirComIA(texto, c.nome_urna);
      const { error: upErr } = await supabase.from('candidatos_presidenciais').update({
        resumo_proposta: temas,
        resumo_gerado_em: new Date().toISOString(),
        resumo_modelo: MODELO,
      }).eq('id', c.id);
      if (upErr) throw new Error(upErr.message);
      console.log(`     ✅ ${temas.length} tema(s) extraído(s).`);
      ok++;
    } catch (e) {
      console.warn(`     ⚠️  ${c.nome_urna}: ${e.message}`);
      falhou++;
    }
    await dormir(PAUSA_ENTRE_CANDIDATOS_MS);
  }
  console.log(`\n✅ Resumos: ${ok} gerados, ${falhou} com erro/pulados.`);
}

main().catch((e) => { console.error('💥 Erro:', e.message); process.exit(1); });
