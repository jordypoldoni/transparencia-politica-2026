// Deputados ESTADUAIS (e DISTRITAIS, no DF) ELEITOS em 2022, lidos do TSE. (29/09/2026)
//
// POR QUE: o site so tinha o cadastro de RS (ALERGS) e SP (ALESP). Nao existe fonte nacional de
// quem esta em exercicio nas 27 Assembleias; o TSE e a unica que cobre todas pelo mesmo caminho.
// Decisao do Jordy em 29/09: gravar no banco 1 (~1.059 linhas, menos de 1 MB).
//
// O QUE MEDIMOS ANTES DE ESCREVER (29/09, navegador do Jordy, IP do Brasil):
//   - listagem: /listar/2022/{UF}/2040602022/{cargo}/candidatos (7 = estadual, 8 = distrital no DF)
//   - eleito = `descricaoTotalizacao` comecando por "Eleito" ("Eleito por QP", "Eleito por média")
//   - RS: 830 candidatos, 55 eleitos para 55 cadeiras, resposta de 2 MB
//   - foto: /divulga/rest/arquivo/img/2040602022/{sq}/{UF} responde a foto (37 KB, jpeg)
//
// ELEITO NAO E "EM EXERCICIO": medido contra o cadastro, o RS tem 1 eleito que saiu (Mainardi) e
// 2 suplentes em exercicio (Halley Lino, Zila Breitenbach); SP tem 6 e 6. O PARTIDO e o da
// eleicao (Nadine: PSDB em 2022, PSD hoje). A tela precisa dizer isso.
//
// NUNCA GRAVA: titulo de eleitor (a lista traz), CPF, qualquer documento.
//
// CONFERENCIA: o numero de eleitos de cada estado tem que bater com as cadeiras da Assembleia.
// Se nao bater, o estado e gravado mesmo assim, mas o coletor GRITA e nao apaga nada daquele
// estado: resposta do tamanho errado e suspeita, nao confirmacao.
//
// Uso:
//   node coletores/coletor_deputados_estaduais_eleitos.js --uf=RS --simular   (mede, nao grava)
//   node coletores/coletor_deputados_estaduais_eleitos.js                     (os 27)
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const HOST_TSE = 'https://divulgacandcontas.tse.jus.br';
const ANO = 2022;
const ID_ELEICAO = 2040602022;
const TABELA = 'deputados_estaduais_eleitos';
const UA = { 'User-Agent': 'Mozilla/5.0', Accept: 'application/json' };

// Cadeiras de cada Assembleia (e da Camara Legislativa do DF). Soma: 1.059.
const CADEIRAS = { AC: 24, AL: 27, AP: 24, AM: 24, BA: 63, CE: 46, DF: 24, ES: 30, GO: 41, MA: 42, MT: 24, MS: 24, MG: 77,
  PA: 41, PB: 36, PR: 54, PE: 49, PI: 30, RJ: 70, RN: 24, RS: 55, RO: 24, RR: 24, SC: 40, SP: 94, SE: 24, TO: 24 };
// Estados com cadastro de mandato no site (fonte_api em agentes_politicos), para ligar eleito e mandato.
const CADASTRO = { RS: 'alergs', SP: 'alesp' };

