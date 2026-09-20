// coletor_ficha_tse.js — a ficha do DivulgaCandContas vai para o banco. (18/09/2026)
//
// USO
//   node coletores/coletor_ficha_tse.js --simular      (não grava)
//   node coletores/coletor_ficha_tse.js
//
// POR QUE ESTE ARQUIVO EXISTE
// As seções "Situação da candidatura", "Patrimônio declarado" e "Documentos e redes"
// buscavam o TSE ao vivo, pelo navegador. Em produção o Akamai do TSE recusa a Vercel:
//   403 — "Access Denied ... Reference #18.45721102.1"
// Não é DNS e não é tempo: a função declarou `regiao: iad1` e o corpo do 403 é a página de
// negação do Akamai. É bloqueio de ORIGEM, e não há ajuste de código que contorne.
//
// Registro de um erro meu, para não repetir: eu concluí que o User-Agent estava descartado
// porque o 403 continuou depois de trocá-lo. Não estava. Na Vercel o bloqueio de IP dispara
// primeiro, então o sintoma não mudar não elimina a segunda causa — e a segunda causa era
// real: com UA assinado, o TSE derruba até daqui. "O sintoma não mudou" nunca prova
// "a causa foi descartada" quando existe outra causa suficiente na frente dela.
//
// E o ganho não é só contornar o bloqueio. Buscando no navegador DEPOIS da página carregar,
// nada disso existia para o Google — patrimônio, documentos, situação, tudo invisível para
// busca. Servido do banco, entra no HTML. É o mesmo raciocínio que levou o contexto_extra
// das votações para o banco em vez de gerar no clique.
//
// O QUE NÃO VAI PARA O BANCO, DE PROPÓSITO: cpf e tituloEleitor. A fonte publica os dois
// completos. Não servem para fiscalizar ninguém e são vetor de fraude de identidade. Ficam
// fora aqui, na coleta — não só na tela —, para que nenhuma consulta futura os encontre.

