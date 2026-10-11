// FINALISTAS DO 2º TURNO: descobre sozinho quem está na disputa, sem lista escrita à mão. (11/10/2026)
//
// Para cada disputa (presidente e governador de cada UF com 2º turno, ver ./turnos.js), em ordem:
//   1. o arquivo do 2º turno do TSE (eleição 6258 para presidente, 6260 para governador): é a fonte
//      oficial, e se um finalista for substituído (desistência, impugnação) o arquivo muda e a página
//      acompanha;
//   2. se esse arquivo ainda não existe ou falhou (ex.: TO em 11/10, 404), o resultado do 1º turno,
//      onde os finalistas vêm com a situação "2º turno";
//   3. se nenhum dos dois responde, a disputa vai em `falhas` e quem usa avisa que não conseguiu
//      consultar. Nunca se inventa nem se mostra lista velha.
//
// Chamado pelo servidor ao montar a página, não pelo navegador. O resultado fica em memória por 1 hora
// (2 minutos se houve falha), então o TSE recebe, no máximo, 7 a 14 pedidos por hora por servidor.
// 404 em excesso bloqueia o IP por 10 minutos: por isso só se pede o que a lista de ./turnos.js
// diz que existe no 2º turno.
import { ELEICOES, SEGUNDO_TURNO, ehSegundoTurno } from './turnos';

const BASE = 'https://resultados.tse.jus.br/oficial/ele2026';
const UA = { 'User-Agent': 'Mozilla/5.0', Accept: 'application/json' };
const VALE_MS = 60 * 60 * 1000; // resultado sem falhas
const VALE_COM_FALHA_MS = 2 * 60 * 1000;

let guardado = null; // { em, valor }
let emVoo = null; // Promise: visitantes simultâneos no mesmo servidor dividem a mesma consulta

const urlDoArquivo = (eleicao, pasta, cd) => `${BASE}/${eleicao}/dados/${pasta}/${pasta}-c${cd}-e${String(eleicao).padStart(6, '0')}-u.json`;

async function ler(url) {
  try {
    const r = await fetch(url, { headers: UA, signal: AbortSignal.timeout(15000) });
    if (!r.ok) return { ok: false, status: r.status };
    const texto = (await r.text()).replace(/^﻿/, '');
    if (!texto.trim()) return { ok: false, status: 0 };
    return { ok: true, json: JSON.parse(texto) };
  } catch (e) {
    return { ok: false, status: 0 };
  }
}

// Candidatos de um arquivo do TSE. `soSegundoTurno`: no arquivo do 1º turno, só quem tem situação "2º turno".
export function extrairCandidatos(json, { soSegundoTurno = false } = {}) {
  const lista = [];
  const cargo = (json && json.carg && json.carg[0]) || {};
  for (const agr of cargo.agr || []) {
    for (const par of agr.par || []) {
      for (const cd of par.cand || []) {
        if (soSegundoTurno && !ehSegundoTurno(cd.st)) continue;
        lista.push({ numero: String(cd.n), sq: cd.sqcand ? String(cd.sqcand) : null, nome: cd.nmu || cd.nm || '', partido: par.sg || '' });
      }
    }
  }
  return lista;
}

// { fonte: '2turno' | '1turno', lista } ou null se nenhum dos dois arquivos respondeu.
async function candidatosDaDisputa(pasta, cd, nacional) {
  const el1 = nacional ? ELEICOES[1].federal : ELEICOES[1].estadual;
  const el2 = nacional ? ELEICOES[2].federal : ELEICOES[2].estadual;
  const r2 = await ler(urlDoArquivo(el2, pasta, cd));
  if (r2.ok) {
    const lista = extrairCandidatos(r2.json);
    if (lista.length) return { fonte: '2turno', lista };
  }
  const r1 = await ler(urlDoArquivo(el1, pasta, cd));
  if (r1.ok) {
    const lista = extrairCandidatos(r1.json, { soSegundoTurno: true });
    if (lista.length) return { fonte: '1turno', lista };
  }
  return null;
}

async function consultar(agora) {
  const disputas = [{ chave: 'presidente', pasta: 'br', cd: '0001', nacional: true }]
    .concat(SEGUNDO_TURNO.ufs.map((uf) => ({ chave: uf, pasta: uf.toLowerCase(), cd: '0003', nacional: false })));
  const respostas = await Promise.all(disputas.map((d) => candidatosDaDisputa(d.pasta, d.cd, d.nacional)));
  const valor = { presidente: null, governador: {}, fontes: {}, falhas: [], gerado_em: new Date(agora()).toISOString() };
  disputas.forEach((d, i) => {
    const r = respostas[i];
    if (!r) { valor.falhas.push(d.chave); if (d.chave !== 'presidente') valor.governador[d.chave] = null; return; }
    valor.fontes[d.chave] = r.fonte;
    if (d.chave === 'presidente') valor.presidente = r.lista; else valor.governador[d.chave] = r.lista;
  });
  return valor;
}

// { presidente: [{numero, sq, nome, partido}] | null, governador: { AC: [...] | null, ... },
//   fontes: { presidente: '2turno', TO: '1turno', ... }, falhas: ['TO', ...], gerado_em }
export async function finalistasSegundoTurno({ agora = Date.now } = {}) {
  if (guardado && agora() - guardado.em < (guardado.valor.falhas.length ? VALE_COM_FALHA_MS : VALE_MS)) return guardado.valor;
  if (!emVoo) {
    emVoo = consultar(agora).then((valor) => { guardado = { em: agora(), valor }; return valor; }).finally(() => { emVoo = null; });
  }
  return emVoo;
}

export function limparGuardadoParaTeste() { guardado = null; emVoo = null; }
