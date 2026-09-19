// coletor_senadores_historicos.js — cadastra quem VOTOU mas não está mais na casa. (19/09/2026)
//
// USO
//   node coletores/coletor_senadores_historicos.js --simular
//   node coletores/coletor_senadores_historicos.js
//   node coletores/coletor_senadores_historicos.js --desde=2023-02-01
//
// POR QUE ESTE ARQUIVO EXISTE
// `coletor_votos_senado.js` casa cada voto com um senador de `agentes_politicos` pelo código
// do parlamentar e, quando não encontra, DESCARTA o voto em silêncio (`if (!aid) continue`).
// Isso não dá erro, não aparece em log nenhum, e o resultado é uma chamada nominal incompleta
// com cara de completa.
//
// Medido em 19/09/2026, antes de escrever uma linha: nas votações de 01/02/2019 em diante há
// 153 parlamentares distintos, e o banco tem 89. Seriam 20.065 linhas de voto (21,7%) jogadas
// fora sem ninguém saber. Já acontece hoje, em escala pequena: 105 linhas, de Pedro Chaves,
// José Lacerda e Wellington Dias.
//
// É o mesmo padrão que fez o site dizer que o Brasil tem 89 senadores: coletor que só enxerga
// o presente e falha calado sobre o resto.
//
// O QUE ELE FAZ, E O QUE NÃO FAZ
// Insere SÓ quem aparece votando na janela pedida e ainda não está no banco, sempre com
// `em_exercicio = false`. Não toca em linha que já existe: quem está em exercício é assunto do
// `coletor_senadores.js`, que é a única fonte que sabe quem ocupa cadeira HOJE. Rodar os dois
// em qualquer ordem dá o mesmo resultado.
//
// POR QUE NÃO CADASTRA AS DUAS LEGISLATURAS INTEIRAS
// Seriam ~400 pessoas, a maioria suplente que nunca votou. O banco encheria de perfil vazio, e
// perfil vazio num site de transparência é promessa que não se cumpre. Cadastramos quem tem
// registro para mostrar.
//
// FOTO FICA NULA, DE PROPÓSITO
// Nem a lista por legislatura nem o detalhe do parlamentar trazem URL de foto para quem saiu.
// O Senado tem um padrão de endereço, e montar um por conta seria fabricar link que a fonte
// não publicou. É a mesma regra que fez os `sites` do TSE virarem texto quando vêm como arroba.

