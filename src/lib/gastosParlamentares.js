// Lógica da página /gastos-parlamentares (21/10/2026): a comparação justa dos gastos dos parlamentares.
//
// Peça pura, sem rede nem banco (a página e o serviço só buscam e entregam para cá). Tem teste:
// tests/gastosParlamentares.test.mjs.
//
// REGRAS DE CONTEÚDO (D-003, só fato e fonte, sem nota e sem adjetivo)
// - Ninguém recebe número de posição. A barra mostra quanto da verba foi usado; a ordem é só a da lista.
// - A comparação é pela cota do ESTADO de cada um (o teto mensal muda de estado para estado) e só pelos
//   meses em que a pessoa estava em exercício e que já fecharam (a conta vive em bancadaEstado.mediaMensal).
// - Câmara e Senado têm teto publicado por estado: o ranking é em % do teto. As Assembleias não têm teto
//   publicado em quase nenhum estado e cada uma tem a sua verba: só se comparam dentro do MESMO estado, em
//   reais por mês.
// - Passagens aéreas e divulgação da atividade parlamentar têm seção própria (a divulgação tem regra na eleição
//   e as passagens SIGEPA da Câmara não saem no arquivo oficial de 2026). Dado que a fonte não traz fica
//   null/ausente e a tela diz isso; nunca vira zero nem estimativa.

import { mediaMensal, mediana } from './bancadaEstado.js';
import { TETO_CEAP, TETO_CEAPS, TETO_ALESP_SP } from './cotas.js';

export const CASAS = [
  { chave: 'camara', rotulo: 'Câmara', singular: 'deputado federal', plural: 'deputados federais', casaAgregada: 'Câmara', temTeto: true },
  { chave: 'senado', rotulo: 'Senado', singular: 'senador', plural: 'senadores', casaAgregada: 'Senado', temTeto: true },
  { chave: 'assembleias', rotulo: 'Assembleias', singular: 'deputado estadual', plural: 'deputados estaduais', casaAgregada: null, temTeto: false },
];

export function chaveDaCasa(casaRadar) {
  const c = String(casaRadar || '');
  if (c === 'Câmara') return 'camara';
  if (c === 'Senado') return 'senado';
  if (/^Assembleia/i.test(c)) return 'assembleias';
  return null;
}

export const MINIMOS = [0, 1, 3, 6];
export const MINIMO_PADRAO = 3;

function tetoDe(chave, uf) {
  if (chave === 'camara') return TETO_CEAP[uf] || null;
  if (chave === 'senado') return TETO_CEAPS[uf] || null;
  if (chave === 'assembleias' && uf === 'SP') return TETO_ALESP_SP;
  return null;
}

// Uma linha por parlamentar, com média, % do teto e meses contados.
export function linhasDaCasa(radar, chave) {
  return (radar || [])
    .filter((d) => chaveDaCasa(d.casa) === chave)
    .map((d) => {
      const media = mediaMensal(d);
      const teto = tetoDe(chave, d.uf_sede);
      const meses = d.meses_base != null ? Number(d.meses_base) : (d.meses_com_gasto != null ? Number(d.meses_com_gasto) : 0);
      return {
        d,
        media,
        meses,
        teto,
        pct: media != null && teto ? Math.round((media / teto) * 100) : null,
      };
    });
}

// Comparação justa. Devolve { itens, foraDoMinimo, semMedia, precisaEstado }.
// - ordem: 'maior' (quem mais usou primeiro) ou 'menor' (quem menos usou primeiro).
// - minMeses: quem tem menos meses contados que isso fica fora da lista (e é contado, nunca descartado em silêncio).
// - Assembleias exigem um estado: comparar assembleias de estados diferentes não faz sentido.
export function comparacaoJusta(linhas, chave, { uf = '', partido = '', minMeses = MINIMO_PADRAO, ordem = 'maior' } = {}) {
  if (chave === 'assembleias' && !uf) return { itens: [], foraDoMinimo: 0, semMedia: 0, precisaEstado: true };
  let base = linhas;
  if (uf) base = base.filter((l) => l.d.uf_sede === uf);
  if (partido) base = base.filter((l) => l.d.partido_atual === partido);
  const comMedia = base.filter((l) => l.media != null);
  const semMedia = base.length - comMedia.length;
  const dentro = comMedia.filter((l) => l.meses >= minMeses);
  const foraDoMinimo = comMedia.length - dentro.length;
  const valor = (l) => (chave === 'assembleias' ? l.media : l.pct);
  const itens = [...dentro].sort((a, b) => {
    const x = valor(a); const y = valor(b);
    if (x == null && y == null) return String(a.d.nome_urna).localeCompare(String(b.d.nome_urna), 'pt-BR');
    if (x == null) return 1;
    if (y == null) return -1;
    const dif = ordem === 'menor' ? x - y : y - x;
    return dif || String(a.d.nome_urna).localeCompare(String(b.d.nome_urna), 'pt-BR');
  });
  return { itens, foraDoMinimo, semMedia, precisaEstado: false };
}

