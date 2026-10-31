// ELEITOS DO PAÍS (31/10/2026): alimenta o resumo "Todo o Brasil" do bloco Eleições da home (etapa 3).
// GET /api/eleitos-brasil. Lê governador, senador e deputado federal dos 27 estados (e o governador do 2º turno nos 6
// estados que tiveram) e entrega com cache na borda da Vercel: 1 hora quando tudo está em 100%, 30 s caso contrário.
// Nada vai ao banco. Se o TSE ainda não publicou (404), responde 404 e lembra por 60 s, sem insistir.
import { carregarEleitosBrasil } from '../../src/lib/eleitosBrasil';

const UA = { 'User-Agent': 'Mozilla/5.0', Accept: 'application/json' };
let emVoo = null;
let recente = null; // { em, corpo }
let q404 = 0;

async function buscar(url) {
  const r = await fetch(url, { headers: UA, signal: AbortSignal.timeout(15000) });
  if (!r.ok) { const e = new Error(`TSE respondeu ${r.status}`); e.status = r.status; throw e; }
  const texto = (await r.text()).replace(/^﻿/, '');
  if (!texto.trim()) throw new Error('TSE devolveu arquivo vazio');
  return JSON.parse(texto);
}

const cacheDe = (c) => (c.apurado ? 'public, s-maxage=3600, stale-while-revalidate=86400' : 'public, s-maxage=30, stale-while-revalidate=60');

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ erro: 'use GET' });
  try {
    if (q404 && Date.now() - q404 < 60000) {
      res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=120');
      return res.status(404).json({ erro: 'tse_nao_publicou' });
    }
    if (recente && Date.now() - recente.em < (recente.corpo.apurado ? 600000 : 10000)) {
      res.setHeader('Cache-Control', cacheDe(recente.corpo));
      return res.status(200).json(recente.corpo);
    }
    if (!emVoo) emVoo = carregarEleitosBrasil({ env: process.env, buscar }).finally(() => setTimeout(() => { emVoo = null; }, 0));
    const corpo = await emVoo;
    if (corpo.naoPublicado && corpo.governadores.length === 0) {
      q404 = Date.now();
      res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=120');
      return res.status(404).json({ erro: 'tse_nao_publicou' });
    }
    if (corpo.governadores.length === 0) {
      res.setHeader('Cache-Control', 'public, s-maxage=10');
      return res.status(502).json({ erro: 'tse_recusou' });
    }
    recente = { em: Date.now(), corpo };
    res.setHeader('Cache-Control', cacheDe(corpo));
    return res.status(200).json(corpo);
  } catch (e) {
    console.error('eleitos-brasil:', e.message);
    res.setHeader('Cache-Control', 'public, s-maxage=10');
    return res.status(502).json({ erro: 'tse_recusou', detalhe: e.message });
  }
}
