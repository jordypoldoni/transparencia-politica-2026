// APURAÇÃO ao vivo. GET /api/apuracao?cargo=governador&uf=RS[&limite=30]  (02/10/2026)
//
// Lê o arquivo oficial do TSE, reduz (src/lib/apuracaoTse.js) e entrega com cache na borda da
// Vercel: o TSE é consultado, no máximo, uma vez a cada ~30 s por cargo e estado, não uma vez por
// visitante. Nada vai ao banco. cargo: presidente | governador | senador | deputado-federal |
// deputado-estadual. Presidente não leva uf.
//
// Se a Vercel for recusada pelo TSE (o DivulgaCandContas recusa com 403), a resposta diz
// `tse_recusou` com o status: é assim que descobrimos, e o plano B é a tse-ponte do Supabase.
import { urlDoResultado, reduzirResultado } from '../../src/lib/apuracaoTse';

const UA = { 'User-Agent': 'Mozilla/5.0', Accept: 'application/json' };
const emVoo = new Map(); // url -> Promise: visitantes simultâneos no mesmo servidor dividem 1 pedido
const recente = new Map(); // url -> { em, corpo }

async function buscar(url) {
  const r = await fetch(url, { headers: UA, signal: AbortSignal.timeout(15000) });
  if (!r.ok) { const e = new Error(`TSE respondeu ${r.status}`); e.status = r.status; throw e; }
  const texto = (await r.text()).replace(/^﻿/, '');
  if (!texto.trim()) throw new Error('TSE devolveu arquivo vazio');
  return JSON.parse(texto);
}

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ erro: 'use GET' });
  const cargo = String(req.query.cargo || '');
  const alvo = urlDoResultado(cargo, req.query.uf);
  // Combinação inválida: 400 aqui, sem pedir nada ao TSE (404 em excesso bloqueia o IP por 10 min).
  if (!alvo) return res.status(400).json({ erro: 'cargo ou uf inválido' });
  const limite = Math.min(100, Math.max(5, parseInt(req.query.limite, 10) || 30));
  const chave = `${alvo.url}|${limite}`;

  try {
    const r0 = recente.get(chave);
    if (r0 && Date.now() - r0.em < 15000) {
      res.setHeader('Cache-Control', 'public, s-maxage=30, stale-while-revalidate=60');
      return res.status(200).json(r0.corpo);
    }
    if (!emVoo.has(alvo.url)) {
      emVoo.set(alvo.url, buscar(alvo.url).finally(() => setTimeout(() => emVoo.delete(alvo.url), 0)));
    }
    const json = await emVoo.get(alvo.url);
    const corpo = { ...reduzirResultado(json, cargo, { limite }), fonte_url: alvo.url };
    recente.set(chave, { em: Date.now(), corpo });
    res.setHeader('Cache-Control', 'public, s-maxage=30, stale-while-revalidate=60');
    return res.status(200).json(corpo);
  } catch (e) {
    console.error('apuracao:', alvo.url, e.message);
    // Erro também fica na borda por pouco tempo, para uma pane do TSE não virar uma enxurrada.
    res.setHeader('Cache-Control', 'public, s-maxage=10');
    return res.status(502).json({ erro: 'tse_recusou', detalhe: e.message, status_tse: e.status || null });
  }
}
