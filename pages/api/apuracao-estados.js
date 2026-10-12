// APURAÇÃO DE PRESIDENTE POR ESTADO (12/10/2026): alimenta o mapa do Brasil (D-026).
// GET /api/apuracao-estados[?turno=1|2]. Lê os 27 arquivos do TSE (src/lib/apuracaoEstados.js) e entrega com cache
// na borda da Vercel: 1 hora quando os 27 estados já estão em 100% (o caso do 1º turno), 10 s caso contrário.
// Nada vai ao banco. Se um estado falhar, os outros saem e `faltando` lista quais; se o TSE ainda não publicou
// (404), responde 404 `tse_nao_publicou` e lembra por 60 s, sem insistir. Não altera nenhuma rota existente.
import { turnoValido } from '../../src/lib/turnos';
import { carregarEstados } from '../../src/lib/apuracaoEstados';

const UA = { 'User-Agent': 'Mozilla/5.0', Accept: 'application/json' };
const NAO_PUBLICADO_MS = 60000;
const emVoo = new Map(); // turno -> Promise: visitantes simultâneos dividem 1 carga
const recente = new Map(); // turno -> { em, corpo }
const naoPublicado = new Map(); // turno -> instante do último 404

async function buscar(url) {
  const r = await fetch(url, { headers: UA, signal: AbortSignal.timeout(15000) });
  if (!r.ok) { const e = new Error(`TSE respondeu ${r.status}`); e.status = r.status; throw e; }
  const texto = (await r.text()).replace(/^﻿/, '');
  if (!texto.trim()) throw new Error('TSE devolveu arquivo vazio');
  return JSON.parse(texto);
}

const cacheDe = (corpo) => (corpo.apurado ? 'public, s-maxage=3600, stale-while-revalidate=86400' : 'public, s-maxage=10, stale-while-revalidate=20');
const memoriaMs = (corpo) => (corpo.apurado ? 600000 : 5000);

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ erro: 'use GET' });
  const turno = turnoValido(req.query.turno);
  if (!turno) return res.status(400).json({ erro: 'turno inválido' });
  try {
    const q404 = naoPublicado.get(turno);
    if (q404 && Date.now() - q404 < NAO_PUBLICADO_MS) {
      res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=120');
      return res.status(404).json({ erro: 'tse_nao_publicou', status_tse: 404 });
    }
    const r0 = recente.get(turno);
    if (r0 && Date.now() - r0.em < memoriaMs(r0.corpo)) {
      res.setHeader('Cache-Control', cacheDe(r0.corpo));
      return res.status(200).json(r0.corpo);
    }
    if (!emVoo.has(turno)) {
      emVoo.set(turno, carregarEstados({ turno, env: process.env, buscar }).finally(() => setTimeout(() => emVoo.delete(turno), 0)));
    }
    const r = await emVoo.get(turno);
    if (!r) return res.status(400).json({ erro: 'turno inválido' });
    if (r.naoPublicado && Object.keys(r.estados).length === 0) {
      naoPublicado.set(turno, Date.now());
      res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=120');
      return res.status(404).json({ erro: 'tse_nao_publicou', status_tse: 404 });
    }
    if (Object.keys(r.estados).length === 0) {
      res.setHeader('Cache-Control', 'public, s-maxage=10');
      return res.status(502).json({ erro: 'tse_recusou', detalhe: 'nenhum estado pôde ser lido', status_tse: null });
    }
    const corpo = { turno: r.turno, apurado: r.apurado, faltando: r.faltando, candidatos: r.candidatos, estados: r.estados };
    recente.set(turno, { em: Date.now(), corpo });
    res.setHeader('Cache-Control', cacheDe(corpo));
    return res.status(200).json(corpo);
  } catch (e) {
    console.error('apuracao-estados:', e.message);
    res.setHeader('Cache-Control', 'public, s-maxage=10');
    return res.status(502).json({ erro: 'tse_recusou', detalhe: e.message, status_tse: e.status || null });
  }
}
