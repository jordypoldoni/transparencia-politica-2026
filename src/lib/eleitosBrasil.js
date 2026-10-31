// ELEITOS DO PAÍS (31/10/2026, etapa 3 do bloco "Eleições" da home): resumo para quem não tem estado escolhido.
// Soma, estado por estado, os eleitos da Câmara (513) e do Senado (54) por partido, e traz os 27 governadores
// (eleito no 1º turno, ou finalistas; e, nos 6 estados com 2º turno, o resultado do 2º turno).
// Funções puras; a rota (pages/api/eleitos-brasil.js) só entrega com cache. `buscar` é injetado para testar sem rede.
// 404 em excesso bloqueia o IP por 10 minutos: SP/governador é pedido primeiro como sonda; se não existe, para.
import { urlDoResultado, reduzirResultado, UFS } from './apuracaoTse';
import { SEGUNDO_TURNO } from './turnos';

const UF_SONDA = 'SP';
const SIMULTANEOS = 9;

const resumo = (c) => ({ nome: c.nome, partido: c.partido, pct: c.pct, votos: c.votos, eleito: !!c.eleito });
const completo = (r) => r.secoes.total > 0 && r.secoes.totalizadas === r.secoes.total;

// Soma uma contagem { PARTIDO: qtd } com os eleitos de uma lista.
export function somarEleitos(contagem, eleitos) {
  for (const e of eleitos || []) {
    const p = String(e?.partido || '').trim();
    if (p) contagem[p] = (contagem[p] || 0) + 1;
  }
  return contagem;
}

// Governador de um estado a partir do resultado reduzido do 1º turno e, se houver, do 2º.
export function governadorDoEstado(uf, r1, r2) {
  const cands = r1?.candidatos || [];
  const eleito = cands.find((c) => c.eleito) || null;
  const finalistas = eleito ? [] : cands.filter((c) => c.segundoTurno).slice(0, 2).map(resumo);
  let segundo = null;
  if (r2 && (r2.candidatos || []).length >= 2) {
    const dois = [...r2.candidatos].sort((a, b) => b.votos - a.votos).slice(0, 2).map(resumo);
    segundo = { candidatos: dois, eleito: dois.find((c) => c.eleito) || null, apurado: completo(r2) };
  }
  return { uf, eleito: eleito ? resumo(eleito) : null, finalistas, segundo, apurado: r1 ? completo(r1) : false };
}

// Carrega o país. Retorna { camara:{total,contagem}, senado:{total,contagem}, governadores:[...], faltando:[UF], naoPublicado, apurado }.
export async function carregarEleitosBrasil({ env = process.env, buscar }) {
  const camara = {}; const senado = {};
  const gov = {}; const gov2 = {};
  const faltando = new Set();
  let naoPublicado = false;
  let tudo100 = true;

  const ler = async (cargo, uf, turno) => {
    const alvo = urlDoResultado(cargo, uf, env, turno);
    if (!alvo) return null;
    try { return reduzirResultado(await buscar(alvo.url), cargo, { limite: 5 }); } catch (e) {
      faltando.add(uf);
      if (e && e.status === 404) naoPublicado = true;
      return null;
    }
  };

  const sonda = await ler('governador', UF_SONDA, 1);
  if (!sonda && naoPublicado) return { camara: { total: 0, contagem: {} }, senado: { total: 0, contagem: {} }, governadores: [], faltando: UFS.slice(), naoPublicado: true, apurado: false };
  gov[UF_SONDA] = sonda;

  const tarefas = [];
  for (const uf of UFS) {
    if (uf !== UF_SONDA) tarefas.push(async () => { gov[uf] = await ler('governador', uf, 1); });
    tarefas.push(async () => { const r = await ler('senador', uf, 1); if (r) { somarEleitos(senado, r.eleitos); if (!completo(r)) tudo100 = false; } });
    tarefas.push(async () => { const r = await ler('deputado-federal', uf, 1); if (r) { somarEleitos(camara, r.eleitos); if (!completo(r)) tudo100 = false; } });
    if (SEGUNDO_TURNO.ufs.includes(uf)) tarefas.push(async () => { gov2[uf] = await ler('governador', uf, 2); });
  }
  let i = 0;
  await Promise.all(Array.from({ length: SIMULTANEOS }, async () => { while (i < tarefas.length) { const k = i++; await tarefas[k](); } }));

  const governadores = UFS.map((uf) => (gov[uf] ? governadorDoEstado(uf, gov[uf], gov2[uf]) : null)).filter(Boolean);
  if (governadores.some((g) => !g.apurado || (SEGUNDO_TURNO.ufs.includes(g.uf) && g.segundo && !g.segundo.apurado))) tudo100 = false;
  const soma = (m) => Object.values(m).reduce((s, q) => s + q, 0);
  return {
    camara: { total: soma(camara), contagem: camara },
    senado: { total: soma(senado), contagem: senado },
    governadores,
    faltando: [...faltando].sort(),
    naoPublicado,
    apurado: tudo100 && faltando.size === 0 && governadores.length === UFS.length,
  };
}