import 'dotenv/config';
import { writeFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
import { traduzir } from './ficha_tse_traduzir.js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const HOST_TSE = 'https://divulgacandcontas.tse.jus.br';
const REST = '/divulga/rest/v1/candidatura';   // caminho, nao URL: quem monta a URL e buscarTse()
const ID_ELEICAO = 20322002026;     // o da ficha individual
const ID_ELEICAO_LISTA = 6257;      // o da listagem — são DOIS, e trocar devolve corpo vazio
const ANO = 2026;
// SOBRE O User-Agent (18/09/2026): já foi 'Mozilla/5.0 (compatible; LumeCidadaoBot/1.0; ...)',
// assinado, que é o certo em princípio — e o Akamai do TSE derrubou com 403 TODAS as 28
// fichas, inclusive da máquina do Jordy, onde 'Mozilla/5.0' passa. O WAF exige que pareça
// navegador. Não dá para negociar com ele, o dado é público e o próprio portal do TSE é lido
// por navegador. Voltamos ao que funciona. Não troque sem testar contra a fonte.
const UA = { 'User-Agent': 'Mozilla/5.0', Accept: 'application/json' };

// A PONTE (19/09/2026). O Akamai do TSE bloqueia por ORIGEM: recusou com 403 a Vercel, o
// sandbox de nuvem e o runner do GitHub Actions (28 fichas e 2 listagens, todas). A maquina
// do Jordy passa, e as Edge Functions do Supabase tambem passam, medido no mesmo dia.
//
// Entao: sem TSE_PONTE_URL o coletor fala direto com o TSE, que e o caso de rodar daqui.
// Com a variavel definida (e o workflow coletar_fiscal.yml define), ele pede a mesma coisa
// pela funcao `tse-ponte` do Supabase, que repassa sem interpretar nada.
//
// A configuracao e EXPLICITA, e nao "tenta direto e cai para a ponte se der 403", porque
// tentar primeiro desperdicaria 30 requisicoes recusadas em toda execucao agendada e, pior,
// deixaria o log com 30 erros vermelhos numa execucao que deu certo.
const PONTE = process.env.TSE_PONTE_URL || null;
// A senha da ponte e PROPRIA desde 20/09/2026 (PONTE_TOKEN), nao mais a chave do banco.
// Motivo medido: o projeto passou a usar as chaves novas (sb_publishable_/sb_secret_), entao a
// SUPABASE_SERVICE_ROLE_KEY que o ambiente da funcao injeta deixou de ser o JWT legado que este
// coletor tem em maos, e TODA chamada voltava 401. Era o exit 1 do workflow de 19/09.
// De quebra corrige um desenho ruim: a chave do banco viajava como senha de endpoint publico.
// O fallback existe so para nao quebrar quem ainda nao definiu o token.
const PONTE_TOKEN = process.env.PONTE_TOKEN || SUPABASE_KEY;

async function buscarTse(caminho) {
  if (!PONTE) return fetch(HOST_TSE + caminho, { headers: UA });

  const r = await fetch(`${PONTE}?caminho=${encodeURIComponent(caminho)}`, {
    headers: { Authorization: `Bearer ${PONTE_TOKEN}` },
  });
  // A ponte marca os erros DELA num cabecalho proprio. Sem isso, um 401 de credencial
  // chegaria aqui como "HTTP 401" e pareceria coisa do TSE, mandando o diagnostico para o
  // lado errado logo no primeiro passo.
  const erroDaPonte = r.headers.get('x-ponte-erro');
  if (erroDaPonte) throw new Error(`ponte: ${erroDaPonte}`);
  return r;
}

const ARQUIVO_SAIDA = 'coletores/_saida_ficha_tse.txt';
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
const pausa = (ms = 400) => new Promise((r) => setTimeout(r, ms));

// Nome de um sq_candidato, para dizer "substituída por FULANO" em vez de mostrar código.
async function mapaDeNomes() {
  const mapa = {};
  for (const cargo of [1, 2]) {
    const r = await buscarTse(`${REST}/listar/${ANO}/BR/${ID_ELEICAO_LISTA}/${cargo}/candidatos`);
    if (!r.ok) { console.warn(`   ⚠ listagem cargo ${cargo}: ${r.status}`); continue; }
    const j = await r.json();
    for (const c of j.candidatos || []) if (c?.id) mapa[String(c.id)] = c.nomeUrna || c.nomeCompleto || null;
  }
  return mapa;
}

// A tradução mora em ficha_tse_traduzir.js desde 20/09/2026 (o coletor federal usa a mesma).

async function main() {
  console.log(`🚀 Ficha do TSE para o banco${SIMULAR ? ' (SIMULAÇÃO)' : ''}`);
  console.log(PONTE ? `🌉 via ponte: ${PONTE}` : '🔌 direto no TSE (sem ponte)');
  if (!SUPABASE_URL || !SUPABASE_KEY) { console.error('❌ Faltam credenciais Supabase.'); process.exitCode = 1; return; }
  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

  const { data: candidatos, error } = await supabase
    .from('candidatos_presidenciais')
    .select('id, sq_candidato, nome_urna, cargo')
    .eq('ano_eleicao', ANO);
  if (error) { console.error('❌ Supabase:', error.message); process.exitCode = 1; return; }

  const comSq = (candidatos || []).filter((c) => c.sq_candidato);
  console.log(`📥 ${candidatos.length} candidatos, ${comSq.length} com sq_candidato\n`);

  const nomes = await mapaDeNomes();
  const nomeDe = (id) => (id ? (nomes[String(id)] || null) : null);

  let ok = 0;
  const falhou = [];
  for (const c of comSq) {
    try {
      const r = await buscarTse(`${REST}/buscar/${ANO}/BR/${ID_ELEICAO}/candidato/${c.sq_candidato}`);
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const texto = await r.text();
      if (!texto) throw new Error('corpo vazio (id de eleição errado?)');
      const campos = traduzir(JSON.parse(texto), nomeDe, c.sq_candidato);

      console.log(`   ${c.nome_urna} (${c.cargo})`);
      console.log(`      ${campos.situacao_tse || '?'} · ${campos.documentos.length} documentos · ${campos.redes.length} endereços · ${campos.bens.length} bens`);
      if (campos.vices.length) console.log(`      vices no mesmo número: ${campos.vices.map((v) => v.nome).join(', ')}`);
      if (campos.motivos.length) console.log(`      motivos: ${campos.motivos.join(' | ').slice(0, 200)}`);
      if (campos.substituido) console.log(`      SUBSTITUÍDO por ${campos.substituto_nome || campos.substituto_sq || '?'}`);

      if (!SIMULAR) {
        const { error: e2 } = await supabase.from('candidatos_presidenciais').update(campos).eq('id', c.id);
        if (e2) throw new Error(`gravação: ${e2.message}`);
      }
      ok++;
    } catch (e) {
      falhou.push(`${c.nome_urna}: ${e.message}`);
      console.warn(`   ⚠ ${c.nome_urna}: ${e.message}`);
    }
    await pausa();
  }

  console.log(`\n📊 ${ok} fichas${SIMULAR ? ' lidas' : ' gravadas'}, ${falhou.length} falhas`);
  if (SIMULAR) console.log('(simulação, nada foi gravado)');

  // SAIDA COM CÓDIGO DE ERRO (19/09/2026), porque a partir de hoje isto roda agendado.
  // Ninguém abre o log de uma execução que passou. Se o script sempre sai 0, uma coleta que
  // não trouxe nada fica VERDE no GitHub, e situação de candidatura envelhece em silêncio até
  // alguém reparar na tela. Zero ficha é falha do passo; falha parcial é aviso visível.
  if (ok === 0) {
    console.error('❌ Nenhuma ficha lida.');
    console.error('   Se as falhas forem HTTP 403, o Akamai do TSE está recusando o IP de onde isto rodou');
    console.error('   (foi exatamente o que aconteceu com a Vercel em 18/09). Não é erro de código.');
    if (process.env.GITHUB_ACTIONS) console.log('::error title=Ficha do TSE::Nenhuma ficha coletada. Ver se o TSE devolveu 403 para o runner.');
    process.exitCode = 1;
    return;
  }
  if (falhou.length) {
    const msg = `${falhou.length} de ${comSq.length} fichas falharam: ${falhou.join(' | ').slice(0, 400)}`;
    console.warn(`⚠ ${msg}`);
    if (process.env.GITHUB_ACTIONS) console.log(`::warning title=Fichas do TSE incompletas::${msg}`);
  }
}

main()
  .catch((e) => { console.error('❌', e.message); process.exitCode = 1; })
  .finally(gravarSaida);
