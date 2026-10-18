// Lógica da página /estado/[uf] (18/10/2026): a bancada de um estado, por casa.
//
// Peça pura, sem rede nem banco: a página e o serviço só buscam os dados e entregam para cá.
// Por isso tem teste (tests/bancadaEstado.test.mjs).
//
// REGRAS DE CONTEÚDO (D-003: só fato e fonte, sem nota e sem adjetivo)
// - Nada aqui diz quem é "bom" ou "ruim". Só ordena e mostra a conta com a regra à vista.
// - Gasto é comparado como MÉDIA MENSAL (total ÷ meses com gasto no ano), a mesma conta do perfil.
//   O total puro castiga quem assumiu no meio do ano (suplente) e não diz nada sobre o ritmo.
// - Dado que a fonte não traz fica como null e a tela diz isso; nunca vira zero nem estimativa.
// - Comparar só faz sentido dentro da mesma casa e do mesmo estado: o teto da verba é o mesmo ali.

import { casaDoPerfil } from './casa.js';
import { pctDoTeto, TETO_CEAP, TETO_CEAPS, TETO_ALESP_SP } from './cotas.js';

export const GRUPOS = [
  { chave: 'federal', titulo: 'Deputados federais', singular: 'deputado federal', plural: 'deputados federais', verba: 'cota parlamentar da Câmara', daPara: (c) => !c.ehSenado && !c.ehEstadual },
  { chave: 'senado', titulo: 'Senadores', singular: 'senador', plural: 'senadores', verba: 'cota do Senado', daPara: (c) => c.ehSenado },
  { chave: 'estadual', titulo: 'Deputados estaduais', singular: 'deputado estadual', plural: 'deputados estaduais', verba: 'verba de gabinete da Assembleia', daPara: (c) => c.ehEstadual },
];

export const norm = (s) => String(s || '').normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();

// O espaço entre "R$" e o número é o inseparável do Intl: sem ele a frase quebra o "R$" sozinho no fim da linha.
export const reais = (v) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(v || 0);

// Média mensal do ano: total ÷ meses com gasto. null quando a linha não diz quantos meses.
export function mediaMensal(d) {
  const meses = Number(d?.meses_com_gasto);
  const total = Number(d?.total);
  if (!(meses > 0) || !Number.isFinite(total)) return null;
  return total / meses;
}

export function mediana(valores) {
  const v = valores.filter((x) => Number.isFinite(x)).sort((a, b) => a - b);
  if (v.length === 0) return null;
  const m = Math.floor(v.length / 2);
  return v.length % 2 ? v[m] : (v[m - 1] + v[m]) / 2;
}

// Teto mensal da verba da casa para o estado. null onde o Lume não tem o teto publicado.
export function tetoDoGrupo(chave, uf) {
  if (chave === 'federal') return TETO_CEAP[uf] || null;
  if (chave === 'senado') return TETO_CEAPS[uf] || null;
  if (chave === 'estadual') return uf === 'SP' ? TETO_ALESP_SP : null;
  return null;
}

// Separa a lista do estado (view radar_gastos) por casa. Casa sem ninguém não aparece.
export function agruparPorCasa(deputados) {
  return GRUPOS
    .map((g) => ({ ...g, lista: (deputados || []).filter((d) => g.daPara(casaDoPerfil(d))) }))
    .filter((g) => g.lista.length > 0);
}

// Situação quando difere de "em exercício". Texto simples, sem adjetivo. Câmara e Senado sem situação
// na fonte dizem isso; as Assembleias não trazem situação nenhuma, então ali nada é dito.
export function rotuloSituacao(d) {
  const s = norm(d?.situacao_atual);
  if (s.startsWith('suplen')) return 'suplente';
  if (s.startsWith('licen')) return 'em licença';
  if (!s && d && !casaDoPerfil(d).ehEstadual) return 'situação: a fonte não informa';
  return null;
}

