// gerar_resumo_propostas.js — resumo por IA (OFFLINE, EM LOTE) dos planos de governo.
//
// POR QUE ESTE ARQUIVO FOI REESCRITO (09/09/2026)
// A versão anterior truncava o PDF nos primeiros 16 mil caracteres. Em plano de governo
// isso é capa, sumário e carta de intenções — o conteúdo real nunca chegava na IA. Resultado
// medido: 6 dos 12 candidatos ficaram com UM tema só (o do Augusto Cury tinha 140 caracteres
// para 200 páginas de plano). Agora o documento inteiro é lido em blocos e depois fundido.
//
// COMO FUNCIONA
//   1. baixa o PDF e extrai o texto inteiro (sem truncar);
//   2. quebra em blocos de ~12 mil caracteres, cortando em quebra de linha;
//   3. resume cada bloco (o prompt manda devolver {"temas": []} quando o trecho é capa,
//      sumário ou índice — o lixo do começo do documento sai sozinho);
//   4. funde os temas repetidos das partes num resumo único por candidato;
//   5. salva no banco só no fim, quando o candidato inteiro terminou (nunca pela metade).
//
// GOTCHAS QUE CUSTARAM TEMPO (não desfaça sem ler):
//
// - "Grok" (xAI, Elon Musk, chaves "xai-...") e "Groq" (inferência rápida, chaves "gsk_...")
//   são empresas DIFERENTES apesar do nome quase igual. A chave do Jordy é "gsk_" → é Groq.
//   A variável no .env se chama GROK_API_KEY por herança, mas o valor é da Groq.
//
// - `response_format: json_object` EXIGE a palavra "json" literal em alguma das mensagens.
//   Sem ela a API devolve 400: "'messages' must contain the word 'json' in some form".
//   Por isso os dois prompts abaixo escrevem "JSON" por extenso. Não remova.
//
// - `reasoning_effort: 'low'` NÃO é economia à toa. O gpt-oss é modelo de raciocínio e os
//   tokens de pensamento saem do MESMO max_tokens da resposta. Medido no mesmo bloco denso:
//   com raciocínio padrão gastou 1.716 tokens pensando, bateu no teto e devolveu JSON
//   cortado com 2 temas; com 'low' devolveu 7 temas completos em 612 tokens. Extração de
//   proposta é leitura, não raciocínio.
//
// - pdf-parse v2 não é mais função, é a classe PDFParse. getText() é assíncrono e devolve
//   { text, ... }. destroy() libera o worker interno.
//
// ORÇAMENTO (por que o script para sozinho)
// O tier gratuito da Groq dá 200 mil tokens por DIA no gpt-oss-120b, e a rodada completa
// precisa de ~650 mil. Então isto aqui roda em 3 ou 4 sessões, uma por dia. O script conta
// os tokens que gastou (arquivo _orcamento_resumos.json), para antes de estourar e avisa
// para rodar de novo amanhã. É idempotente: retoma exatamente de onde parou, sem refazer
// candidato já pronto. Rodar de novo no mesmo dia depois do aviso não adianta — o contador
// da Groq só zera na virada do dia.
//
// USO:
//   node coletores/gerar_resumo_propostas.js            (roda o que falta)
//   node coletores/gerar_resumo_propostas.js --force    (refaz TODOS, inclusive os prontos)
//   node coletores/gerar_resumo_propostas.js --so=LULA  (um candidato só, para testar)
//
// Precisa no .env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, GROK_API_KEY.
// Libs: npm install openai pdf-parse

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import { PDFParse } from 'pdf-parse';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ARQUIVO_ORCAMENTO = path.join(__dirname, '_orcamento_resumos.json');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const GROQ_KEY = process.env.GROK_API_KEY;
const MODELO = process.env.GROK_MODEL || 'openai/gpt-oss-120b';

if (!SUPABASE_URL || !SUPABASE_KEY) { console.error('❌ Faltam credenciais Supabase (.env).'); process.exit(1); }
if (!GROQ_KEY) { console.error('❌ Falta GROK_API_KEY no .env (a chave da Groq).'); process.exit(1); }

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const groq = new OpenAI({ apiKey: GROQ_KEY, baseURL: 'https://api.groq.com/openai/v1' });

const FORCE = process.argv.includes('--force');
const SO = (process.argv.find((a) => a.startsWith('--so=')) || '').slice(5).toUpperCase();

// Resumos gerados ANTES desta data usaram o método antigo (truncado) e serão refeitos.
// Se um dia você mudar o prompt de novo, mova esta data para o dia da mudança.
const DATA_CORTE = '2026-09-09T00:00:00Z';

