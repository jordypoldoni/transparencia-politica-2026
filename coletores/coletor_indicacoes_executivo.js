// coletor_indicacoes_executivo.js — indicações do presidente e o voto do Senado. (17/09/2026)
//
// USO
//   node coletores/coletor_indicacoes_executivo.js --simular         (não grava nada)
//   node coletores/coletor_indicacoes_executivo.js                   (2026)
//   node coletores/coletor_indicacoes_executivo.js --anos=2023,2024,2025,2026
//
// COMO A FONTE SE ORGANIZA, porque isso custou quatro diagnósticos
//   1. materia/pesquisa/lista.json?sigla=MSF&ano=YYYY  → as Mensagens do ano. Formato PLANO
//      (Codigo, DescricaoIdentificacao, Ementa, Data), nada de IdentificacaoMateria — esse
//      é o formato de OUTRO endpoint, e presumir um pelo outro me travou uma rodada inteira.
//   2. materia/votacoes/{codigo}.json                  → a votação daquela matéria.
//   3. plenario/lista/tiposComparecimento              → o que cada sigla de presença quer
//      dizer, segundo o próprio Senado. Usamos isso em vez de inventar rótulo: a resposta da
//      votação até aponta essa URL, então o significado é da fonte, não nosso.
//
//   O feed plenario/lista/votacao NÃO serve aqui: sabatina não passa por ele (o ano inteiro
//   devolve três votações, e ele ignora a data final que a gente manda). Esse feed é outro
//   problema, do coletor_votos_senado.js, e tem substituto oficial em /dadosabertos/votacao.
//
// O QUE ESTE COLETOR NÃO FAZ
//   Não guarda como cada senador votou, porque isso não existe: a votação é secreta por
//   determinação constitucional e o campo SiglaVoto informa presença, não direção.
//   Não chuta nome nem cargo: quando a regra não casa com a ementa, grava null.