const args = process.argv.slice(2);
const opcao = (nome) => { const a = args.find((x) => x.startsWith(`--${nome}=`)); return a ? a.split('=')[1] : null; };
const SIMULAR = args.includes('--simular');
const UFS = opcao('uf') ? opcao('uf').toUpperCase().split(',') : Object.keys(CADEIRAS);
const PONTE = process.env.TSE_PONTE_URL || null;
const PONTE_TOKEN = process.env.PONTE_TOKEN || SUPABASE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) { console.error('❌ Faltam SUPABASE_URL e/ou SUPABASE_SERVICE_ROLE_KEY.'); process.exit(1); }
const invalidas = UFS.filter((u) => !CADEIRAS[u]);
if (invalidas.length) { console.error(`❌ UF desconhecida: ${invalidas.join(', ')}`); process.exit(1); }
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const pausa = (ms = 400) => new Promise((r) => setTimeout(r, ms));
const slugify = (s) => (s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

async function lerTse(caminho) {
  const r = PONTE
    ? await fetch(`${PONTE}?caminho=${encodeURIComponent(caminho)}`, { headers: { Authorization: `Bearer ${PONTE_TOKEN}` } })
    : await fetch(HOST_TSE + caminho, { headers: UA });
  const erroDaPonte = r.headers.get('x-ponte-erro');
  if (erroDaPonte) throw new Error(`ponte: ${erroDaPonte}`);
  if (!r.ok) throw new Error(`TSE respondeu ${r.status}`);
  const texto = await r.text();
  return texto ? JSON.parse(texto) : null;
}

// LIGAÇÃO ELEITO 2022 → MANDATO NA ASSEMBLEIA (cadastro ALERGS/ALESP). Por nome, com cuidado:
// o partido NÃO entra, porque é o da eleição e muita gente trocou (Nadine: PSDB em 2022, PSD hoje).
// A Assembleia grava o nome parlamentar ("Aloísio Classmann") e o TSE o nome de urna ("CLASSMANN")
// e o civil. Três regras, na ordem, e só vale ligação ÚNICA nos dois sentidos:
//   1. nome de urna igual ao nome da Assembleia;
//   2. todas as palavras do nome da Assembleia (tirando título e partícula) aparecem no nome
//      civil ou de urna do eleito;
//   3. todas as palavras do nome de urna do eleito aparecem no nome da Assembleia (só com duas
//      palavras ou mais: "SANTINI" sozinho não liga ninguém).
// Quem sobra dos dois lados é informação: eleito que saiu, ou suplente em exercício.
const TIRAR = new Set(['DR', 'DRA', 'PROF', 'PROFA', 'PROFESSOR', 'PROFESSORA', 'DELEGADO', 'DELEGADA', 'CAPITAO', 'CORONEL',
  'SARGENTO', 'TENENTE', 'MAJOR', 'CABO', 'SOLDADO', 'PASTOR', 'PASTORA', 'IRMAO', 'IRMA', 'PADRE', 'AGENTE', 'FEDERAL',
  'DE', 'DA', 'DO', 'DOS', 'DAS', 'E', 'O', 'A', 'JR', 'JUNIOR', 'FILHO', 'NETO', 'SOBRINHO']);
const normNome = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().replace(/[^A-Z]+/g, ' ').trim();
const palavras = (s) => normNome(s).split(' ').filter((p) => p.length > 1 && !TIRAR.has(p));
const contem = (grande, pequeno) => pequeno.length > 0 && pequeno.every((p) => grande.includes(p));

function ligarEleitosAoMandato(eleitos, agentes) {
  const regras = [
    (e, a) => normNome(e.nome_urna) === normNome(a.nome_urna),
    (e, a) => { const pa = palavras(a.nome_urna); return pa.length >= 2 && contem([...palavras(e.nome_completo), ...palavras(e.nome_urna)], pa); },
    (e, a) => { const pe = palavras(e.nome_urna); return pe.length >= 2 && contem(palavras(a.nome_urna), pe); },
  ];
  const ligacao = new Map(); // sq do eleito -> agente
  const usados = new Set();
  for (const regra of regras) {
    for (const a of agentes) {
      if (usados.has(a.id)) continue;
      const achados = eleitos.filter((e) => !ligacao.has(e.sq_candidato) && regra(e, a));
      if (achados.length !== 1) continue;
      // Único também no outro sentido: nenhum OUTRO agente livre bate com o mesmo eleito.
      const rivais = agentes.filter((b) => b.id !== a.id && !usados.has(b.id) && regra(achados[0], b));
      if (rivais.length) continue;
      ligacao.set(achados[0].sq_candidato, a);
      usados.add(a.id);
    }
  }
  return {
    ligacao,
    eleitosSemMandato: eleitos.filter((e) => !ligacao.has(e.sq_candidato)),
    mandatosSemEleito: agentes.filter((a) => !usados.has(a.id)),
  };
}

async function eleitosDaUf(uf) {
  const cargo = uf === 'DF' ? 8 : 7;
  const j = await lerTse(`/divulga/rest/v1/candidatura/listar/${ANO}/${uf}/${ID_ELEICAO}/${cargo}/candidatos`);
  const todos = (j && j.candidatos) || [];
  const eleitos = todos.filter((c) => /^Eleito/i.test(String(c.descricaoTotalizacao || '')));
  return {
    totalCandidatos: todos.length,
    eleitos: eleitos.map((c) => {
      const sq = String(c.id);
      const nome = String(c.nomeUrna || c.nomeCompleto || '').trim(); // o TSE manda " DELEGADA NADINE", com espaco
      return {
        ano_eleicao: ANO,
        cargo: cargo === 8 ? 'Deputado Distrital' : 'Deputado Estadual',
        uf,
        sq_candidato: sq,
        nr_candidato: c.numero != null ? String(c.numero) : null,
        nome_urna: nome,
        nome_completo: c.nomeCompleto ? String(c.nomeCompleto).trim() : null,
        slug: `${slugify(nome)}-${c.numero || sq}-${uf.toLowerCase()}-${ANO}`,
        partido_sigla: c.partido?.sigla || null,
        coligacao_nome: c.nomeColigacao || null,
        totalizacao_tse: c.descricaoTotalizacao || null,
        foto_url: `${HOST_TSE}/divulga/rest/arquivo/img/${ID_ELEICAO}/${sq}/${uf}`,
        agente_id: null,
        coletado_em: new Date().toISOString(),
      };
    }),
  };
}

async function main() {
  console.log(`🚀 Deputados estaduais eleitos em ${ANO}${SIMULAR ? ' (SIMULAÇÃO, nada gravado)' : ''}`);
  console.log(PONTE ? '🌉 via ponte' : '🔌 direto no TSE');
  let gravados = 0;
  const problemas = [];

  for (const uf of UFS) {
    let r;
    try { r = await eleitosDaUf(uf); } catch (e) { problemas.push(`${uf}: falhou (${e.message})`); console.error(`❌ ${uf}: ${e.message}`); continue; }
    const { eleitos, totalCandidatos } = r;
    const bate = eleitos.length === CADEIRAS[uf];
    console.log(`── ${uf}: ${eleitos.length} eleitos de ${totalCandidatos} candidatos (cadeiras: ${CADEIRAS[uf]})${bate ? '' : '  ⚠️ NÃO BATE'}`);
    if (!bate) problemas.push(`${uf}: ${eleitos.length} eleitos para ${CADEIRAS[uf]} cadeiras`);
    if (!eleitos.length) { await pausa(); continue; }

    // Liga ao mandato onde o site tem cadastro da Assembleia.
    if (CADASTRO[uf]) {
      const { data: agentes, error } = await supabase.from('agentes_politicos').select('id, nome_urna').eq('uf_sede', uf).eq('fonte_api', CADASTRO[uf]);
      if (error) { problemas.push(`${uf}: cadastro não lido (${error.message})`); }
      else {
        const { ligacao, eleitosSemMandato, mandatosSemEleito } = ligarEleitosAoMandato(eleitos, agentes || []);
        for (const e of eleitos) e.agente_id = ligacao.get(e.sq_candidato)?.id || null;
        console.log(`   ligados ao cadastro ${CADASTRO[uf]}: ${ligacao.size} de ${eleitos.length}`);
        if (eleitosSemMandato.length) console.log(`   eleitos sem mandato no cadastro (saíram ou nome diferente): ${eleitosSemMandato.map((e) => e.nome_urna).join(', ')}`);
        if (mandatosSemEleito.length) console.log(`   no cadastro sem ser eleito (suplente em exercício?): ${mandatosSemEleito.map((a) => a.nome_urna).join(', ')}`);
      }
    }

    if (SIMULAR) { await pausa(); continue; }

    const { error } = await supabase.from(TABELA).upsert(eleitos, { onConflict: 'sq_candidato' });
    if (error) { problemas.push(`${uf}: gravação falhou (${error.message})`); console.error(`❌ ${uf}: ${error.message}`); await pausa(); continue; }
    gravados += eleitos.length;

    // Só apaga quem deixou de ser eleito quando o estado BATE com as cadeiras: com número
    // estranho, a lista pode estar incompleta, e apagar seria perder dado bom.
    if (bate) {
      const { error: errDel } = await supabase.from(TABELA).delete().eq('ano_eleicao', ANO).eq('uf', uf)
        .not('sq_candidato', 'in', `(${eleitos.map((e) => e.sq_candidato).join(',')})`);
      if (errDel) problemas.push(`${uf}: limpeza falhou (${errDel.message})`);
    }
    await pausa();
  }

  const esperado = UFS.reduce((s, u) => s + CADEIRAS[u], 0);
  console.log(`\n📊 ${SIMULAR ? 'simulados' : 'gravados'}: ${SIMULAR ? '-' : gravados} (esperado: ${esperado})`);
  if (problemas.length) {
    console.log(`⚠️  ${problemas.length} problema(s):`);
    for (const p of problemas) console.log(`   - ${p}`);
    process.exit(1);
  }
  console.log('✅ todos os estados bateram com as cadeiras');
}

main().catch((e) => { console.error('❌', e); process.exit(1); });