const BLOCO_CHARS = 12000;
const MIN_BLOCO_CHARS = 300;      // bloco menor que isso não tem conteúdo, é rodapé
const MAX_TOKENS_SAIDA = 3000;
const TPM = 8000;                 // tokens/minuto do tier free
const ORCAMENTO_DIARIO = 190000;  // teto real é 200 mil; a margem cobre a chamada em voo
const CUSTO_MEDIO_BLOCO = 4200;   // medido: ~3.5k entrada + ~0.6k saída
const MAX_TENTATIVAS = 3;
// A fusão é o ponto onde a rodada trava: juntar 88 temas numa chamada só cria uma
// requisição perto do teto de 8.000 tokens/minuto, e ela fica apanhando até achar uma
// janela de minuto vazia (custou 5 minutos parados no Augusto Cury em 09/09). Por isso a
// fusão é feita em etapas, com cada chamada limitada a este tamanho de entrada.
const MAX_CHARS_FUSAO = 8000;
const PRECO_ENTRADA = 0.15 / 1e6; // USD/token (só para exibir; no free é zero)
const PRECO_SAIDA = 0.60 / 1e6;

const PROMPT_BLOCO = `Você extrai o conteúdo de planos de governo eleitorais brasileiros de forma ESTRITAMENTE factual e neutra.
Este é UM TRECHO de um documento maior. Extraia apenas o que estiver neste trecho.
Regras (inegociáveis):
- NÃO opine, NÃO avalie viabilidade, NÃO elogie nem critique.
- NÃO compare com outros candidatos ou partidos.
- NÃO busque informação externa. NÃO adicione nada que não esteja explicitamente no texto fornecido.
- Se o trecho for vago ou genérico, resuma como vago/genérico — não invente detalhe que não existe.
- Se o trecho for só capa, sumário, índice, glossário, agradecimento ou ficha técnica, devolva {"temas": []}.
- Organize por tema (os que o próprio trecho aborda: economia, saúde, educação, segurança, meio ambiente, etc.).
- Para cada tema, liste de 2 a 5 propostas ou metas concretas citadas, em frases curtas, o mais fiéis possível à linguagem original.

Responda SEMPRE e SOMENTE com um objeto JSON válido, sem nenhum texto antes ou depois, neste formato exato:
{"temas": [{"tema": "Nome curto do tema", "pontos": ["proposta 1", "proposta 2"]}]}`;

const PROMPT_FUSAO_PARCIAL = `Você recebe listas de temas e propostas extraídas de PARTES DIFERENTES do mesmo plano de governo.
Esta é uma etapa INTERMEDIÁRIA de consolidação: compacte sem perder proposta.
Regras (inegociáveis):
- Junte temas equivalentes num só ("Saúde" e "Saúde Pública" viram "Saúde").
- Devolva NO MÁXIMO 5 temas.
- Elimine propostas repetidas: se duas frases dizem a mesma coisa com palavras diferentes, mantenha só a mais completa.
- Mantenha a linguagem original das propostas. NÃO reescreva para ficar mais bonito.
- Comece cada proposta com letra maiúscula.
- NÃO invente nada que não esteja nas listas recebidas. NÃO opine, NÃO avalie, NÃO compare candidatos.

Responda SEMPRE e SOMENTE com um objeto JSON válido, sem nenhum texto antes ou depois, neste formato exato:
{"temas": [{"tema": "Nome curto do tema", "pontos": ["proposta 1", "proposta 2"]}]}`;

const PROMPT_FUSAO_FINAL = `Você recebe listas de temas e propostas de um mesmo plano de governo. Monte a versão FINAL.
Regras (inegociáveis):
- Junte temas equivalentes num só ("Saúde" e "Saúde Pública" viram "Saúde").
- Devolva entre 6 e 9 temas, priorizando os mais presentes no documento.
- Cada tema com 4 a 6 pontos.
- Elimine propostas repetidas: se duas frases dizem a mesma coisa com palavras diferentes, mantenha só a mais completa. Duas menções à mesma medida NÃO viram dois pontos.
- Mantenha a linguagem original das propostas. NÃO reescreva para ficar mais bonito.
- Comece cada proposta com letra maiúscula.
- NÃO invente nada que não esteja nas listas recebidas. NÃO opine, NÃO avalie, NÃO compare candidatos.

Responda SEMPRE e SOMENTE com um objeto JSON válido, sem nenhum texto antes ou depois, neste formato exato:
{"temas": [{"tema": "Nome curto do tema", "pontos": ["proposta 1", "proposta 2"]}]}`;

