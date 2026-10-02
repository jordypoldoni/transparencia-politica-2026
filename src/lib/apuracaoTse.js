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

export const UFS = ['AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'];

// chave da tela -> código do cargo no arquivo, e de qual eleição vem
export const CARGOS = {
  presidente: { cd: '0001', nacional: true, proporcional: false },
  governador: { cd: '0003', nacional: false, proporcional: false },
  senador: { cd: '0005', nacional: false, proporcional: false },
  'deputado-federal': { cd: '0006', nacional: false, proporcional: true },
  'deputado-estadual': { cd: '0007', nacional: false, proporcional: true }, // no DF o TSE chama de distrital
};

const BASE_PADRAO = 'https://resultados.tse.jus.br/oficial';

// Devolve { url, cfg } ou null se cargo/UF não existe (nesse caso NÃO se fala com o TSE).
export function urlDoResultado(cargo, uf, env = process.env) {
  const cfg = CARGOS[cargo];
  if (!cfg) return null;
  const sigla = String(uf || '').toUpperCase();
  if (!cfg.nacional && !UFS.includes(sigla)) return null;
  const base = (env.TSE_RESULTADOS_BASE || BASE_PADRAO).replace(/\/+$/, '');
  const ele = String(cfg.nacional ? (env.TSE_ELEICAO_FEDERAL || '6257') : (env.TSE_ELEICAO_ESTADUAL || '6259'));
  const pasta = cfg.nacional ? 'br' : sigla.toLowerCase();
  return { cfg, url: `${base}/ele2026/${ele}/dados/${pasta}/${pasta}-c${cfg.cd}-e${ele.padStart(6, '0')}-u.json` };
}

const num = (x) => {
  const n = Number(String(x ?? '').replace(/\./g, '').replace(',', '.'));
  return Number.isFinite(n) ? n : 0;
};
const pct = (x) => (x === undefined || x === null || x === '' ? null : String(x)); // já vem "12,34"

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
          votos: num(cd.vap), pct: pct(cd.pvap), eleito: cd.e === 's', situacao: cd.st || '',
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
      total: num(v.tv), validos: num(v.vv), pct_validos: pct(v.pvv),
      brancos: num(v.vb), pct_brancos: pct(v.pvb), nulos: num(v.vn), pct_nulos: pct(v.pvn),
    },
    total_candidatos: todos.length,
    candidatos: cfg.proporcional ? todos.slice(0, limite) : todos,
    eleitos, // vazio até o TSE marcar quem foi eleito
    partidos: cfg.proporcional ? partidos : undefined,
  };
}
