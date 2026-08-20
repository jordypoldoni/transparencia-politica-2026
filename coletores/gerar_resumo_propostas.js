// gerar_resumo_propostas.js — resumo por IA (OFFLINE, EM LOTE) dos planos de governo.
//
// Reabre a decisão "sem IA" de 2026-08-20 (ver Decisões.md, mesma data, 2ª entrada): o
// Jordy pediu um resumo de verdade (principais objetivos/metas), e isso exige compreensão
// de texto corrido — regex/heurística só extrai títulos se o PDF tiver seção nomeada, não
// sintetiza. Decisão: gerar 1x por candidato, OFFLINE, salvar no banco — nunca por request
// (já pré-aprovado como a única exceção em Diretrizes de Design.md). Custo previsível e
// baixo: ~13-20 documentos, uma vez (roda de novo só se o candidato atualizar o PDF).
//
// Modelo: Grok (xAI) — o Jordy já tem chave própria com limite folgado. A API do xAI é
// compatível com o formato OpenAI (mesmo SDK `openai`, só troca a `baseURL`).
//
// Rodar LOCAL. Precisa no .env, além de SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY:
//   GROK_API_KEY=xai-...
// (opcional: GROK_MODEL=grok-... se o padrão abaixo não existir mais — conferir nomes
// atuais em https://docs.x.ai/docs/models). E da lib:
//   npm install openai pdf-parse
//
// Idempotente: só gera resumo pra quem ainda não tem (resumo_proposta IS NULL). Pra
// regenerar tudo (ex.: depois de mudar o prompt), rode com --force:
//   node coletores/gerar_resumo_propostas.js --force

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import { createRequire } from 'module';

// pdf-parse é CommonJS e não expõe um default export "estático" o suficiente pro
// analisador de ESM do Node (`import pdfParse from 'pdf-parse'` quebra com
// "does not provide an export named 'default'"). createRequire contorna isso.
const require = createRequire(import.meta.url);
const pdfParse = require('pdf-parse');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const XAI_KEY = process.env.GROK_API_KEY;
const MODELO = process.env.GROK_MODEL || 'grok-4-fast-reasoning';

if (!SUPABASE_URL || !SUPABASE_KEY) { console.error('❌ Faltam credenciais Supabase (.env).'); process.exit(1); }
if (!XAI_KEY) { console.error('❌ Falta GROK_API_KEY no .env (a chave do Grok que você já criou).'); process.exit(1); }

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const grok = new OpenAI({ apiKey: XAI_KEY, baseURL: 'https://api.x.ai/v1' });

const FORCE = process.argv.includes('--force');
const MAX_CARACTERES_PDF = 60000; // ~15k tokens; cobre a maioria dos planos de governo reais

const FERRAMENTA_RESUMO = {
  type: 'function',
  function: {
    name: 'registrar_resumo',
    description: 'Registra o resumo estruturado, por tema, do plano de governo.',
    parameters: {
      type: 'object',
      properties: {
        temas: {
          type: 'array',
          description: 'Os temas centrais do documento, na ordem em que aparecem ou por relevância.',
          items: {
            type: 'object',
            properties: {
              tema: { type: 'string', description: 'Nome curto do tema (ex.: "Economia", "Saúde", "Segurança pública").' },
              pontos: {
                type: 'array',
                description: '2 a 5 propostas/metas concretas citadas no texto para esse tema, em frases curtas e diretas.',
                items: { type: 'string' },
              },
            },
            required: ['tema', 'pontos'],
          },
        },
      },
      required: ['temas'],
    },
  },
};

const PROMPT_SISTEMA = `Você extrai o conteúdo de planos de governo eleitorais brasileiros de forma ESTRITAMENTE factual e neutra.
Regras (inegociáveis):
- NÃO opine, NÃO avalie viabilidade, NÃO elogie nem critique.
- NÃO compare com outros candidatos ou partidos.
- NÃO adicione nenhuma informação que não esteja explicitamente no texto fornecido.
- Se o texto for vago ou genérico num trecho, resuma como vago/genérico — não invente detalhe que não existe.
- Organize por tema (use os temas que o próprio documento aborda: economia, saúde, educação, segurança, meio ambiente, etc.).
- Para cada tema, liste de 2 a 5 propostas ou metas concretas citadas no texto, em frases curtas, o mais fiel possível à linguagem original.
- Se o documento não tiver 5 temas distintos, liste só os que existem — não force conteúdo.
- Sempre use a ferramenta "registrar_resumo" para responder — nunca responda em texto livre.`;

async function baixarTextoPdf(url) {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`HTTP ${r.status} ao baixar PDF`);
  const buf = Buffer.from(await r.arrayBuffer());
  const { text } = await pdfParse(buf);
  return (text || '').trim();
}

async function resumirComIA(textoPdf, nomeCandidato) {
  let texto = textoPdf;
  let truncado = false;
  if (texto.length > MAX_CARACTERES_PDF) { texto = texto.slice(0, MAX_CARACTERES_PDF); truncado = true; }

  const resp = await grok.chat.completions.create({
    model: MODELO,
    max_tokens: 2048,
    tools: [FERRAMENTA_RESUMO],
    tool_choice: { type: 'function', function: { name: 'registrar_resumo' } },
    messages: [
      { role: 'system', content: PROMPT_SISTEMA },
      {
        role: 'user',
        content: `Plano de governo de ${nomeCandidato}${truncado ? ' (texto truncado nas primeiras ~15 mil palavras — documento mais longo que isso)' : ''}:\n\n${texto}`,
      },
    ],
  });

  const chamada = resp.choices?.[0]?.message?.tool_calls?.[0];
  if (!chamada) throw new Error('Resposta sem tool_call — a IA respondeu em texto livre em vez de usar a ferramenta.');
  const input = JSON.parse(chamada.function.arguments);
  if (!Array.isArray(input.temas)) throw new Error('Resposta da IA sem o formato esperado (campo "temas" ausente).');
  return input.temas;
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
  }
  console.log(`\n✅ Resumos: ${ok} gerados, ${falhou} com erro/pulados.`);
}

main().catch((e) => { console.error('💥 Erro:', e.message); process.exit(1); });