const dormir = (ms) => new Promise((r) => setTimeout(r, ms));
const fmt = (n) => n.toLocaleString('pt-BR');
const hoje = () => new Date().toISOString().slice(0, 10);

// ---------- orçamento diário (persistido entre execuções) ----------
function lerOrcamento() {
  try {
    const o = JSON.parse(fs.readFileSync(ARQUIVO_ORCAMENTO, 'utf8'));
    if (o.dia === hoje()) return o;
  } catch { }
  return { dia: hoje(), tokens: 0, entrada: 0, saida: 0 };
}
function salvarOrcamento(o) {
  try { fs.writeFileSync(ARQUIVO_ORCAMENTO, JSON.stringify(o, null, 2)); } catch { }
}
const orcamento = lerOrcamento();
const restante = () => ORCAMENTO_DIARIO - orcamento.tokens;

// ---------- PDF ----------
async function baixarTextoPdf(url) {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`HTTP ${r.status} ao baixar PDF`);
  const parser = new PDFParse({ data: Buffer.from(await r.arrayBuffer()) });
  try {
    const { text } = await parser.getText();
    return (text || '').trim();
  } finally {
    await parser.destroy();
  }
}

function fatiar(texto, max) {
  const blocos = [];
  let i = 0;
  while (i < texto.length) {
    let fim = Math.min(i + max, texto.length);
    if (fim < texto.length) {
      const corte = texto.lastIndexOf('\n', fim);
      if (corte > i + max * 0.5) fim = corte; // corta em quebra de linha, não no meio da frase
    }
    const b = texto.slice(i, fim).trim();
    if (b.length >= MIN_BLOCO_CHARS) blocos.push(b);
    i = fim;
  }
  return blocos;
}

// ---------- chamada à IA (com throttle e retentativa) ----------
function segundosDoRateLimit(e) {
  const m = /try again in ([\d.]+)s/i.exec(e.message || '');
  return m ? Math.ceil(parseFloat(m[1])) + 1 : 20;
}

async function chamarIA(sistema, usuario) {
  let tentativa = 0;
  while (true) {
    try {
      const resp = await groq.chat.completions.create({
        model: MODELO,
        max_tokens: MAX_TOKENS_SAIDA,
        reasoning_effort: 'low',
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: sistema },
          { role: 'user', content: usuario },
        ],
      });

      const u = resp.usage;
      orcamento.tokens += u.total_tokens;
      orcamento.entrada += u.prompt_tokens;
      orcamento.saida += u.completion_tokens;
      salvarOrcamento(orcamento);

      const conteudo = resp.choices?.[0]?.message?.content;
      if (!conteudo) throw new Error('Resposta vazia da IA.');
      let obj;
      try { obj = JSON.parse(conteudo); } catch { throw new Error('JSON malformado na resposta da IA.'); }
      if (!Array.isArray(obj.temas)) throw new Error('Resposta sem o campo "temas".');

      // Throttle pelo TPM: espera o tempo proporcional aos tokens que acabou de gastar.
      const espera = Math.ceil((u.total_tokens / TPM) * 60000 * 1.15);
      await dormir(Math.max(2000, espera));

      return { temas: obj.temas, usage: u };
    } catch (e) {
      const rateLimit = e.status === 429 || /rate.?limit|too large/i.test(e.message || '');
      if (rateLimit) {
        const s = segundosDoRateLimit(e);
        console.warn(`       ⏳ limite por minuto atingido — aguardando ${s}s…`);
        await dormir(s * 1000);
        continue; // rate limit não gasta tentativa: é espera, não falha
      }
      if (++tentativa < MAX_TENTATIVAS) {
        console.warn(`       ↩️  ${e.message} — tentando de novo (${tentativa}/${MAX_TENTATIVAS})…`);
        await dormir(1500);
        continue;
      }
      throw e;
    }
  }
}

// ---------- limpeza determinística (sem IA, sem token) ----------
// Corrige o que o modelo entrega torto de forma previsível: hífens exóticos que ele copia
// do PDF (U+2010..U+2015 — inclusive o travessão, proibido nos textos visíveis do site),
// "50 %" com espaço, frase começando em minúscula, e proposta repetida com outras palavras.
function limparTexto(t) {
  return String(t)
    .replace(/[‐‑‒–—―]/g, '-')
    .replace(/\s+/g, ' ')
    .replace(/(\d)\s+%/g, '$1%')
    .trim();
}

