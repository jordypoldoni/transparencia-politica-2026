// APURAÇÃO DE PRESIDENTE POR ESTADO (12/10/2026): alimenta o mapa do Brasil (decisão D-026).
//
// Lê os 27 arquivos de presidente por UF do TSE e devolve, por estado, as seções, os votos e TODOS os
// candidatos com votos e porcentagem (sobre votos válidos, como o TSE publica). Não calcula nada que o TSE não
// publique e não ordena por ideologia: só por votos. Funções puras aqui; a rota (pages/api/apuracao-estados.js)
// só entrega o resultado com cache. `buscar` é injetado para poder testar sem rede.
//
// 404 em excesso bloqueia o IP por 10 minutos: por isso o estado SP é pedido primeiro como sonda. Se ele não existe
// (ex.: arquivo do 2º turno ainda não publicado), os outros 26 nem são pedidos.
import { urlPresidentePorUf, reduzirResultado, UFS } from './apuracaoTse';

const UF_SONDA = 'SP';

// Reduz o arquivo de um estado ao que o mapa usa.
export function reduzirEstado(json) {
  const r = reduzirResultado(json, 'presidente');
  return {
    uf: r.uf,
    gerado_em: r.gerado_em,
    secoes: r.secoes,
    eleitorado: { total: r.eleitorado.total, comparecimento: r.eleitorado.comparecimento, pct_comparecimento: r.eleitorado.pct_comparecimento },
    votos: { total: r.votos.total, validos: r.votos.validos, brancos: r.votos.brancos, pct_brancos: r.votos.pct_brancos, nulos: r.votos.nulos, pct_nulos: r.votos.pct_nulos },
    candidatos: r.candidatos.map((c) => ({ numero: c.numero, nome: c.nome, partido: c.partido, votos: c.votos, pct: c.pct, segundoTurno: !!c.segundoTurno })),
  };
}

// Lista nacional de candidatos (soma dos estados), em ordem de votos: dá ao mapa uma ordem e uma lista estáveis.
export function candidatosDoBrasil(estados) {
  const mapa = new Map();
  for (const e of Object.values(estados)) {
    for (const c of e.candidatos) {
      const k = `${c.numero}|${c.nome}`;
      const x = mapa.get(k) || { numero: c.numero, nome: c.nome, partido: c.partido, votos: 0, segundoTurno: false };
      x.votos += c.votos;
      x.segundoTurno = x.segundoTurno || c.segundoTurno;
      mapa.set(k, x);
    }
  }
  return [...mapa.values()].sort((a, b) => (b.votos - a.votos) || String(a.nome).localeCompare(String(b.nome), 'pt-BR'));
}

// Tudo apurado? (os 27 estados presentes e todos em 100% das seções)
export function tudoApurado(estados) {
  const lista = Object.values(estados);
  return lista.length === UFS.length && lista.every((e) => e.secoes.total > 0 && e.secoes.totalizadas === e.secoes.total);
}

// Carrega os 27 estados. `buscar(url)` devolve o JSON ou lança erro com `.status`. Retorna
// { turno, estados: {UF: reduzido}, faltando: [UF], naoPublicado: bool, erros: n, candidatos, apurado }.
export async function carregarEstados({ turno = 1, env = process.env, buscar }) {
  const alvos = UFS.map((uf) => ({ uf, ...urlPresidentePorUf(uf, env, turno) }));
  if (alvos.some((a) => !a.url)) return null; // turno inválido
  const estados = {};
  const faltando = [];
  let erros = 0;
  let naoPublicado = false;

  const ler = async (a) => {
    try { estados[a.uf] = reduzirEstado(await buscar(a.url)); } catch (e) {
      faltando.push(a.uf);
      if (e && e.status === 404) naoPublicado = true; else erros++;
    }
  };

  const sonda = alvos.find((a) => a.uf === UF_SONDA);
  await ler(sonda);
  if (faltando.includes(UF_SONDA) && naoPublicado) {
    // Sem o arquivo de SP, o resto também não deve existir: não insiste (evita enxurrada de 404).
    return { turno: sonda.turno, estados: {}, faltando: UFS.slice(), naoPublicado: true, erros, candidatos: [], apurado: false };
  }
  await Promise.all(alvos.filter((a) => a.uf !== UF_SONDA).map(ler));
  faltando.sort();
  return { turno: sonda.turno, estados, faltando, naoPublicado, erros, candidatos: candidatosDoBrasil(estados), apurado: tudoApurado(estados) };
}
