// _testar_chave_grok.js — diagnóstico rápido: a chave de IA do .env está válida?
// Roda: node coletores/_testar_chave_grok.js
// (arquivo descartável — não faz parte do coletor, é só pra debugar erro de API key)
//
// GOTCHA descoberto (20/08): a chave que o Jordy criou começa com "gsk_" — esse é o
// prefixo da GROQ (api.groq.com, empresa de inferência rápida — Llama, Kimi, etc.),
// NÃO da xAI/Grok (Elon Musk, chaves "xai-...", api.x.ai). Nomes parecidos, empresas
// diferentes. Ambas têm API compatível com o formato OpenAI, então o código muda
// pouco — só a baseURL e os nomes de modelo.

import 'dotenv/config';
import OpenAI from 'openai';

const key = process.env.GROK_API_KEY || '';

if (!key) {
  console.error('❌ GROK_API_KEY não foi lida do .env (variável ausente ou .env não está na mesma pasta).');
  process.exit(1);
}

const ehGroq = key.startsWith('gsk_');
const baseURL = ehGroq ? 'https://api.groq.com/openai/v1' : 'https://api.x.ai/v1';
console.log(`🔑 Chave lida: "${key.slice(0, 6)}...${key.slice(-4)}" (${key.length} caracteres) → detectada como ${ehGroq ? 'GROQ (gsk_...)' : 'xAI/Grok (xai-...)'}, testando em ${baseURL}`);

const client = new OpenAI({ apiKey: key, baseURL });

try {
  const resp = await client.models.list();
  console.log(`✅ Chave válida! Modelos disponíveis na sua conta ${ehGroq ? 'Groq' : 'xAI'}:`);
  for (const m of resp.data) console.log('   -', m.id);
} catch (e) {
  console.error('❌ Erro ao validar a chave:', e.status, e.message);
  if (e.status === 401 || e.status === 400) {
    console.error(`   → Confirma em ${ehGroq ? 'https://console.groq.com/keys' : 'https://console.x.ai'} se essa chave existe e está ATIVA.`);
  }
}
