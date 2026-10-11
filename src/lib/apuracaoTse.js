// APURAÇÃO: leitura do resultado oficial do TSE (EA20) e redução ao que a tela usa. (02/10/2026)
//
// Fonte: https://resultados.tse.jus.br/oficial/ele2026/{eleição}/dados/{uf}/{uf}-c{cargo}-e{eleição, 6 dígitos}-u.json
//   eleição 6257 = presidente (arquivo nacional, uf "br"); 6259 = governador, senador, deputado
//   federal e estadual/distrital (um arquivo por UF). Documentação: tse.jus.br/eleicoes/informacoes-
//   tecnicas-sobre-a-divulgacao-de-resultados. Sem cadastro; 100 req/s por IP; MUITOS 404 bloqueiam
//   o IP por 10 minutos, por isso cargo e UF são validados aqui ANTES de qualquer pedido ao TSE.
//
// Para ensaiar com os dados de mentira do TSE (simulado), sem mexer no código:
//   TSE_RESULTADOS_BASE=https://resultados-sim.tse.jus.br/simulado/simulado2026
//   TSE_ELEICAO_FEDERAL=21270  TSE_ELEICAO_ESTADUAL=21272
//
// Nada daqui toca o banco: o resultado é lido do TSE e guardado só na borda da Vercel.

import { turnoValido, disponivelNoTurno, eleicaoDoTurno } from './turnos';

export const UFS = ['AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'];

// chave da tela -> código do cargo no arquivo, e de qual eleição vem
export const CARGOS = {
  presidente: { cd: '0001', nacional: true, proporcional: false },
  governador: { cd: '0003', nacional: false, proporcional: false },
  senador: { cd: '0005', nacional: false, proporcional: false },
  'deputado-federal': { cd: '0006', nacional: false, proporcional: true },
  'deputado-estadual': { cd: '0007', nacional: false, proporcional: true }, // no DF o cargo é distrital e o TSE usa o código 0008 (ver CD_DISTRITAL)
};

const BASE_PADRAO = 'https://resultados.tse.jus.br/oficial';

// 03/10/2026: no DF não existe deputado estadual, existe o distrital, e o arquivo dele é c0008.
// Conferido no TSE: df-c0007 devolve 404 (NoSuchKey) e df-c0008 devolve 200 "Deputado Distrital".
const CD_DISTRITAL = '0008';

// Devolve { url, cfg, turno } ou null se cargo/UF/turno não existe (nesse caso NÃO se fala com o TSE).
// `turno` é 1 (padrão) ou 2; o que existe em cada turno e os códigos da eleição ficam em ./turnos.js.
export function urlDoResultado(cargo, uf, env = process.env, turnoPedido = 1) {
  const cfg = CARGOS[cargo];
  if (!cfg) return null;
  const turno = turnoValido(turnoPedido);
  if (!turno) return null;
  const sigla = String(uf || '').toUpperCase();
  if (!cfg.nacional && !UFS.includes(sigla)) return null;
  if (!disponivelNoTurno(turno, cargo, sigla)) return null;
  const base = (env.TSE_RESULTADOS_BASE || BASE_PADRAO).replace(/\/+$/, '');
  const ele = eleicaoDoTurno(turno, cfg.nacional, env);
  const pasta = cfg.nacional ? 'br' : sigla.toLowerCase();
  const cd = cargo === 'deputado-estadual' && sigla === 'DF' ? CD_DISTRITAL : cfg.cd;
  return { cfg, turno, url: `${base}/ele2026/${ele}/dados/${pasta}/${pasta}-c${cd}-e${ele.padStart(6, '0')}-u.json` };
}

const num = (x) => {
  const n = Number(String(x ?? '').replace(/\./g, '').replace(',', '.'));
  return Number.isFinite(n) ? n : 0;
};
const pct = (x) => (x === undefined || x === null || x === '' ? null : String(x)); // já vem "12,34"

// Percentual "12,34" de parte sobre total. No arquivo do TSE, pvv e pvn medem outra coisa (parte entre votos nominais),
// então válidos usam pvvc (sobre o comparecimento) e nulos são calculados aqui sobre o total de votos.
const pctDe = (parte, total) => (total > 0 ? ((parte / total) * 100).toFixed(2).replace('.', ',') : null);

// O TSE marca e="s" também para quem vai ao 2º turno (situação "2º turno"); isso não é eleição.
const segundoTurno = (st) => /2\s*[º°o]?\s*turno/i.test(String(st || ''));

// Reduz o arquivo do TSE. `limite` vale só para cargos proporcionais (milhares de candidatos).
export function reduzirResultado(json, cargo, { limite = 30 } = {}) {
  const cfg = CARGOS[cargo];
  const c = (json.carg || [])[0] || {};
  const todos = [];
  const partidos = [];
  for (const agr of c.agr || []) {
    let nominais = 0;
    let candsAgr = 0;
    for (const par of agr.par || []) {
      for (const cd of par.cand || []) {
        const vice = (cd.vs || []).find((v) => v.tp === 'v') || null;
        todos.push({
          numero: cd.n, nome: cd.nmu || cd.nm, partido: par.sg,
          votos: num(cd.vap), pct: pct(cd.pvap), eleito: cd.e === 's' && !segundoTurno(cd.st), segundoTurno: segundoTurno(cd.st), situacao: cd.st || '',
          vice: vice ? { nome: vice.nmu || vice.nm, partido: vice.sgp || null } : null,
          coligacao: agr.tp === 'i' ? null : (agr.tp === 'f' ? agr.nm : (agr.com || agr.nm)),
        });
        candsAgr++;
      }
      nominais += num(par.tvtn);
    }
    if (cfg.proporcional) {
      partidos.push({
        nome: agr.tp === 'i' ? (agr.com || agr.nm) : agr.nm, tipo: agr.tp, vagas: num(agr.vag),
        votos_nominais: num(agr.tvtn) || nominais, votos_legenda: num(agr.tvtl), candidatos: candsAgr,
      });
    }
  }
  const porVoto = (a, b) => (b.votos - a.votos) || String(a.nome).localeCompare(String(b.nome), 'pt-BR');
  todos.sort(porVoto);
  const eleitos = todos.filter((x) => x.eleito);
  partidos.sort((a, b) => (b.vagas - a.vagas) || ((b.votos_nominais + b.votos_legenda) - (a.votos_nominais + a.votos_legenda)));
  const s = json.s || {}; const e = json.e || {}; const v = json.v || {};
  return {
    cargo, uf: json.cdabr ? String(json.cdabr).toUpperCase() : null,
    nome_cargo: c.nmn || null, vagas: num(c.nv),
    gerado_em: [json.dg, json.hg].filter(Boolean).join(' ') || null,
    transmitido_em: [json.dt, json.ht].filter(Boolean).join(' ') || null,
    secoes: { total: num(s.ts), totalizadas: num(s.st), pct_totalizadas: pct(s.pst) },
    eleitorado: { total: num(e.te), comparecimento: num(e.c), pct_comparecimento: pct(e.pc), abstencao: num(e.a), pct_abstencao: pct(e.pa) },
    votos: {
      total: num(v.tv), validos: num(v.vv), pct_validos: pct(v.pvvc),
      brancos: num(v.vb), pct_brancos: pct(v.pvb), nulos: num(v.vn), pct_nulos: pctDe(num(v.vn), num(v.tv)),
    },
    total_candidatos: todos.length,
    candidatos: cfg.proporcional ? todos.slice(0, limite) : todos,
    eleitos, // vazio até o TSE marcar quem foi eleito
    partidos: cfg.proporcional ? partidos : undefined,
  };
}