function normalizar(t) {
  return limparTexto(t).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
}

// Duas frases que dizem a mesma coisa com palavras diferentes: compara as palavras longas
// das duas. 70% de sobreposição já é a mesma proposta escrita duas vezes.
function pareceRepetida(a, b) {
  const A = new Set(a.split(' ').filter((w) => w.length > 3));
  const B = new Set(b.split(' ').filter((w) => w.length > 3));
  if (A.size < 2 || B.size < 2) return false;
  let comuns = 0;
  for (const w of A) if (B.has(w)) comuns++;
  return comuns / Math.min(A.size, B.size) >= 0.7;
}

function limparTemas(temas) {
  const chavesGlobais = [];
  const saida = [];
  for (const t of temas) {
    const pontos = [];
    for (const bruto of t.pontos || []) {
      const texto = limparTexto(bruto);
      if (texto.length < 12) continue;
      const chave = normalizar(texto);
      if (chavesGlobais.some((k) => k === chave || pareceRepetida(k, chave))) continue;
      chavesGlobais.push(chave);
      pontos.push(texto.charAt(0).toUpperCase() + texto.slice(1));
    }
    if (pontos.length) saida.push({ tema: limparTexto(t.tema), pontos });
  }
  return saida;
}

// ---------- fusão em etapas ----------
function agruparPorTamanho(temas, maxChars) {
  const grupos = [];
  let atual = [], tam = 0;
  for (const t of temas) {
    const s = JSON.stringify(t).length;
    if (atual.length && tam + s > maxChars) { grupos.push(atual); atual = []; tam = 0; }
    atual.push(t); tam += s;
  }
  if (atual.length) grupos.push(atual);
  return grupos;
}

async function fundir(temas, nome) {
  let nivel = temas;
  let etapa = 0;
  while (true) {
    const grupos = agruparPorTamanho(nivel, MAX_CHARS_FUSAO);
    if (grupos.length === 1) break;
    etapa++;
    const proximo = [];
    for (let g = 0; g < grupos.length; g++) {
      process.stdout.write(`\r     fusão etapa ${etapa} · grupo ${g + 1}/${grupos.length}          `);
      const { temas: t } = await chamarIA(PROMPT_FUSAO_PARCIAL,
        `Listas de partes do plano de governo de ${nome}:\n\n${JSON.stringify(grupos[g])}`);
      proximo.push(...t);
    }
    process.stdout.write('\n');
    // trava de segurança: se uma etapa não reduziu nada, para de tentar
    if (JSON.stringify(proximo).length >= JSON.stringify(nivel).length) { nivel = proximo; break; }
    nivel = proximo;
  }
  const { temas: final } = await chamarIA(PROMPT_FUSAO_FINAL,
    `Listas do plano de governo de ${nome}:\n\n${JSON.stringify(nivel)}`);
  return final;
}

// ---------- um candidato ----------
async function processarCandidato(c, blocos) {
  const parciais = [];
  let vazios = 0;
  for (let i = 0; i < blocos.length; i++) {
    const { temas } = await chamarIA(PROMPT_BLOCO, `Trecho ${i + 1} de ${blocos.length} do plano de governo de ${c.nome_urna}:\n\n${blocos[i]}`);
    if (temas.length === 0) vazios++;
    else parciais.push(...temas);
    process.stdout.write(`\r     bloco ${i + 1}/${blocos.length} · ${parciais.length} temas acumulados · ${fmt(restante())} tokens no orçamento   `);
  }
  process.stdout.write('\n');
  if (vazios) console.log(`     (${vazios} bloco(s) sem proposta - capa, sumário ou índice)`);
  if (!parciais.length) throw new Error('Nenhuma proposta extraída do documento inteiro.');

  const fundidos = blocos.length === 1 ? parciais : await fundir(parciais, c.nome_urna);
  const limpos = limparTemas(fundidos);
  const removidos = fundidos.reduce((a, t) => a + (t.pontos?.length || 0), 0) - limpos.reduce((a, t) => a + t.pontos.length, 0);
  if (removidos > 0) console.log(`     (${removidos} proposta(s) repetida(s) removida(s) na limpeza)`);
  if (!limpos.length) throw new Error('Resumo ficou vazio após a limpeza.');
  return limpos;
}

