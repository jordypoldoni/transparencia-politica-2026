// Leitura pura da resposta de /senadores/{codigo}/recursos-utilizados (API de dados abertos do Senado).
// Forma esperada (conferida em 19/10/2026 com o Mourao 2026):
//   { statusCode, msg, data: [{ parlamentar, ano,
//       cotas: { despesas: [{recurso, valor}], totalValor },
//       gastosNaoInclusos: { despesas: [{recurso, valor}], totalValor },
//       beneficios: [{beneficio, utilizacao}],
//       pessoal: [{local, quantidade, vinculos: [{vinculo, quantidade}], quantidadeTotalEscritorio}] }] }
// Estrutura inesperada LANCA erro: melhor falhar a rodada do que gravar um bloco torto.
const num = (v) => (v === null || v === undefined || v === '' ? null : Number(v));
const ehNumero = (v) => v === null || (typeof v === 'number' && Number.isFinite(v));

function despesas(bloco, nome) {
  if (!bloco || !Array.isArray(bloco.despesas)) throw new Error(`recursos-utilizados: bloco "${nome}" sem lista de despesas`);
  const itens = bloco.despesas.map((d) => ({ recurso: String(d.recurso ?? '').trim(), valor: num(d.valor) }));
  if (itens.some((i) => !i.recurso || !ehNumero(i.valor))) throw new Error(`recursos-utilizados: item invalido em "${nome}"`);
  const total = num(bloco.totalValor);
  if (!ehNumero(total)) throw new Error(`recursos-utilizados: totalValor invalido em "${nome}"`);
  return { itens, total };
}

export function lerRecursos(json) {
  if (!json || !Array.isArray(json.data)) throw new Error('recursos-utilizados: resposta sem "data"');
  if (json.data.length === 0) return null; // senador sem registro naquele ano
  if (json.data.length > 1) throw new Error(`recursos-utilizados: ${json.data.length} registros para um senador`);
  const r = json.data[0];
  const cotas = despesas(r.cotas, 'cotas');
  const nao = despesas(r.gastosNaoInclusos, 'gastosNaoInclusos');
  const beneficios = (Array.isArray(r.beneficios) ? r.beneficios : []).map((b) => ({ beneficio: String(b.beneficio ?? '').trim(), utilizacao: String(b.utilizacao ?? '').trim() }));
  const pessoal = (Array.isArray(r.pessoal) ? r.pessoal : []).map((p) => ({
    local: String(p.local ?? '').trim(),
    quantidade: num(p.quantidade),
    vinculos: (Array.isArray(p.vinculos) ? p.vinculos : []).map((v) => ({ vinculo: String(v.vinculo ?? '').trim(), quantidade: num(v.quantidade) })),
  }));
  return { cotas_total: cotas.total, nao_inclusos: nao.itens, nao_inclusos_total: nao.total, beneficios, pessoal };
}
