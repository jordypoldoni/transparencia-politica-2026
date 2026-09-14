// _testar_gemini.mjs (v2) — descobre COMO desligar o pensamento do Gemini e QUAL modelo usar.
//
// POR QUE A v1 FALHOU (14/09/2026)
// Ela reportou "não devolveu JSON válido", e o diagnóstico estava errado. A conta da própria
// saída denunciava: 263 entrada + 34 saída, total 1447. Os 1.150 que faltam são tokens de
// PENSAMENTO, e no Gemini 2.5 Flash eles saem do mesmo max_tokens da resposta. O modelo pensou
// até estourar o teto e a resposta foi cortada no meio de uma palavra. O JSON estava certo,
// só não coube.
//
// É A MESMA ARMADILHA JÁ DOCUMENTADA em gerar_resumo_propostas.js para o gpt-oss da Groq
// ("os tokens de pensamento saem do MESMO max_tokens da resposta"). Lá foi resolvida com
// reasoning_effort: 'low'. Aqui o teste descobre qual chave desliga isso no Gemini, em vez de
// eu chutar de novo.
//
// Extrair proposta de uma ementa é LEITURA, não raciocínio. Pensamento aqui é desperdício puro.

import 'dotenv/config';
import OpenAI from 'openai';

const CHAVE = process.env.GEMINI_API_KEY;
if (!CHAVE) { console.error('❌ Falta GEMINI_API_KEY no .env.'); process.exit(1); }
const ia = new OpenAI({ apiKey: CHAVE, baseURL: 'https://generativelanguage.googleapis.com/v1beta/openai/' });

const ENTRADA = `id: TESTE-1
proposta: PLP 230/2025
ementa oficial: Altera a Lei Complementar nº 101, de 4 de maio de 2000, para vedar a limitação de empenho e movimentação financeira das despesas relativas ao Fundo de Universalização dos Serviços de Telecomunicações.
tipo de votação (já apurado, use como verdade): Projeto de Lei Complementar - precisa de maioria absoluta e regula dispositivo da Constituição.
resultado: Aprovado`;

const SISTEMA = `Você traduz textos do Congresso brasileiro para português comum, de forma ESTRITAMENTE factual.
Para cada item, escreva "frase" (uma frase sobre o que o texto faz, começando com verbo) e "contexto" (3 a 4 frases).
REGRAS: não opine; não invente; você recebe SOMENTE a ementa, então se ela apenas cita uma lei sem dizer o que muda, diga que a ementa não detalha; não troque termo técnico por sinônimo; não use travessão.
Responda SOMENTE com JSON: {"itens":[{"id":"...","frase":"...","contexto":"..."}]}`;

// Modelos na ordem em que eu os usaria. O teste confirma quais existem para esta chave.
const MODELOS = ['gemini-3.6-flash', 'gemini-3.5-flash', 'gemini-2.5-flash'];

// Cada jeito conhecido de desligar/limitar o pensamento. Não sei qual o endpoint aceita,
// então testo todos e relato. max_tokens folgado para o corte não mascarar o resultado.
const MODOS = [
  { nome: "reasoning_effort: 'none'", extra: { reasoning_effort: 'none' } },
  { nome: "reasoning_effort: 'low'", extra: { reasoning_effort: 'low' } },
  { nome: 'thinking_budget: 0 (extra_body)', extra: { extra_body: { google: { thinking_config: { thinking_budget: 0 } } } } },
  { nome: 'sem ajuste (só max_tokens alto)', extra: {} },
];

const linha = (s) => console.log(s);
let vencedor = null;

for (const modelo of MODELOS) {
  linha(`\n━━━ ${modelo} ━━━`);
  for (const modo of MODOS) {
    process.stdout.write(`   ${modo.nome.padEnd(34)} `);
    try {
      const resp = await ia.chat.completions.create({
        model: modelo,
        temperature: 0.15,
        max_tokens: 4000,
        response_format: { type: 'json_object' },
        messages: [{ role: 'system', content: SISTEMA }, { role: 'user', content: ENTRADA }],
        ...modo.extra,
      });

      const u = resp.usage || {};
      const entrada = u.prompt_tokens || 0;
      const saida = u.completion_tokens || 0;
      const total = u.total_tokens || 0;
      // O que não é entrada nem saída visível é pensamento. É essa a conta que denunciou a v1.
      const pensamento = Math.max(0, total - entrada - saida);

      const bruto = resp.choices?.[0]?.message?.content || '';
      let ok = false, obj = null;
      try { obj = JSON.parse(bruto); ok = Array.isArray(obj.itens) && obj.itens.length > 0; } catch { }

      linha(`${ok ? '✅' : '❌'} entrada ${entrada} · saída ${saida} · PENSAMENTO ${pensamento} · total ${total}`);
      if (ok && !vencedor) vencedor = { modelo, modo: modo.nome, obj, total, pensamento };
    } catch (e) {
      linha(`❌ ${String(e.message).slice(0, 90)}`);
    }
  }
}

if (!vencedor) {
  console.error('\n❌ Nenhuma combinação devolveu JSON completo. Migração para o Gemini fica em suspenso.');
  process.exit(1);
}

const it = vencedor.obj.itens[0] || {};
linha(`\n══════════════════════════════════════════════`);
linha(`🏆 Primeira combinação que funcionou: ${vencedor.modelo} com ${vencedor.modo}`);
linha(`   ${vencedor.total} tokens no total, ${vencedor.pensamento} de pensamento.`);
linha(`\n   FRASE:    ${it.frase}`);
linha(`\n   CONTEXTO: ${it.contexto}\n`);

const admitiu = /não detalha|nao detalha|não especifica|nao especifica|não informa|nao informa|documento oficial|inteiro teor/i.test(it.contexto || '');
linha(admitiu
  ? '   ✅ GUARDA OK: admitiu que a ementa não detalha o conteúdo da mudança.'
  : '   ⚠️  ATENÇÃO: não admitiu a lacuna. Pode estar inventando o que a lei muda - ler acima com cuidado.');
if (/[–—]/.test(`${it.frase} ${it.contexto}`)) linha('   ⚠️  Usou travessão (a limpeza do gerador corrige).');

linha(`\n   No gerador vão 6 votações por chamada, então 689 restantes = ~115 requisições.`);
linha(`   Teto do free tier do Gemini: requisições por DIA, não tokens. Cabe numa rodada.`);