import 'dotenv/config';
import { writeFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const BASE = 'https://legis.senado.leg.br/dadosabertos';
const UA = { 'User-Agent': 'Mozilla/5.0', Accept: 'application/json' };
const pausa = (ms = 300) => new Promise((r) => setTimeout(r, ms));
const comoLista = (x) => (!x ? [] : Array.isArray(x) ? x : [x]);

// A saída também vai para um arquivo, além da tela. (18/09/2026)
// O acesso ao terminal desta máquina quebrou com a atualização do Windows de 08/09, mas a
// leitura de arquivos da pasta continua de pé. Gravando aqui, eu leio a rodada inteira
// direto — em vez de o Jordy colar centenas de linhas no chat a cada ajuste.
const ARQUIVO_SAIDA = 'coletores/_saida_indicacoes.txt';
const registro = [];
for (const nivel of ['log', 'warn', 'error']) {
  const original = console[nivel].bind(console);
  console[nivel] = (...partes) => {
    registro.push(partes.map((p) => (typeof p === 'string' ? p : JSON.stringify(p))).join(' '));
    original(...partes);
  };
}
function gravarSaida() {
  try {
    writeFileSync(ARQUIVO_SAIDA, registro.join('\n') + '\n', 'utf8');
    process.stdout.write(`\n(saída também gravada em ${ARQUIVO_SAIDA})\n`);
  } catch (e) {
    process.stdout.write(`\n(não consegui gravar ${ARQUIVO_SAIDA}: ${e.message})\n`);
  }
}

const args = process.argv.slice(2);
const SIMULAR = args.includes('--simular');
const ANOS = (args.find((a) => a.startsWith('--anos=')) || '--anos=2026')
  .split('=')[1].split(',').map((s) => parseInt(s.trim(), 10)).filter(Boolean);

// ---------------------------------------------------------------------------
// EXTRAÇÃO DA EMENTA — regra fixa, sem IA, e null quando não casa.
//
// O padrão é estável porque é redação oficial: "...o nome do Senhor FULANO, [qualificação,]
// para exercer o cargo de CARGO[, na vaga decorrente de ...]". Mas "estável" não é "sempre",
// então cada peça falha sozinha: sem nome ainda guardamos cargo, e a ementa inteira vai
// para a tela de qualquer jeito.
function extrairNome(ementa) {
  const m = ementa.match(/o nome d[oa]\s+Senhor(?:a)?\s+([^,;]{4,120}?)\s*,/i);
  if (!m) return null;
  const nome = m[1].replace(/\s+/g, ' ').trim();
  // Uma ementa que caia aqui com uma frase inteira em vez de um nome seria pior que nada.
  return /\d/.test(nome) || nome.split(' ').length > 8 ? null : nome;
}

// "para exercer o cargo de" cobre a maioria, mas não tudo: a recondução usa "ao cargo de"
// e "no cargo de", e algumas mensagens falam em "as funções de" ou em cargos no plural.
// Quatro das 183 escaparam na primeira passada — daí a alternância abaixo, e daí o coletor
// imprimir a ementa inteira quando ainda assim não casa: regra fixa que falha calada é uma
// tela mentindo em silêncio.
const PADROES_CARGO = [
  /para\s+(?:exercer\s+)?os?\s+cargos?\s+de\s+([\s\S]{4,300}?)(?:\.|$)/i,
  /(?:ao|no)\s+cargo\s+de\s+([\s\S]{4,300}?)(?:\.|$)/i,
  /para\s+exercer\s+(?:as\s+fun\u00e7\u00f5es|a\s+fun\u00e7\u00e3o)\s+de\s+([\s\S]{4,300}?)(?:\.|$)/i,
  /para\s+(?:o|a)\s+(?:cargo|fun\u00e7\u00e3o)\s+de\s+([\s\S]{4,300}?)(?:\.|$)/i,
];

function extrairCargo(ementa) {
  for (const re of PADROES_CARGO) {
    const m = ementa.match(re);
    if (m && m[1]) return m[1].replace(/\s+/g, ' ').trim() || null;
  }
  return null;
}

// Órgão e tipo: casamento com uma lista explícita. O que não estiver na lista fica null —
// preferimos um campo vazio a uma categoria inventada, que é o tipo de erro que um site de
// transparência não pode cometer em silêncio.
// A MESMA agência aparece grafada de três jeitos nas ementas (ANVISA, Anvisa, - Anvisa;
// ANEEL com hífen e com travessão). Guardando o texto como veio, o filtro por órgão quebraria
// em variantes da mesma coisa. Por isso o nome é CANÔNICO: o padrão reconhece, mas quem vai
// para o banco é o nome desta tabela.
//
// A lista é explícita de propósito. Um curinga /Agência Nacional[^,.]*/ parecia esperto e
// deixou ANPD e ANSN de fora — são "Autoridade Nacional", não "Agência" — além de guardar
// nome sujo. Estes saem de quatro anos de dados reais; o que não estiver aqui fica null e
// aparece na saída, que é como a lista cresce com evidência em vez de palpite.
const ORGAOS = [
  [/Supremo Tribunal Federal/i,                            'Supremo Tribunal Federal',                                  'judiciario'],
  [/Superior Tribunal de Justi\u00e7a/i,                       'Superior Tribunal de Justi\u00e7a',                             'judiciario'],
  [/Tribunal Superior do Trabalho/i,                       'Tribunal Superior do Trabalho',                              'judiciario'],
  [/Tribunal Superior Eleitoral/i,                         'Tribunal Superior Eleitoral',                                'judiciario'],
  [/Superior Tribunal Militar/i,                           'Superior Tribunal Militar',                                  'judiciario'],
  [/Tribunal de Contas da Uni\u00e3o/i,                        'Tribunal de Contas da Uni\u00e3o',                              'controle'],
  [/Procurador[ai]?-Geral da Rep\u00fablica|Minist\u00e9rio P\u00fablico da Uni\u00e3o/i, 'Minist\u00e9rio P\u00fablico da Uni\u00e3o',           'controle'],
  [/Defensoria P\u00fablica da Uni\u00e3o/i,                       'Defensoria P\u00fablica da Uni\u00e3o',                            'defensoria'],
  [/Comiss\u00e3o de Valores Mobili\u00e1rios|\bCVM\b/i,            'Comiss\u00e3o de Valores Mobili\u00e1rios (CVM)',                  'agencia'],
  [/Banco Central/i,                                       'Banco Central do Brasil',                                    'agencia'],
  [/Conselho Administrativo de Defesa Econ\u00f4mica|\bCADE\b/i, 'Conselho Administrativo de Defesa Econ\u00f4mica (Cade)',      'agencia'],
  [/Ag\u00eancia Nacional do Cinema/i,                          'Ag\u00eancia Nacional do Cinema (Ancine)',                       'agencia'],
  [/Ag\u00eancia Nacional de Vigil\u00e2ncia Sanit\u00e1ria/i,          'Ag\u00eancia Nacional de Vigil\u00e2ncia Sanit\u00e1ria (Anvisa)',       'agencia'],
  [/Ag\u00eancia Nacional do Petr\u00f3leo/i,                       'Ag\u00eancia Nacional do Petr\u00f3leo (ANP)',                     'agencia'],
  [/Ag\u00eancia Nacional de Sa\u00fade Suplementar/i,              'Ag\u00eancia Nacional de Sa\u00fade Suplementar (ANS)',            'agencia'],
  [/Ag\u00eancia Nacional de Avia\u00e7\u00e3o Civil/i,                 'Ag\u00eancia Nacional de Avia\u00e7\u00e3o Civil (Anac)',                'agencia'],
  [/Ag\u00eancia Nacional de Minera\u00e7\u00e3o/i,                     'Ag\u00eancia Nacional de Minera\u00e7\u00e3o (ANM)',                    'agencia'],
  [/Ag\u00eancia Nacional de \u00c1guas/i,                          'Ag\u00eancia Nacional de \u00c1guas e Saneamento B\u00e1sico (ANA)',     'agencia'],
  [/Ag\u00eancia Nacional de Transportes Terrestres/i,          'Ag\u00eancia Nacional de Transportes Terrestres (ANTT)',         'agencia'],
  [/Ag\u00eancia Nacional de Transportes Aquavi\u00e1rios/i,        'Ag\u00eancia Nacional de Transportes Aquavi\u00e1rios (Antaq)',      'agencia'],
  [/Ag\u00eancia Nacional de Energia El\u00e9trica/i,               'Ag\u00eancia Nacional de Energia El\u00e9trica (Aneel)',            'agencia'],
  [/Ag\u00eancia Nacional de Telecomunica\u00e7\u00f5es/i,              'Ag\u00eancia Nacional de Telecomunica\u00e7\u00f5es (Anatel)',           'agencia'],
  [/Autoridade Nacional de Prote\u00e7\u00e3o de Dados/i,           'Autoridade Nacional de Prote\u00e7\u00e3o de Dados (ANPD)',         'agencia'],
  [/Autoridade Nacional de Seguran\u00e7a Nuclear/i,            'Autoridade Nacional de Seguran\u00e7a Nuclear (ANSN)',          'agencia'],
  [/Ag\u00eancia Brasileira de Intelig\u00eancia|\bABIN\b/i,        'Ag\u00eancia Brasileira de Intelig\u00eancia (Abin)',              'outro'],
  [/Departamento Nacional de Infraestrutura de Transportes|\bDNIT\b/i, 'Departamento Nacional de Infraestrutura de Transportes (Dnit)', 'outro'],
  // Por último: é o padrão mais largo, e só deve pegar o que ninguém acima reclamou.
  [/Embaixador|Embaixadora|Delegad[oa] Permanente|Representante Permanente/i, 'Minist\u00e9rio das Rela\u00e7\u00f5es Exteriores', 'diplomacia'],
];

function classificar(cargo, ementa) {
  const texto = `${cargo || ''} ${ementa}`;
  for (const [re, nome, tipo] of ORGAOS) {
    if (re.test(texto)) return { orgao: nome, tipo_orgao: tipo };
  }
  return { orgao: null, tipo_orgao: 'outro' };
}

// ---------------------------------------------------------------------------
async function buscarJson(caminho) {
  const r = await fetch(BASE + caminho, { headers: UA });
  if (!r.ok) throw new Error(`${caminho} respondeu ${r.status}`);
  const t = await r.text();
  if (!t) throw new Error(`${caminho} respondeu 200 com corpo vazio`);
  return JSON.parse(t);
}

// O dicionário oficial das siglas de presença. Se ele falhar, seguimos sem descrição em vez
// de inventar: um rótulo errado sobre presença de parlamentar é pior que rótulo nenhum.
async function dicionarioDePresenca() {
  try {
    const j = await buscarJson('/plenario/lista/tiposComparecimento');
    const mapa = {};
    const varrer = (n) => {
      if (Array.isArray(n)) return n.forEach(varrer);
      if (n && typeof n === 'object') {
        const sigla = n.SiglaComparecimento || n.Sigla || n.sigla;
        const desc = n.DescricaoComparecimento || n.Descricao || n.descricao;
        if (sigla && desc) mapa[String(sigla)] = String(desc);
        Object.values(n).forEach(varrer);
      }
    };
    varrer(j);
    console.log(`   dicionário de presença: ${Object.keys(mapa).length} siglas`);
    return mapa;
  } catch (e) {
    console.warn(`   ⚠ não consegui o dicionário de presença (${e.message}) — siglas ficam sem descrição`);
    return {};
  }
}

async function votacaoDaMateria(codigo, dicionario) {
  const j = await buscarJson(`/materia/votacoes/${codigo}.json`);
  const lista = comoLista(j?.VotacaoMateria?.Materia?.Votacoes?.Votacao);
  if (!lista.length) return null;

  const v = lista[lista.length - 1];           // a última é a decisiva
  const presencas = comoLista(v?.Votos?.VotoParlamentar).map((p) => {
    const ip = p.IdentificacaoParlamentar || {};
    const sigla = p.SiglaVoto ? String(p.SiglaVoto) : null;
    return {
      codigo: ip.CodigoParlamentar ? String(ip.CodigoParlamentar) : null,
      nome: ip.NomeParlamentar || null,
      nome_completo: ip.NomeCompletoParlamentar || null,
      partido: ip.SiglaPartidoParlamentar || null,
      uf: ip.UfParlamentar || null,
      sigla_voto: sigla,
      comparecimento: sigla ? (dicionario[sigla] || null) : null,
    };
  });

  const votou = presencas.filter((p) => /^votou$/i.test(p.sigla_voto || '')).length;

  return {
    votada: true,
    data_votacao: v?.SessaoPlenaria?.DataSessao || v?.DataSessao || null,
    resultado: v.DescricaoResultado || null,
    votos_sim: v.TotalVotosSim != null ? Number(v.TotalVotosSim) : null,
    votos_nao: v.TotalVotosNao != null ? Number(v.TotalVotosNao) : null,
    votos_abstencao: v.TotalVotosAbstencao != null ? Number(v.TotalVotosAbstencao) : null,
    votacao_secreta: /^sim$/i.test(String(v.IndicadorVotacaoSecreta || '')),
    codigo_sessao: v.CodigoSessaoVotacao ? Number(v.CodigoSessaoVotacao) : null,
    descricao_votacao: v.DescricaoVotacao || null,
    presencas,
    total_presentes: votou,
    total_ausentes: presencas.length - votou,
    _todas: lista.length,
  };
}

async function main() {
  console.log(`🚀 Indicações do Executivo — anos ${ANOS.join(', ')}${SIMULAR ? ' (SIMULAÇÃO, nada é gravado)' : ''}`);

  if (!SIMULAR && (!SUPABASE_URL || !SUPABASE_KEY)) {
    console.error('❌ Faltam credenciais Supabase. Rode com --simular para só inspecionar.');
    process.exit(1);
  }
  const supabase = SIMULAR ? null : createClient(SUPABASE_URL, SUPABASE_KEY);

  const dicionario = await dicionarioDePresenca();
  const linhas = [];
  let semNome = 0, semCargo = 0;

  for (const ano of ANOS) {
    let materias = [];
    try {
      const j = await buscarJson(`/materia/pesquisa/lista.json?sigla=MSF&ano=${ano}`);
      materias = comoLista(j?.PesquisaBasicaMateria?.Materias?.Materia);
    } catch (e) {
      console.warn(`   ⚠ ${ano}: ${e.message}`);
      continue;
    }

    // Uma MSF pode ser indicação de nome, operação de crédito, ou outra coisa. Só as de
    // nome interessam, e o filtro é a própria redação oficial.
    const indicacoes = materias.filter((m) => /o nome d[oa]\s+Senhor/i.test(m.Ementa || ''));
    console.log(`\n📥 ${ano}: ${materias.length} MSF, ${indicacoes.length} indicações de nome`);

    for (const m of indicacoes) {
      const ementa = String(m.Ementa || '');
      const nome = extrairNome(ementa);
      const cargo = extrairCargo(ementa);
      const { orgao, tipo_orgao } = classificar(cargo, ementa);
      if (!nome) semNome++;
      if (!cargo) semCargo++;

      let votacao = null;
      try { votacao = await votacaoDaMateria(m.Codigo, dicionario); }
      catch (e) { console.warn(`   ⚠ ${m.DescricaoIdentificacao}: votação — ${e.message}`); }
      await pausa();

      const linha = {
        codigo_materia: Number(m.Codigo),
        identificacao: m.DescricaoIdentificacao || `${m.Sigla} ${m.Numero}/${m.Ano}`,
        sigla: m.Sigla || null,
        numero: m.Numero || null,
        ano: Number(m.Ano) || ano,
        data_mensagem: m.Data || null,
        autor: m.Autor || null,
        ementa,
        nome_indicado: nome,
        cargo,
        orgao,
        tipo_orgao,
        votada: false,
        data_votacao: null, resultado: null,
        votos_sim: null, votos_nao: null, votos_abstencao: null,
        votacao_secreta: null, codigo_sessao: null, descricao_votacao: null,
        presencas: [], total_presentes: null, total_ausentes: null,
        url_materia: `https://www25.senado.leg.br/web/atividade/materias/-/materia/${m.Codigo}`,
        url_fonte: m.UrlDetalheMateria || `${BASE}/materia/${m.Codigo}`,
        coletado_em: new Date().toISOString(),
      };
      if (votacao) {
        const { _todas, ...resto } = votacao;
        Object.assign(linha, resto);
      }
      linhas.push(linha);

      const placar = linha.votada
        ? `${linha.resultado} ${linha.votos_sim}x${linha.votos_nao} em ${linha.data_votacao}`
        : 'sem votação';
      console.log(`   ${linha.identificacao.padEnd(14)} ${placar}`);
      console.log(`      ${nome || '⚠ NOME NÃO EXTRAÍDO'} — ${cargo || '⚠ CARGO NÃO EXTRAÍDO'}`);
      console.log(`      órgão: ${orgao || '(não classificado)'} · ${tipo_orgao}`);
      // Sem cargo, a ementa inteira é o que vai para a tela — mas eu preciso VER a redação
      // que escapou, senão corrijo a regra no escuro.
      if (!cargo && SIMULAR) console.log(`      ementa: ${ementa}`);
    }
  }

  console.log(`\n📊 ${linhas.length} indicações · ${linhas.filter((l) => l.votada).length} votadas`);
  if (semNome || semCargo) console.log(`   ⚠ ${semNome} sem nome extraído, ${semCargo} sem cargo — vão para o banco como null`);

  // Siglas de presença que apareceram sem descrição no dicionário: é o sinal de que a fonte
  // mudou e a tela vai mostrar um código cru. Melhor descobrir aqui.
  const semDescricao = new Set();
  for (const l of linhas) for (const p of l.presencas) if (p.sigla_voto && !p.comparecimento) semDescricao.add(p.sigla_voto);
  if (semDescricao.size) console.log(`   ⚠ siglas de presença sem descrição oficial: ${[...semDescricao].join(', ')}`);

  if (SIMULAR) { console.log('\n(simulação — nada foi gravado)'); return; }

  const { error } = await supabase
    .from('indicacoes_executivo')
    .upsert(linhas, { onConflict: 'codigo_materia' });
  if (error) { console.error('❌ Supabase:', error.message); process.exit(1); }
  console.log(`✅ ${linhas.length} indicações gravadas.`);
}

main()
  .catch((e) => { console.error('❌', e.message); process.exitCode = 1; })
  .finally(gravarSaida);
