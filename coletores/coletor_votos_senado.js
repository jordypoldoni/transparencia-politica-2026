// Coletor de VOTAÇÕES NOMINAIS do Senado. Reescrito em 19/09/2026.
//
// USO
//   node coletores/coletor_votos_senado.js --simular
//   node coletores/coletor_votos_senado.js
//   node coletores/coletor_votos_senado.js --desde=2023-02-01
//
// POR QUE FOI REESCRITO
// A versão anterior lia `plenario/lista/votacao/{de}/{ate}`, um serviço que o próprio Senado
// marcou com `DataDesativacaoCompleta: 2026-02-01` e `UrlServicoSubstituto: /dadosabertos/votacao`.
// Ele IGNORA a data final que a gente manda: pedir o ano de 2026 inteiro devolvia 3 votações,
// e pedir 01/01→17/09 ou 01/01→01/04 devolvia bytes idênticos. Era isso que prendia o banco em
// 75 votações, todas de 19/02/2025 em diante.
//
// Registro de uma correção de diagnóstico, porque a primeira versão da minha análise estava
// errada: o coletor velho NÃO perdia votação dentro do período que alcançava. Na janela que o
// banco cobria, a fonte tem 187 votações, sendo 112 secretas, e o banco tinha exatamente as 75
// abertas. O problema dele era alcance, não perda. Comparar total com aberto são coisas
// diferentes, e eu comparei errado antes de conferir.
//
// COMO A FONTE NOVA FUNCIONA, E O QUE NÃO É ÓBVIO NELA
//  - `?ano=` filtra pelo ANO DA MATÉRIA, não pelo da sessão. `?ano=2019` devolve votações com
//    sessões de 2019 até 2025. Por isso este coletor varre matérias desde 2011 e filtra pela
//    data da sessão depois: sessões de 2019 em diante vêm de matérias de 2012 a 2026.
//  - Sem parâmetro nenhum, vêm só os últimos 12 meses. Não é a base inteira.
//  - `dataInicio`/`dataFim` devolvem 400, e `codigoSessaoVotacao` é ignorado EM SILÊNCIO
//    (resposta byte a byte idêntica). Medido comparando tamanhos, não confiando na resposta.
//  - O voto individual vem embutido em cada votação. A versão anterior fazia uma chamada por
//    matéria para buscar votos; agora são 16 chamadas no total.
//
// O QUE ESTE COLETOR NÃO FAZ: VOTAÇÃO SECRETA
// 558 das 1.143 votações da janela são secretas, e nelas a fonte publica só PRESENÇA
// (`Votou`, `P-NRV`), nunca direção. Guardar essas linhas hoje faria "Votou" aparecer na ficha
// do senador ao lado de "Sim" e "Não", e o leitor leria presença como posição: cada dado
// correto, e a tela tendo enganado. A tabela `votacoes` não tem coluna dizendo que a votação é
// secreta, então não há como a tela se defender. Mostrar secreta exige essa coluna e trabalho
// de tela, e é frente própria. Aqui elas são puladas, mas CONTADAS e informadas no fim.