// Uma linha por parlamentar, com tudo o que a tabela mostra.
// presencaPorId: { [id]: { compareceu, total } } (opcional; ausente = a fonte não informa).
export function montarLinhas(grupo, uf, presencaPorId = {}) {
  return grupo.lista.map((d) => {
    const media = mediaMensal(d);
    const casa = casaDoPerfil(d);
    const uso = media == null ? null : pctDoTeto({ fonteApi: casa.ehSenado ? 'senado' : casa.ehEstadual ? '' : 'camara', casa: casa.ehEstadual ? 'estadual' : null, uf }, media);
    const p = presencaPorId[d.id];
    return {
      d,
      media,
      pct: uso ? uso.pct : null,
      votos: p && p.total > 0 ? { compareceu: p.compareceu, total: p.total } : null,
      situacao: rotuloSituacao(d),
    };
  });
}

const porNome = (a, b) => String(a.d.nome_urna).localeCompare(String(b.d.nome_urna), 'pt-BR');
const nulosPorUltimo = (get, sentido) => (a, b) => {
  const x = get(a); const y = get(b);
  if (x == null && y == null) return porNome(a, b);
  if (x == null) return 1;
  if (y == null) return -1;
  return x === y ? porNome(a, b) : (sentido === 'maior' ? y - x : x - y);
};

export const ORDENS = [
  { valor: 'gasto-maior', rotulo: 'Maior gasto por mês', cmp: nulosPorUltimo((l) => l.media, 'maior'), precisa: 'gasto' },
  { valor: 'gasto-menor', rotulo: 'Menor gasto por mês', cmp: nulosPorUltimo((l) => l.media, 'menor'), precisa: 'gasto' },
  { valor: 'teto-maior', rotulo: 'Maior parte do teto usada', cmp: nulosPorUltimo((l) => l.pct, 'maior'), precisa: 'teto' },
  { valor: 'votos-mais', rotulo: 'Mais votos registrados', cmp: nulosPorUltimo((l) => (l.votos ? l.votos.compareceu : null), 'maior'), precisa: 'votos' },
  { valor: 'votos-menos', rotulo: 'Menos votos registrados', cmp: nulosPorUltimo((l) => (l.votos ? l.votos.compareceu : null), 'menor'), precisa: 'votos' },
  { valor: 'nome', rotulo: 'Nome, de A a Z', cmp: porNome, precisa: null },
];

// Quais ordens a casa oferece: só as que têm dado na coluna.
export function ordensDisponiveis(linhas) {
  const tem = {
    gasto: linhas.some((l) => l.media != null),
    teto: linhas.some((l) => l.pct != null),
    votos: linhas.some((l) => l.votos != null),
  };
  return ORDENS.filter((o) => !o.precisa || tem[o.precisa]);
}

export function ordenar(linhas, valor) {
  const o = ORDENS.find((x) => x.valor === valor) || ORDENS[0];
  return [...linhas].sort(o.cmp);
}

export function filtrar(linhas, busca) {
  const q = norm(busca).trim();
  if (!q) return linhas;
  return linhas.filter((l) => norm(`${l.d.nome_urna} ${l.d.partido_atual}`).includes(q));
}

// Resumo da casa: faixa, mediana e teto. Só com quem tem média calculável.
export function resumoDoGrupo(linhas, chave, uf) {
  const medias = linhas.map((l) => l.media).filter((x) => x != null);
  return {
    n: linhas.length,
    comMedia: medias.length,
    min: medias.length ? Math.min(...medias) : null,
    max: medias.length ? Math.max(...medias) : null,
    mediana: mediana(medias),
    teto: tetoDoGrupo(chave, uf),
  };
}

// A frase que responde "quanto gastam os parlamentares do meu estado". Só fato.
// A mediana só entra com 4 ou mais pessoas: com 3, ela é o valor do meio e não resume nada.
export function fraseResumo(grupo, resumo, ano = 2026) {
  const { comMedia, min, max, mediana: med, teto } = resumo;
  if (comMedia === 0) return null;
  let f;
  if (comMedia === 1) {
    f = `Em ${ano}, o ${grupo.singular} do estado com gasto registrado gastou, em média, ${reais(min)} por mês.`;
  } else {
    f = `Em ${ano}, a média mensal de gasto dos ${comMedia} ${grupo.plural} do estado vai de ${reais(min)} a ${reais(max)}`;
    f += comMedia >= 4 ? `, com mediana de ${reais(med)}.` : '.';
  }
  if (teto) f += ` O teto mensal ${grupo.chave === 'senado' ? 'da cota do Senado' : grupo.chave === 'federal' ? 'da cota da Câmara' : 'da verba'} para o estado é ${reais(teto)}.`;
  return f;
}