import 'dotenv/config';
import { writeFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const API = 'https://legis.senado.leg.br/dadosabertos';

// As legislaturas que cobrem os mandatos em curso. Todo senador em exercício hoje foi eleito
// em 2018 (legislatura 56, a partir de 01/02/2019) ou em 2022 (legislatura 57). Por isso o
// corte padrão é 01/02/2019: é o único que cobre o mandato INTEIRO de todos eles.
const LEGISLATURAS = [56, 57];
const DESDE_PADRAO = '2019-02-01';

// O ano aqui é o ano da MATÉRIA, não o da sessão, e isso não é detalhe: matéria de 2012 pode
// ser votada em 2021. Para cobrir sessões de 2019 em diante é preciso varrer bem para trás e
// filtrar pela data da sessão depois. Medido: sessões de 2019+ vêm de matérias de 2012 a 2026.
const ANO_MATERIA_INICIAL = 2011;

const ARQUIVO_SAIDA = 'coletores/_saida_senadores_historicos.txt';
const registro = [];
for (const nivel of ['log', 'warn', 'error']) {
  const original = console[nivel].bind(console);
  console[nivel] = (...p) => { registro.push(p.map((x) => (typeof x === 'string' ? x : JSON.stringify(x))).join(' ')); original(...p); };
}
function gravarSaida() {
  try { writeFileSync(ARQUIVO_SAIDA, registro.join('\n') + '\n', 'utf8'); process.stdout.write(`\n(saída em ${ARQUIVO_SAIDA})\n`); }
  catch (e) { process.stdout.write(`\n(não gravei ${ARQUIVO_SAIDA}: ${e.message})\n`); }
}

const SIMULAR = process.argv.includes('--simular');
const argDesde = process.argv.find((a) => a.startsWith('--desde='));
const DESDE = argDesde ? argDesde.split('=')[1] : DESDE_PADRAO;

const pausa = (ms = 150) => new Promise((r) => setTimeout(r, ms));
const lista = (x) => (Array.isArray(x) ? x : (x ? [x] : []));
const slugify = (s) => (s || '')
  .normalize('NFD').replace(/[̀-ͯ]/g, '')
  .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

async function json(url, tentativas = 3) {
  for (let t = 1; t <= tentativas; t++) {
    try {
      const r = await fetch(url, { headers: { Accept: 'application/json' } });
      if (r.ok) return r.json();
      if (r.status < 500 || t === tentativas) throw new Error(`HTTP ${r.status}`);
    } catch (e) {
      if (t === tentativas) throw e;
    }
    await pausa(t * 2000);
  }
}

// Quem votou na janela. Vem do mesmo dump que o coletor de votos usa, então os dois enxergam
// exatamente o mesmo universo: se este cadastrar, aquele acha.
async function quemVotou(anoFinal) {
  const pessoas = new Map();
  let votacoes = 0;
  for (let ano = ANO_MATERIA_INICIAL; ano <= anoFinal; ano++) {
    const arr = await json(`${API}/votacao?ano=${ano}`);
    for (const v of lista(arr)) {
      if (!v.dataSessao || v.dataSessao < DESDE) continue;
      votacoes++;
      for (const x of lista(v.votos)) {
        const cod = String(x.codigoParlamentar || '').trim();
        if (!cod) continue;
        if (!pessoas.has(cod)) pessoas.set(cod, { codigo: cod, nome: x.nomeParlamentar || null, partido: x.siglaPartidoParlamentar || null, uf: x.siglaUFParlamentar || null, votos: 0 });
        pessoas.get(cod).votos++;
      }
    }
    await pausa();
  }
  return { pessoas, votacoes };
}

// Nome completo e UF do mandato, que o dump de votação não traz.
async function fichaPorLegislatura() {
  const ficha = new Map();
  for (const L of LEGISLATURAS) {
    const j = await json(`${API}/senador/lista/legislatura/${L}`);
    const parlamentares = lista(j?.ListaParlamentarLegislatura?.Parlamentares?.Parlamentar);
    console.log(`   legislatura ${L}: ${parlamentares.length} parlamentares`);
    for (const p of parlamentares) {
      const ip = p.IdentificacaoParlamentar || {};
      const cod = String(ip.CodigoParlamentar || '').trim();
      if (!cod) continue;
      // Mandato pode ser um ou vários. O último da lista é o mais recente, e é dele que sai a
      // UF: a mesma pessoa pode ter representado estados diferentes ao longo da vida.
      const mandatos = lista(p?.Mandatos?.Mandato);
      const ultimo = mandatos[mandatos.length - 1] || {};
      ficha.set(cod, {
        nomeParlamentar: ip.NomeParlamentar || null,
        nomeCompleto: ip.NomeCompletoParlamentar || ip.NomeParlamentar || null,
        partido: ip.SiglaPartidoParlamentar || null,
        uf: ultimo.UfParlamentar || null,
        participacao: ultimo.DescricaoParticipacao || null,
      });
      await pausa(0);
    }
  }
  return ficha;
}

async function main() {
  console.log(`🚀 Senadores históricos, sessões a partir de ${DESDE}${SIMULAR ? ' (SIMULAÇÃO)' : ''}`);
  if (!SUPABASE_URL || !SUPABASE_KEY) { console.error('❌ Faltam credenciais Supabase.'); process.exitCode = 1; return; }
  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

  const anoFinal = new Date().getUTCFullYear();
  console.log(`\n📥 Lendo as votações (matérias de ${ANO_MATERIA_INICIAL} a ${anoFinal})…`);
  const { pessoas, votacoes } = await quemVotou(anoFinal);
  console.log(`   ${votacoes} votações na janela · ${pessoas.size} parlamentares distintos`);

  const { data: existentes, error } = await supabase
    .from('agentes_politicos').select('id, id_externo_api, nome_urna').ilike('fonte_api', '%senado%');
  if (error) { console.error('❌ Supabase:', error.message); process.exitCode = 1; return; }
  const jaTem = new Set((existentes || []).map((e) => String(e.id_externo_api)));
  console.log(`   ${jaTem.size} já cadastrados`);

  const faltam = [...pessoas.values()].filter((p) => !jaTem.has(p.codigo));
  if (!faltam.length) {
    console.log('\n✅ Nada a fazer: todo mundo que votou na janela já está cadastrado.');
    return;
  }
  console.log(`\n🔎 ${faltam.length} sem cadastro, somando ${faltam.reduce((a, p) => a + p.votos, 0)} linhas de voto que hoje seriam descartadas.`);

  console.log('\n📥 Buscando nome completo e UF nas legislaturas…');
  const ficha = await fichaPorLegislatura();

  const linhas = [];
  const semFicha = [];
  for (const p of faltam) {
    const f = ficha.get(p.codigo) || {};
    // A UF do dump de votação é a do parlamentar naquela votação; a da legislatura é a do
    // mandato. Preferimos a do mandato e caímos para a outra, porque o slug depende dela.
    const uf = f.uf || p.uf || null;
    const nome = f.nomeParlamentar || p.nome;
    if (!f.nomeParlamentar) semFicha.push(`${p.nome} (${p.codigo})`);
    if (!nome || !uf) { console.warn(`   ⚠ sem nome ou UF, fica fora: código ${p.codigo}`); continue; }
    // O QUE FICA DE FORA DA LINHA, E POR QUE (conferido no schema em 19/09/2026):
    //
    //  `situacao`: os 89 senadores do banco dizem "Exercício", INCLUSIVE os 8 desativados em
    //  18/09. É o campo obsoleto que fez o site contar 89 cadeiras: ninguém o atualiza quando
    //  alguém sai. Gravar "Exercício" aqui seria alimentar o mesmo erro, e gravar outra coisa
    //  seria inventar um vocabulário que a fonte não usa. Quem manda é `em_exercicio`.
    //
    //  `casa_legislativa`: nulo nos 89. O site reconhece senador por `fonte_api`, e é por isso
    //  que `fonte_api` abaixo precisa conter a palavra "senado": é o que o coletor de votos
    //  procura com ilike.
    //
    //  `foto_status`: fica nulo, que já é o estado de 8 linhas existentes, porque não sabemos
    //  nada sobre a foto destes. Ver a nota do cabeçalho sobre não fabricar URL de imagem.
    linhas.push({
      nome_urna: nome,
      nome_completo: f.nomeCompleto || nome,
      partido_atual: f.partido || p.partido || null,
      uf_sede: uf,
      foto_url: null,
      cargo_atual: 'Senador(a)',
      em_exercicio: false,
      id_externo_api: p.codigo,
      fonte_api: `https://www25.senado.leg.br/web/senadores (senado:${p.codigo})`,
      slug: `${slugify(nome)}-${uf.toLowerCase()}-s${p.codigo}`,
    });
  }

  if (semFicha.length) {
    console.warn(`\n⚠ ${semFicha.length} não apareceram nas legislaturas ${LEGISLATURAS.join(' e ')}, usando o dado do próprio voto:`);
    for (const s of semFicha) console.warn(`   ${s}`);
  }

  console.log(`\n📝 ${linhas.length} a cadastrar (todos com em_exercicio = false):`);
  for (const l of linhas.slice(0, 200)) console.log(`   ${l.nome_urna} (${l.uf_sede}) · ${l.partido_atual || 'sem partido'} · ${pessoas.get(l.id_externo_api).votos} votos`);

  if (SIMULAR) { console.log('\n(simulação, nada foi gravado)'); return; }

  let ok = 0;
  for (let i = 0; i < linhas.length; i += 50) {
    const lote = linhas.slice(i, i + 50);
    const { error: e2 } = await supabase.from('agentes_politicos').insert(lote);
    if (e2) { console.error(`❌ lote ${i / 50 + 1}: ${e2.message}`); process.exitCode = 1; return; }
    ok += lote.length;
  }

  // Conferência pela própria fonte, e não pela nossa contagem: relê o banco e mede quanto do
  // universo de votantes ficou coberto. É o que transforma "gravei" em "funciona".
  const { data: depois } = await supabase
    .from('agentes_politicos').select('id_externo_api').ilike('fonte_api', '%senado%');
  const agora = new Set((depois || []).map((e) => String(e.id_externo_api)));
  const aindaFaltam = [...pessoas.keys()].filter((c) => !agora.has(c));

  console.log(`\n✅ ${ok} senadores cadastrados. Total no banco: ${agora.size}.`);
  if (aindaFaltam.length) {
    console.warn(`⚠ ainda faltam ${aindaFaltam.length}: ${aindaFaltam.join(', ')}`);
    process.exitCode = 1;
  } else {
    console.log('🎯 Cobertura completa: todo parlamentar que votou na janela tem cadastro.');
  }
}

main()
  .catch((e) => { console.error('💥', e.message); process.exitCode = 1; })
  .finally(gravarSaida);