// ---------- principal ----------
async function main() {
  console.log(`🚀 Resumo dos planos de governo - modelo ${MODELO}, raciocínio baixo`);
  console.log(`📊 Orçamento de hoje (${orcamento.dia}): ${fmt(orcamento.tokens)} de ${fmt(ORCAMENTO_DIARIO)} tokens usados, ${fmt(restante())} livres\n`);

  if (restante() < CUSTO_MEDIO_BLOCO * 3) {
    console.log('🛑 Orçamento de hoje esgotado. Rode de novo amanhã - o contador da Groq zera na virada do dia.');
    return;
  }

  let q = supabase
    .from('candidatos_presidenciais')
    .select('id, nome_urna, proposta_pdf_url, resumo_gerado_em')
    .not('proposta_pdf_url', 'is', null);
  if (SO) q = q.eq('nome_urna', SO);
  const { data: todos, error } = await q;
  if (error) { console.error(error.message); process.exit(1); }

  const pendentes = FORCE ? todos : todos.filter((c) => !c.resumo_gerado_em || c.resumo_gerado_em < DATA_CORTE);
  if (!pendentes.length) { console.log('✅ Todos já têm resumo pelo método novo. Nada a fazer.'); return; }

  // Baixa e mede TODOS antes de gastar token: sem saber o tamanho de cada plano não dá
  // para escolher a ordem, e na rodada de 09/09 sobraram 22.845 tokens sem uso porque a
  // fila estava na ordem do banco e só restavam candidatos grandes demais.
  console.log(`📥 ${pendentes.length} candidato(s) na fila. Medindo os documentos…\n`);
  const fila = [];
  for (const c of pendentes) {
    try {
      const texto = await baixarTextoPdf(c.proposta_pdf_url);
      if (texto.length < 500) throw new Error(`PDF com pouquíssimo texto (${texto.length} caracteres) - pode ser digitalizado/imagem.`);
      const blocos = fatiar(texto, BLOCO_CHARS);
      fila.push({ c, blocos, custo: (blocos.length + 2) * CUSTO_MEDIO_BLOCO });
      console.log(`     ${c.nome_urna.padEnd(28)} ${fmt(texto.length).padStart(9)} chars · ${String(blocos.length).padStart(2)} blocos · ~${fmt((blocos.length + 2) * CUSTO_MEDIO_BLOCO)} tokens`);
    } catch (e) {
      console.warn(`     ${c.nome_urna.padEnd(28)} ⚠️  ${e.message}`);
    }
  }
  console.log();

  let ok = 0, falhou = 0;
  // Guloso: a cada volta pega o MAIOR que ainda cabe no que sobrou do orçamento. Assim os
  // pesados saem enquanto há folga e a sobra do fim do dia é aproveitada por um pequeno.
  while (fila.length) {
    fila.sort((a, b) => b.custo - a.custo);
    const idx = fila.findIndex((f) => f.custo <= restante());
    if (idx === -1) break;
    const [{ c, blocos }] = fila.splice(idx, 1);

    console.log(`  📄 ${c.nome_urna} (${blocos.length} blocos)`);
    try {
      const temas = await processarCandidato(c, blocos);
      const { error: upErr } = await supabase.from('candidatos_presidenciais').update({
        resumo_proposta: temas,
        resumo_gerado_em: new Date().toISOString(),
        resumo_modelo: MODELO,
      }).eq('id', c.id);
      if (upErr) throw new Error(upErr.message);
      console.log(`     ✅ ${temas.length} tema(s), ${temas.reduce((a, t) => a + t.pontos.length, 0)} propostas\n`);
      ok++;
    } catch (e) {
      console.warn(`     ⚠️  ${e.message}\n`);
      falhou++;
    }
  }

  const custo = orcamento.entrada * PRECO_ENTRADA + orcamento.saida * PRECO_SAIDA;
  console.log('──────────────────────────────────────────────');
  console.log(`✅ ${ok} resumo(s) gerado(s)${falhou ? ` · ⚠️ ${falhou} com erro` : ''}${fila.length ? ` · ⏸️ ${fila.length} adiado(s) por orçamento` : ''}`);
  console.log(`📊 Consumo de hoje: ${fmt(orcamento.tokens)} tokens (${fmt(orcamento.entrada)} entrada + ${fmt(orcamento.saida)} saída), ${fmt(restante())} sobraram`);
  console.log(`💵 Equivalente no tier pago: US$ ${custo.toFixed(4)} - no free, zero.`);
  if (fila.length) {
    console.log(`\n⏸️  Ficaram para amanhã: ${fila.map((f) => f.c.nome_urna).join(', ')}`);
    console.log(`👉 Rode o mesmo comando amanhã para continuar de onde parou.`);
  }
}

main().catch((e) => { console.error('💥 Erro:', e.message); process.exit(1); });
