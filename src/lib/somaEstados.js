// TOTAL NACIONAL PELA SOMA DOS ESTADOS (18/10/2026, I4, D-048 e D-049). Funções PURAS: sem rede, sem relógio, sem banco.
//
// Por quê: no 1º turno o arquivo nacional de presidente do TSE chegou a ficar parado cerca de 51 minutos enquanto os 27
// arquivos de estado continuavam atualizando. A soma dos 27 estados mais o exterior (pasta "zz") é IGUAL ao nacional
// (conferido pela sonda em 18/10, candidato por candidato), então, quando ela está à frente, dá para mostrar o total
// do país mais cedo. O TSE proíbe alterar o conteúdo dos dados: por isso a tela rotula a origem ("soma dos estados").
//
// Regra de ouro: o arquivo NACIONAL continua sendo a base. A soma só vale se passar em TODOS os portões abaixo; qualquer
// dúvida devolve { ok: false, motivo } e a rota entrega o nacional, como sempre entregou.
//
// Entrada: objetos já reduzidos por reduzirResultado(json, 'presidente') (src/lib/apuracaoTse.js).

export const UFS_SOMA = ['AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'];

const chave = (c) => `${c.numero}|${c.nome}`;
const inteiro = (x) => Number.isInteger(x) && x >= 0;

// "12,34" de parte sobre total, arredondado para cima no meio (como o TSE), em inteiros para não depender de ponto flutuante.
export function pct2(parte, total) {
  if (!(total > 0)) return null;
  const centesimos = Math.floor((parte * 10000 * 2 + total) / (2 * total));
  const inteira = Math.floor(centesimos / 100);
  const frac = String(centesimos % 100).padStart(2, '0');
  return `${inteira},${frac}`;
}

// "05/10/2026 12:51:47" -> número comparável (aaaammddhhmmss); null se não for esse formato.
export function carimbo(txt) {
  const m = /^(\d{2})\/(\d{2})\/(\d{4}) (\d{2}):(\d{2}):(\d{2})$/.exec(String(txt || '').trim());
  return m ? Number(`${m[3]}${m[2]}${m[1]}${m[4]}${m[5]}${m[6]}`) : null;
}

// Um arquivo (estado ou exterior) é utilizável? Números inteiros, seções coerentes e candidatos que fecham com os válidos.
export function parteValida(r) {
  if (!r || !r.secoes || !r.votos || !r.eleitorado || !Array.isArray(r.candidatos)) return 'estrutura';
  const { secoes, votos, eleitorado } = r;
  if (![secoes.total, secoes.totalizadas, votos.total, votos.validos, votos.brancos, votos.nulos, eleitorado.total, eleitorado.comparecimento, eleitorado.abstencao].every(inteiro)) return 'numero_invalido';
  if (secoes.total <= 0 || secoes.totalizadas > secoes.total) return 'secoes_incoerentes';
  if (eleitorado.comparecimento > eleitorado.total) return 'comparecimento_maior_que_eleitorado';
  if (r.candidatos.length === 0) return 'sem_candidatos';
  if (!r.candidatos.every((c) => inteiro(c.votos))) return 'voto_invalido';
  if (r.candidatos.reduce((n, c) => n + c.votos, 0) !== votos.validos) return 'candidatos_nao_fecham_com_validos';
  return null;
}

// Monta o corpo da soma, no MESMO formato do corpo do nacional (a tela não muda). Não decide se deve ser usado.
export function montarCorpoDaSoma(nacional, estados, exterior) {
  const partes = [...UFS_SOMA.map((u) => estados[u]), exterior];
  const soma = (f) => partes.reduce((n, p) => n + f(p), 0);
  const secoes = { total: soma((p) => p.secoes.total), totalizadas: soma((p) => p.secoes.totalizadas) };
  const eleit = { total: soma((p) => p.eleitorado.total), comparecimento: soma((p) => p.eleitorado.comparecimento), abstencao: soma((p) => p.eleitorado.abstencao) };
  const votos = { total: soma((p) => p.votos.total), validos: soma((p) => p.votos.validos), brancos: soma((p) => p.votos.brancos), nulos: soma((p) => p.votos.nulos) };

  const modelo = new Map(nacional.candidatos.map((c) => [chave(c), c]));
  const acum = new Map();
  for (const p of partes) for (const c of p.candidatos) acum.set(chave(c), (acum.get(chave(c)) || 0) + c.votos);
  const candidatos = [...acum.entries()].map(([k, v]) => {
    const base = modelo.get(k);
    return { ...base, votos: v, pct: pct2(v, votos.validos) };
  }).sort((a, b) => (b.votos - a.votos) || String(a.nome).localeCompare(String(b.nome), 'pt-BR'));

  const maisNovo = (campo) => partes.map((p) => p[campo]).filter((t) => carimbo(t) !== null).sort((a, b) => carimbo(b) - carimbo(a))[0] || null;
  return {
    ...nacional,
    secoes: { ...secoes, pct_totalizadas: pct2(secoes.totalizadas, secoes.total) },
    eleitorado: { ...eleit, pct_comparecimento: pct2(eleit.comparecimento, eleit.total), pct_abstencao: pct2(eleit.abstencao, eleit.total) },
    votos: {
      ...votos,
      pct_validos: pct2(votos.validos, votos.total), pct_brancos: pct2(votos.brancos, votos.total), pct_nulos: pct2(votos.nulos, votos.total),
    },
    total_candidatos: candidatos.length,
    candidatos,
    eleitos: candidatos.filter((c) => c.eleito),
    gerado_em: maisNovo('gerado_em'),
    transmitido_em: maisNovo('transmitido_em'),
  };
}