// Partidos presentes, para o filtro. Ordem alfabética.
export function partidosDe(linhas) {
  return [...new Set(linhas.map((l) => l.d.partido_atual).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'pt-BR'));
}

// Estados presentes, para o filtro.
export function ufsDe(linhas) {
  return [...new Set(linhas.map((l) => l.d.uf_sede).filter(Boolean))].sort();
}

// Mediana do uso do teto por estado (só quem entra na comparação). Estado sem ninguém elegível fica de fora.
export function usoPorEstado(linhas, { minMeses = MINIMO_PADRAO } = {}) {
  const grupos = new Map();
  for (const l of linhas) {
    if (l.pct == null || l.meses < minMeses) continue;
    if (!grupos.has(l.d.uf_sede)) grupos.set(l.d.uf_sede, []);
    grupos.get(l.d.uf_sede).push(l.pct);
  }
  return [...grupos.entries()]
    .map(([uf, v]) => ({ uf, mediana: Math.round(mediana(v)), n: v.length }))
    .sort((a, b) => b.mediana - a.mediana || a.uf.localeCompare(b.uf));
}

// Um mês só entra como "fechado" 30 dias depois do fim dele (mesma regra da média justa).
export function mesAberto(ano, mes, hoje = new Date()) {
  const fim = new Date(Date.UTC(ano, mes, 0)); // dia 0 do mês seguinte = último dia deste mês
  const limite = new Date(fim.getTime() + 30 * 86400000);
  return limite.getTime() > hoje.getTime();
}

const linhasAgreg = (agreg, casa, ano) => (agreg || []).filter((r) => r.casa === casa && Number(r.ano) === Number(ano));

// Total por mês de um ano. aberto = mês que ainda recebe notas (não comparar com o ano anterior sem aviso).
export function serieMensal(agreg, casa, ano, hoje = new Date()) {
  const meses = Array.from({ length: 12 }, (_, i) => ({ mes: i + 1, total: 0, temDado: false, aberto: mesAberto(ano, i + 1, hoje) }));
  for (const r of linhasAgreg(agreg, casa, ano)) {
    const m = meses[Number(r.mes) - 1];
    if (!m) continue;
    m.total += Number(r.total) || 0;
    m.temDado = true;
  }
  return meses;
}

// Gasto por tipo no ano, do maior para o menor. Só tipos com valor positivo (estorno e valor negativo
// ficam fora do gráfico de barras; o total do ano continua somando tudo).
export function porTipo(agreg, casa, ano) {
  const mapa = new Map();
  let total = 0;
  for (const r of linhasAgreg(agreg, casa, ano)) {
    const v = Number(r.total) || 0;
    total += v;
    mapa.set(r.tipo_despesa, (mapa.get(r.tipo_despesa) || 0) + v);
  }
  const tipos = [...mapa.entries()].map(([tipo, valor]) => ({ tipo, valor })).filter((x) => x.valor > 0).sort((a, b) => b.valor - a.valor);
  return { tipos, total };
}

export const ehDivulgacao = (tipo) => /^divulga/i.test(String(tipo || ''));
export const ehPassagem = (tipo) => /^passagem|^passagens/i.test(String(tipo || ''));
export const ehSigepa = (tipo) => /sigepa/i.test(String(tipo || ''));

// Divulgação da atividade parlamentar mês a mês, de um ano.
export function divulgacaoMensal(agreg, casa, ano) {
  const meses = Array.from({ length: 12 }, (_, i) => ({ mes: i + 1, total: 0, temDado: false }));
  for (const r of linhasAgreg(agreg, casa, ano)) {
    if (!ehDivulgacao(r.tipo_despesa)) continue;
    const m = meses[Number(r.mes) - 1];
    if (!m) continue;
    m.total += Number(r.total) || 0;
    m.temDado = true;
  }
  return meses;
}

// Passagens aéreas por ano: total, por mês e quanto é SIGEPA. Um ano sem nenhuma linha SIGEPA tem sigepa = null
// (a fonte não trouxe), nunca 0.
export function passagensPorAno(agreg, casa, anos) {
  return anos.map((ano) => {
    const meses = Array.from({ length: 12 }, (_, i) => ({ mes: i + 1, total: 0 }));
    let total = 0; let sigepa = 0; let temSigepa = false;
    for (const r of linhasAgreg(agreg, casa, ano)) {
      if (!ehPassagem(r.tipo_despesa)) continue;
      const v = Number(r.total) || 0;
      total += v;
      meses[Number(r.mes) - 1].total += v;
      if (ehSigepa(r.tipo_despesa)) { sigepa += v; temSigepa = true; }
    }
    return { ano, total, sigepa: temSigepa ? sigepa : null, meses };
  });
}

// Anos que existem nos dados agregados da casa, do mais novo para o mais antigo.
export function anosDisponiveis(agreg, casa) {
  return [...new Set((agreg || []).filter((r) => r.casa === casa).map((r) => Number(r.ano)))].sort((a, b) => b - a);
}
