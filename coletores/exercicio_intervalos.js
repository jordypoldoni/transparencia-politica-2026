// Conversão pura (sem rede, sem banco) do histórico de exercício parlamentar em intervalos.
// Vive em arquivo próprio para ser testada (tests/exercicioIntervalos.test.mjs).
//
// MODELO: uma linha por intervalo em que o parlamentar esteve numa situação.
//   data_fim vazia = o intervalo ainda vale.
// SÓ 'Exercício' conta como mês trabalhado (função SQL meses_em_exercicio, regra dos 15 dias).

const semAcento = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

// 'Exercício' é o único valor que a regra usa; os demais ficam como a fonte escreveu.
export function normalizaSituacao(s) {
  const t = semAcento(s);
  if (!t) return null;
  if (t === 'exercicio') return 'Exercício';
  return String(s).trim();
}

const soData = (v) => (v ? String(v).slice(0, 10) : null);
const diaAnterior = (iso) => {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
};

// CÂMARA: /deputados/{id}/historico devolve EVENTOS (dataHora, situacao, condicaoEleitoral, descricaoStatus).
// Cada evento vale até o próximo. Eventos seguidos com a mesma situação e condição (troca de partido,
// por exemplo) viram um intervalo só.
export function intervalosCamara(eventos) {
  const evs = (Array.isArray(eventos) ? eventos : [])
    .map((e) => ({
      inicio: soData(e.dataHora),
      situacao: normalizaSituacao(e.situacao),
      condicao: e.condicaoEleitoral ? String(e.condicaoEleitoral).trim() : null,
      motivo: e.descricaoStatus ? String(e.descricaoStatus).trim() : null,
    }))
    .filter((e) => e.inicio && e.situacao)
    .sort((a, b) => (a.inicio < b.inicio ? -1 : a.inicio > b.inicio ? 1 : 0));

  const fundidos = [];
  for (const e of evs) {
    const ult = fundidos[fundidos.length - 1];
    if (ult && ult.situacao === e.situacao && ult.condicao === e.condicao) continue;
    fundidos.push({ ...e });
  }

  const saida = [];
  for (let i = 0; i < fundidos.length; i++) {
    const e = fundidos[i];
    const prox = fundidos[i + 1];
    let fim = prox ? (prox.inicio > e.inicio ? diaAnterior(prox.inicio) : e.inicio) : null;
    saida.push({ data_inicio: e.inicio, data_fim: fim, situacao: e.situacao, condicao: e.condicao, motivo: e.motivo });
  }
  // Duas situações diferentes no mesmo dia: a última vence, a anterior some (chave única agente+início+situação).
  return saida.filter((r, i, a) => !(r.data_fim && r.data_fim === r.data_inicio && a[i + 1] && a[i + 1].data_inicio === r.data_inicio));
}

// SENADO: Mandato/Exercicios/Exercicio já vem em intervalos (DataInicio, DataFim, causa do afastamento).
// Cada Exercicio é um período em que a pessoa exerceu o mandato.
export function intervalosSenado(mandatos) {
  const arr = (x) => (x == null ? [] : Array.isArray(x) ? x : [x]);
  const saida = [];
  for (const m of arr(mandatos)) {
    const condicao = m?.DescricaoParticipacao ? String(m.DescricaoParticipacao).trim() : null;
    for (const ex of arr(m?.Exercicios?.Exercicio)) {
      const ini = soData(ex?.DataInicio);
      if (!ini) continue;
      saida.push({
        data_inicio: ini,
        data_fim: soData(ex?.DataFim),
        situacao: 'Exercício',
        condicao,
        motivo: ex?.DescricaoCausaAfastamento ? String(ex.DescricaoCausaAfastamento).trim() : null,
      });
    }
  }
  // Chave única (agente, início, situação): se a fonte repetir o início, fica o de fim mais tardio.
  const porChave = new Map();
  for (const r of saida) {
    const k = `${r.data_inicio}|${r.situacao}`;
    const o = porChave.get(k);
    if (!o || (o.data_fim && (!r.data_fim || r.data_fim > o.data_fim))) porChave.set(k, r);
  }
  return [...porChave.values()].sort((a, b) => (a.data_inicio < b.data_inicio ? -1 : 1));
}