// Decide se a soma pode substituir o nacional. Devolve { ok: true, corpo } ou { ok: false, motivo }.
// `motivo` 'nacional_em_dia' NÃO é falha: é o caso normal (o nacional já está igual ou à frente).
export function combinarComSoma({ nacional, estados, exterior }) {
  if (!nacional) return { ok: false, motivo: 'sem_nacional' };
  const faltam = UFS_SOMA.filter((u) => !estados || !estados[u]);
  if (faltam.length) return { ok: false, motivo: 'estado_ausente', detalhe: faltam.join(',') };
  if (!exterior) return { ok: false, motivo: 'exterior_ausente' };
  for (const [nome, p] of [...UFS_SOMA.map((u) => [u, estados[u]]), ['ZZ', exterior], ['BR', nacional]]) {
    const erro = parteValida(p);
    if (erro) return { ok: false, motivo: 'arquivo_invalido', detalhe: `${nome}: ${erro}` };
  }
  const corpo = montarCorpoDaSoma(nacional, estados, exterior);

  // À frente? Comparecimento só cresce com o tempo: o nacional em dia ou mais novo mantém o nacional.
  if (corpo.votos.total <= nacional.votos.total) return { ok: false, motivo: 'nacional_em_dia' };

  // Dominância: tudo na soma é maior ou igual ao nacional (apuração só acumula). Se algo é menor, os arquivos não
  // são do mesmo momento ou há erro: nacional.
  const doNacional = new Map(nacional.candidatos.map((c) => [chave(c), c.votos]));
  if (doNacional.size !== corpo.candidatos.length) return { ok: false, motivo: 'candidatos_diferentes' };
  for (const c of corpo.candidatos) {
    if (!doNacional.has(chave(c))) return { ok: false, motivo: 'candidatos_diferentes' };
    if (c.votos < doNacional.get(chave(c))) return { ok: false, motivo: 'candidato_com_menos_votos', detalhe: chave(c) };
  }
  const menores = ['validos', 'brancos', 'nulos', 'total'].filter((k) => corpo.votos[k] < nacional.votos[k]);
  if (menores.length) return { ok: false, motivo: 'total_menor_que_nacional', detalhe: menores.join(',') };
  if (corpo.secoes.totalizadas < nacional.secoes.totalizadas) return { ok: false, motivo: 'secoes_menores_que_nacional' };
  if (corpo.secoes.total !== nacional.secoes.total) return { ok: false, motivo: 'total_de_secoes_diferente' };
  if (corpo.eleitorado.total !== nacional.eleitorado.total) return { ok: false, motivo: 'eleitorado_diferente' };

  return {
    ok: true,
    corpo: { ...corpo, origem: 'soma_dos_estados', nacional_gerado_em: nacional.gerado_em },
  };
}

// ---- Modo automático (18/10/2026): sem mexer na Vercel ------------------------------------------------------------
// APURACAO_SOMA_ESTADOS: off | sombra | on | auto. Ausente = auto. Em auto: sombra até AUTO_LIGA_EM e on depois.
// Valor explícito (off, sombra, on) sempre vale; `off` é o botão de emergência.
export const AUTO_LIGA_EM = Date.parse('2026-10-23T09:00:00-03:00');
export function modoDaSoma(env, agora = Date.now()) {
  const m = String((env && env.APURACAO_SOMA_ESTADOS) || 'auto').trim().toLowerCase();
  if (m === 'off' || m === 'sombra' || m === 'on') return m;
  return agora >= AUTO_LIGA_EM ? 'on' : 'sombra'; // auto e qualquer valor desconhecido
}

// ---- Autoauditoria: o nacional nunca pode ficar atrás da soma já entregue, se for mais novo que ela ------------------
// `entregue` = { total, carimbo } da última soma mostrada; `nacional` = corpo reduzido do arquivo nacional.
// Se o nacional foi gerado no mesmo instante ou depois dos estados daquela soma, ele tem de ter pelo menos os mesmos
// votos. Se tem menos, algo está errado (soma ou nacional): devolve o motivo; senão, null.
export function anomaliaNacional(entregue, nacional) {
  if (!entregue || !nacional || !nacional.votos) return null;
  const c = carimbo(nacional.gerado_em);
  if (c === null || entregue.carimbo === null) return null;
  if (c >= entregue.carimbo && nacional.votos.total < entregue.total) return 'nacional_mais_novo_com_menos_votos_que_a_soma';
  return null;
}
