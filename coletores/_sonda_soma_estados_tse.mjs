// SONDA (18/10/2026, I4): a soma dos 27 estados (e do exterior) bate com o arquivo NACIONAL de presidente do TSE?
//
// Por quê: um site independente registrou que, no 1º turno, o arquivo nacional de votos ficou parado cerca de 51 minutos
// enquanto os 27 arquivos de estado continuavam atualizando. Se a soma dos estados for igual ao nacional, o Lume pode
// mostrar o total do país pela soma dos estados quando ela estiver à frente. Esta sonda só confere a CONTA (arquivos
// finais do 1º turno, ou do 2º com --turno=2). Não mede tempo e não toca no site nem no banco: só lê o TSE e grava um
// arquivo de resultado.
//
// Rodar (no computador do Jordy, a partir de hub_politica):  node coletores/_sonda_soma_estados_tse.mjs [--turno=2] [--gravar]
// --gravar guarda também os arquivos BRUTOS do TSE (nacional, 27 estados e exterior) em docs/fixtures_tse/turnoN/, para o
// ambiente de teste (TSE falso local) usar dados reais. Só leitura do TSE; nada vai ao site nem ao banco.
// Custo: 29 pedidos, um por vez, com pausa. Para sozinha depois de 3 erros seguidos (404 em excesso bloqueia o IP).
// O exterior é pedido por último, uma vez só, no endereço "zz" (a confirmar: se der 404, o resultado diz isso).

import { writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const BASE = 'https://resultados.tse.jus.br/oficial/ele2026';
const UFS = ['AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'];
const ELEICAO = { 1: '6257', 2: '6258' };

export const num = (x) => {
  const n = Number(String(x ?? '').replace(/\./g, '').replace(',', '.'));
  return Number.isFinite(n) ? n : 0;
};

export const urlDe = (pasta, turno) => `${BASE}/${ELEICAO[turno]}/dados/${pasta}/${pasta}-c0001-e${ELEICAO[turno].padStart(6, '0')}-u.json`;

// Reduz um arquivo do TSE ao que a conta usa.
export function reduzir(json) {
  const c = (json.carg || [])[0] || {};
  const cands = new Map();
  for (const agr of c.agr || []) {
    for (const par of agr.par || []) {
      for (const cd of par.cand || []) cands.set(`${cd.n}|${cd.nmu || cd.nm}`, num(cd.vap));
    }
  }
  const s = json.s || {}; const e = json.e || {}; const v = json.v || {};
  return {
    gerado_em: [json.dg, json.hg].filter(Boolean).join(' ') || null,
    secoes: { total: num(s.ts), totalizadas: num(s.st) },
    comparecimento: num(e.c),
    votos: { total: num(v.tv), validos: num(v.vv), brancos: num(v.vb), nulos: num(v.vn) },
    cands,
  };
}

const somarMapas = (lista) => {
  const m = new Map();
  for (const r of lista) for (const [k, v] of r.cands) m.set(k, (m.get(k) || 0) + v);
  return m;
};
const somar = (lista, campo, sub) => lista.reduce((n, r) => n + (sub ? r[campo][sub] : r[campo]), 0);

// Compara o nacional com a soma dos estados (sem e com o exterior). Função pura: recebe os arquivos já reduzidos.
export function comparar(nacional, estados, exterior) {
  const lista = Object.values(estados);
  const comExterior = exterior ? [...lista, exterior] : lista;
  const somaUf = somarMapas(lista);
  const somaTudo = somarMapas(comExterior);
  const chaves = [...new Set([...nacional.cands.keys(), ...somaTudo.keys()])];
  const candidatos = chaves.map((k) => {
    const br = nacional.cands.get(k) || 0; const uf = somaUf.get(k) || 0; const tudo = somaTudo.get(k) || 0;
    return { candidato: k, nacional: br, soma_estados: uf, soma_estados_mais_exterior: tudo, diferenca_estados: br - uf, diferenca_com_exterior: br - tudo };
  }).sort((a, b) => b.nacional - a.nacional);
  const campos = ['validos', 'brancos', 'nulos', 'total'];
  const totais = {};
  for (const c of campos) {
    totais[c] = { nacional: nacional.votos[c], soma_estados: somar(lista, 'votos', c), soma_estados_mais_exterior: somar(comExterior, 'votos', c) };
  }
  totais.comparecimento = { nacional: nacional.comparecimento, soma_estados: somar(lista, 'comparecimento'), soma_estados_mais_exterior: somar(comExterior, 'comparecimento') };
  totais.secoes_totalizadas = { nacional: nacional.secoes.totalizadas, soma_estados: somar(lista, 'secoes', 'totalizadas'), soma_estados_mais_exterior: somar(comExterior, 'secoes', 'totalizadas') };
  const bate = (campo) => totais[campo].nacional === totais[campo].soma_estados_mais_exterior;
  const todosBatem = campos.every(bate) && candidatos.every((c) => c.diferenca_com_exterior === 0);
  return { totais, candidatos, todos_batem_com_exterior: todosBatem, exterior_lido: !!exterior };
}

const pausa = (ms) => new Promise((r) => setTimeout(r, ms));

async function buscarJson(url) {
  const r = await fetch(url, { headers: { 'user-agent': 'LumeCidadao-sonda/1.0 (conferencia de totais)' } });
  if (!r.ok) { const e = new Error(`HTTP ${r.status}`); e.status = r.status; throw e; }
  return r.json();
}

async function principal() {
  const turno = process.argv.includes('--turno=2') ? 2 : 1;
  console.log(`Sonda da soma dos estados (presidente, ${turno}º turno)`);
  const gravar = process.argv.includes('--gravar');
  const brutos = {};
  let errosSeguidos = 0;
  const ler = async (pasta) => {
    try { const j = await buscarJson(urlDe(pasta, turno)); errosSeguidos = 0; if (gravar) brutos[pasta] = j; return reduzir(j); } catch (e) {
      errosSeguidos++; console.log(`  ${pasta}: ${e.message}`);
      if (errosSeguidos >= 3) { console.log('3 erros seguidos: parando para não arriscar bloqueio do IP.'); process.exit(1); }
      return null;
    }
  };
  const nacional = await ler('br');
  if (!nacional) { console.log('Arquivo nacional indisponível: nada a comparar.'); process.exit(1); }
  await pausa(300);
  const estados = {};
  for (const uf of ['SP', ...UFS.filter((u) => u !== 'SP')]) { // SP primeiro, como sonda
    const r = await ler(uf.toLowerCase());
    if (r) estados[uf] = r;
    await pausa(300);
  }
  const exterior = await ler('zz'); // uma tentativa só
  const resultado = comparar(nacional, estados, exterior);
  const carimbos = {
    nacional: nacional.gerado_em,
    estados: Object.fromEntries(Object.entries(estados).map(([u, r]) => [u, r.gerado_em])),
    exterior: exterior ? exterior.gerado_em : null,
  };
  const saida = { turno, lido_em: new Date().toISOString(), estados_lidos: Object.keys(estados).length, ...resultado, carimbos_de_geracao: carimbos };
  const pasta = fileURLToPath(new URL('../../docs/', import.meta.url));
  try { mkdirSync(pasta, { recursive: true }); } catch { /* já existe */ }
  const arq = `${pasta}sonda_soma_estados_turno${turno}.json`;
  writeFileSync(arq, JSON.stringify(saida, null, 2));
  if (gravar) {
    const dir = `${pasta}fixtures_tse/turno${turno}/`;
    mkdirSync(dir, { recursive: true });
    for (const [nome, j] of Object.entries(brutos)) writeFileSync(`${dir}${nome}.json`, JSON.stringify(j));
    console.log(`Arquivos brutos gravados em ${dir} (${Object.keys(brutos).length} arquivos).`);
  }

  console.log(`\nEstados lidos: ${saida.estados_lidos} de 27. Exterior (zz): ${exterior ? 'lido' : 'NÃO lido (ver erro acima)'}.`);
  console.log('\nTotais (nacional | soma dos estados | soma + exterior):');
  for (const [k, t] of Object.entries(resultado.totais)) console.log(`  ${k}: ${t.nacional} | ${t.soma_estados} | ${t.soma_estados_mais_exterior}`);
  console.log('\nCandidatos (nacional | soma estados | diferença | diferença com exterior):');
  for (const c of resultado.candidatos) console.log(`  ${c.candidato}: ${c.nacional} | ${c.soma_estados} | ${c.diferenca_estados} | ${c.diferenca_com_exterior}`);
  console.log(`\nA soma dos estados mais o exterior bate com o nacional em tudo? ${resultado.todos_batem_com_exterior ? 'SIM' : 'NÃO'}`);
  console.log(`Arquivo gerado: ${arq}`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) principal();
