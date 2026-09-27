// SONDA — votações NOMINAIS contestadas nas Assembleias que usam o SAPL (Interlegis). (27/09/2026)
//
// Para que serve: escolher, com o Jordy, as perguntas de deputado estadual de cada estado, como
// fizemos com as federais. Esta sonda NÃO grava nada no banco: lista as votações de plenário da
// legislatura atual (desde 01/02/2023) que tiveram voto por deputado e divisão de verdade
// (pelo menos MIN_NAO votos "Não"), com a ementa da matéria e o placar. Unanimidade não serve
// como pergunta: não separa ninguém de ninguém.
//
// Casas (levantamento de 27/09/2026): AM, RO, PB, PI, AC. As cinco usam o SAPL 3.x, com API
// pública em /api/. O SAPL devolve só números de identificação; a sonda cruza:
//   /api/sessao/registrovotacao/        placar, data e matéria de cada votação
//   /api/sessao/votoparlamentar/?votacao=ID   se houve voto por deputado (votação nominal)
//   /api/materia/materialegislativa/ID/ ementa, número e ano da matéria
//   /api/materia/tipomaterialegislativa/ID/   sigla do tipo (PL, PEC, VET...)
//
// Por que não gravar tudo no banco já: o banco 1 está perto do teto do plano gratuito, e só a
// Assembleia do AM tem mais de 130 mil votos individuais. Vamos guardar só as votações que virarem
// pergunta (próximo passo, depois de o Jordy aprovar a lista).
//
// Uso:
//   node coletores/sonda_votacoes_sapl.mjs              -> as cinco casas
//   node coletores/sonda_votacoes_sapl.mjs AM RO        -> só algumas
//   node coletores/sonda_votacoes_sapl.mjs AM --min-nao 3
// Saída: coletores/_saida_sapl_votacoes.txt (para ler) e coletores/_saida_sapl_votacoes.json.
// Não precisa de .env.

import { writeFileSync } from 'node:fs';

const CASAS = {
  AM: { nome: 'Assembleia Legislativa do Amazonas', base: 'https://sapl.al.am.leg.br' },
  RO: { nome: 'Assembleia Legislativa de Rondônia', base: 'https://sapl.al.ro.leg.br' },
  PB: { nome: 'Assembleia Legislativa da Paraíba', base: 'https://sapl.al.pb.leg.br' },
  PI: { nome: 'Assembleia Legislativa do Piauí', base: 'https://sapl.al.pi.leg.br' },
  AC: { nome: 'Assembleia Legislativa do Acre', base: 'https://sapl.al.ac.leg.br' },
};
const DESDE = '2023-02-01';
const DELAY_MS = 250;

const args = process.argv.slice(2);
const iMin = args.indexOf('--min-nao');
const MIN_NAO = iMin >= 0 ? Number(args[iMin + 1]) || 2 : 2;
const ufsArg = args.filter((a) => /^[A-Z]{2}$/.test(a) && CASAS[a]);
const UFS = ufsArg.length ? ufsArg : Object.keys(CASAS);

const dorme = (ms) => new Promise((r) => setTimeout(r, ms));

async function json(url, tentativas = 4) {
  for (let i = 1; i <= tentativas; i++) {
    try {
      const r = await fetch(url, { headers: { Accept: 'application/json', 'User-Agent': 'LumeCidadao/1.0 (transparencia; contato jordyoldoni07@gmail.com)' }, signal: AbortSignal.timeout(30000) });
      if (r.status === 429 || r.status >= 500) throw new Error(`HTTP ${r.status}`);
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return await r.json();
    } catch (e) {
      if (i === tentativas) throw new Error(`${url}: ${e.message}`);
      await dorme(1500 * i * i);
    }
  }
}