import 'dotenv/config';
import { writeFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const API = 'https://legis.senado.leg.br/dadosabertos';
const ANO_MATERIA_INICIAL = 2011;
const DESDE_PADRAO = '2019-02-01';   // início da legislatura 56: cobre o mandato inteiro de todo senador em exercício

const ARQUIVO_SAIDA = 'coletores/_saida_votos_senado.txt';
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

async function json(url, tentativas = 3) {
  for (let t = 1; t <= tentativas; t++) {
    try {
      const r = await fetch(url, { headers: { Accept: 'application/json' } });
      if (r.ok) return r.json();
      if (r.status < 500 || t === tentativas) throw new Error(`HTTP ${r.status}`);
    } catch (e) {
      if (t === tentativas) throw e;
      console.warn(`   ⚠ ${url}: ${e.message}, tentando de novo`);
    }
    await pausa(t * 2000);
  }
}

// APROVAÇÃO: o campo vem como LETRA (`A`, `R`), e não como texto.
// O coletor anterior fazia /provad/.test(resultado), que nunca casa com "A". Resultado: as 75
// votações do Senado no banco estão com `aprovacao` NULA, todas, enquanto Câmara e ALERGS têm o
// campo preenchido. Conferido no banco em 19/09/2026. Como a chave do upsert é a mesma, esta
// rodada conserta as 75 antigas de passagem.
// Medido na janela: A = 468, R = 113, nulo = 4. Qualquer outra letra vira nulo, de propósito:
// inventar significado para código que a fonte não explicou seria pior que não ter o dado.
function aprovacaoDe(codigo) {
  const c = String(codigo || '').trim().toUpperCase();
  if (c === 'A') return 1;
  if (c === 'R') return 0;
  return null;
}

// RÓTULO DO VOTO: vem da própria fonte, nunca de nós.
// Sim/Não/Abstenção ficam como estão, porque são usados também nos índices do site. Para os
// códigos de ausência e situação (AP, LS, P-NRV, MIS, NCom, LP, LAP, NA, LG, P-OD...) usamos a
// DESCRIÇÃO que a API manda em `descricaoVotoParlamentar`: "Atividade parlamentar",
// "Presente – Não registrou voto", "Dispositivo não citado". Regra fixada em 28/06/2026, e ela
// existe porque eu jamais escreveria "Missão da Casa no País/exterior" por conta própria.
function normVoto(v) {
  const s = String(v || '').trim();
  const l = s.toLowerCase();
  if (l === 'sim') return 'Sim';
  if (l === 'não' || l === 'nao') return 'Não';
  if (l.startsWith('absten')) return 'Abstenção';
  if (l.startsWith('obstru')) return 'Obstrução';
  return s || 'Outro';
}
function rotularVotoSenado(sigla, descricao) {
  const base = normVoto(sigla);
  if (base === 'Sim' || base === 'Não' || base === 'Abstenção' || base === 'Obstrução') return base;
  const d = String(descricao || '').trim();
  return d || base;
}

async function main() {
  console.log(`🟦 Votações do Senado, sessões a partir de ${DESDE}${SIMULAR ? ' (SIMULAÇÃO)' : ''}`);
  if (!SUPABASE_URL || !SUPABASE_KEY) { console.error('❌ Faltam credenciais Supabase.'); process.exitCode = 1; return; }
  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

  const { data: sens, error } = await supabase
    .from('agentes_politicos').select('id, id_externo_api, nome_urna').ilike('fonte_api', '%senado%');
  if (error) { console.error('❌ Supabase:', error.message); process.exitCode = 1; return; }
  const mapa = new Map((sens || []).map((s) => [String(s.id_externo_api), s.id]));
  console.log(`👥 ${mapa.size} senadores cadastrados.`);

  const anoFinal = new Date().getUTCFullYear();
  console.log(`\n📥 Lendo votações (matérias de ${ANO_MATERIA_INICIAL} a ${anoFinal})…`);

  const metas = [];
  const linhas = [];
  const semCadastro = new Map();   // código -> { nome, votos }
  let vistas = 0, foraDaJanela = 0, secretas = 0, semVotos = 0;

  for (let ano = ANO_MATERIA_INICIAL; ano <= anoFinal; ano++) {
    const arr = lista(await json(`${API}/votacao?ano=${ano}`));
    for (const v of arr) {
      vistas++;
      if (!v.dataSessao || v.dataSessao < DESDE) { foraDaJanela++; continue; }
      if (String(v.votacaoSecreta).toUpperCase() === 'S') { secretas++; continue; }
      const votos = lista(v.votos);
      if (!votos.length) { semVotos++; continue; }

      const vid = `SF-${v.codigoSessaoVotacao}`;
      const aprov = aprovacaoDe(v.resultadoVotacao);

      metas.push({
        votacao_id_externa: vid,
        descricao: v.descricaoVotacao || null,
        aprovacao: aprov,
        data_voto: v.dataSessao,
        proposicao_id: v.codigoMateria ? String(v.codigoMateria) : null,
        proposicao_titulo: v.identificacao || null,
        ementa: v.ementa || v.descricaoVotacao || null,
        descricao_tipo: null,
        resultado: v.resultadoVotacao || null,
        autor_nome: null,
      });

      for (const voto of votos) {
        const cod = String(voto.codigoParlamentar ?? '').trim();
        const aid = mapa.get(cod);
        if (!aid) {
          // NÃO é `continue` mudo. Era assim antes, e foi assim que 20 mil linhas de voto
          // sumiriam sem nenhum sinal. Agora acumula e vira erro no fim.
          if (!semCadastro.has(cod)) semCadastro.set(cod, { nome: voto.nomeParlamentar || '?', votos: 0 });
          semCadastro.get(cod).votos++;
          continue;
        }
        linhas.push({
          agente_id: aid,
          voto_tipo: rotularVotoSenado(voto.siglaVotoParlamentar, voto.descricaoVotoParlamentar),
          data_voto: v.dataSessao,
          ementa_resumida_voto: v.descricaoVotacao || null,
          votacao_id_externa: vid,
          descricao_votacao: v.descricaoVotacao || null,
          aprovacao: aprov,
        });
      }
    }
    await pausa();
  }

  console.log(`\n📊 ${vistas} votações na fonte`);
  console.log(`   ${foraDaJanela} anteriores a ${DESDE}`);
  console.log(`   ${secretas} secretas (só presença, ver a nota no topo do arquivo)`);
  console.log(`   ${semVotos} sem voto individual publicado`);
  console.log(`   ${metas.length} a gravar · ${linhas.length} linhas de voto`);

  if (semCadastro.size) {
    const perdidas = [...semCadastro.values()].reduce((a, x) => a + x.votos, 0);
    console.error(`\n❌ ${perdidas} votos de ${semCadastro.size} parlamentares SEM CADASTRO seriam descartados:`);
    for (const [cod, x] of semCadastro) console.error(`   ${x.nome} (código ${cod}): ${x.votos} votos`);
    console.error('\n   Rode `node coletores/coletor_senadores_historicos.js` antes deste e tente de novo.');
    if (process.env.GITHUB_ACTIONS) console.log(`::error title=Votos do Senado descartados::${perdidas} votos de ${semCadastro.size} parlamentares sem cadastro.`);
    process.exitCode = 1;
    return;
  }
  console.log('   ✅ nenhum voto descartado por falta de cadastro');

  if (SIMULAR) {
    const porAno = metas.reduce((a, m) => { const k = m.data_voto.slice(0, 4); a[k] = (a[k] || 0) + 1; return a; }, {});
    console.log(`\n   por ano de sessão: ${JSON.stringify(porAno)}`);
    console.log('\n(simulação, nada foi gravado)');
    return;
  }

  console.log('\n💾 Gravando…');
  for (let i = 0; i < metas.length; i += 200) {
    const { error: e2 } = await supabase.from('votacoes').upsert(metas.slice(i, i + 200), { onConflict: 'votacao_id_externa' });
    if (e2) { console.error(`❌ votacoes lote ${i / 200 + 1}: ${e2.message}`); process.exitCode = 1; return; }
  }
  console.log(`   ${metas.length} votações gravadas`);
  for (let i = 0; i < linhas.length; i += 500) {
    const { error: e3 } = await supabase.from('votos_parlamentares').upsert(linhas.slice(i, i + 500), { onConflict: 'votacao_id_externa,agente_id' });
    if (e3) { console.error(`❌ votos lote ${i / 500 + 1}: ${e3.message}`); process.exitCode = 1; return; }
    if ((i / 500) % 10 === 0) console.log(`   ${Math.min(i + 500, linhas.length)}/${linhas.length} votos…`);
  }
  console.log(`   ${linhas.length} votos gravados`);

  // Conferência pelo BANCO, não pela nossa contagem: relê o que ficou lá e compara com o que a
  // fonte disse ter. É o que separa "o script rodou" de "o dado chegou".
  const { count: noBanco } = await supabase
    .from('votacoes').select('votacao_id_externa', { count: 'exact', head: true }).like('votacao_id_externa', 'SF-%');
  console.log(`\n✅ Concluído. Votações do Senado no banco: ${noBanco} (a fonte tem ${metas.length} na janela).`);
  if (noBanco < metas.length) {
    console.warn('⚠ o banco tem menos que a fonte: alguma gravação falhou em silêncio.');
    process.exitCode = 1;
  }
}

main()
  .catch((e) => { console.error('💥', e.message); process.exitCode = 1; })
  .finally(gravarSaida);