async function sondarCasa(uf) {
  const { base, nome } = CASAS[uf];
  console.log(`\n== ${uf} · ${nome}`);
  const cacheTipo = new Map();
  const achadas = [];
  let pagina = 1, lidas = 0, fim = false;

  while (!fim) {
    const url = `${base}/api/sessao/registrovotacao/?o=-id&page_size=100&page=${pagina}`;
    let dados;
    try { dados = await json(url); } catch (e) { console.log(`  parou na página ${pagina}: ${e.message}`); break; }
    const lista = dados.results || [];
    if (!lista.length) break;
    for (const r of lista) {
      lidas++;
      const data = String(r.data_hora || '').slice(0, 10);
      if (data && data < DESDE) { fim = true; break; }
      const sim = r.numero_votos_sim || 0, nao = r.numero_votos_nao || 0, abst = r.numero_abstencoes || 0;
      if (nao < MIN_NAO || !r.materia) continue;

      // Houve voto por deputado? (votação nominal no painel)
      let nominais = 0;
      try {
        const v = await json(`${base}/api/sessao/votoparlamentar/?votacao=${r.id}&page_size=1`);
        nominais = v.pagination?.total_entries ?? (v.results || []).length;
        // Filtro ignorado pelo servidor devolveria o total geral (dezenas de milhares).
        if (nominais > 200) nominais = -1;
      } catch { nominais = -2; }
      await dorme(DELAY_MS);
      if (nominais === 0) continue;

      let materia = null;
      try { materia = await json(`${base}/api/materia/materialegislativa/${r.materia}/`); } catch { /* segue sem */ }
      await dorme(DELAY_MS);
      let sigla = '';
      if (materia?.tipo) {
        if (!cacheTipo.has(materia.tipo)) {
          try { const tp = await json(`${base}/api/materia/tipomaterialegislativa/${materia.tipo}/`); cacheTipo.set(materia.tipo, tp.sigla || tp.descricao || ''); } catch { cacheTipo.set(materia.tipo, ''); }
          await dorme(DELAY_MS);
        }
        sigla = cacheTipo.get(materia.tipo);
      }
      achadas.push({
        uf, registro_votacao: r.id, data, sim, nao, abst, votos_nominais: nominais,
        materia_id: r.materia, materia: materia ? `${sigla || materia.__str__} ${materia.numero}/${materia.ano}` : `matéria ${r.materia}`,
        ementa: String(materia?.ementa || '').replace(/\s+/g, ' ').trim(),
        resumo_sapl: r.__str__ || '',
        link: materia ? `${base}/materia/${r.materia}` : null,
      });
      process.stdout.write(`  ${data} ${sim}x${nao} ${achadas[achadas.length - 1].materia}\n`);
    }
    if (!dados.pagination?.next_page && !dados.pagination?.links?.next) break;
    pagina++;
    await dorme(DELAY_MS);
  }
  console.log(`  ${uf}: ${lidas} registros lidos, ${achadas.length} votações nominais com ${MIN_NAO}+ votos "Não" desde ${DESDE}.`);
  return achadas;
}

const todas = [];
for (const uf of UFS) {
  try { todas.push(...await sondarCasa(uf)); } catch (e) { console.log(`  ${uf} falhou: ${e.message}`); }
}

writeFileSync('coletores/_saida_sapl_votacoes.json', JSON.stringify(todas, null, 2));
const linhas = [];
for (const uf of UFS) {
  const d = todas.filter((x) => x.uf === uf).sort((a, b) => (b.nao / (b.sim + b.nao || 1)) - (a.nao / (a.sim + a.nao || 1)));
  linhas.push(`\n==================== ${uf} · ${CASAS[uf].nome} · ${d.length} votações divididas ====================`);
  for (const x of d) {
    linhas.push(`[${x.registro_votacao}] ${x.data} · ${x.materia} · Sim ${x.sim} x Não ${x.nao}${x.abst ? ` (abst. ${x.abst})` : ''} · ${x.votos_nominais === -1 ? 'nominal? (filtro ignorado)' : x.votos_nominais === -2 ? 'nominal? (erro)' : `${x.votos_nominais} votos por deputado`}`);
    linhas.push(`    ${x.ementa || x.resumo_sapl}`);
    if (x.link) linhas.push(`    ${x.link}`);
  }
}
writeFileSync('coletores/_saida_sapl_votacoes.txt', linhas.join('\n') + '\n');
console.log(`\nPronto: ${todas.length} votações. Leia coletores/_saida_sapl_votacoes.txt`);
