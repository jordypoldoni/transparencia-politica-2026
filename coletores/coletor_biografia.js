// coletor_biografia.js — enriquece a Ficha 360° dos parlamentares.
// Fontes oficiais: Câmara (dados abertos v2), Senado (dados abertos XML) e ALESP (best-effort).
// Preenche em agentes_politicos: bio (nascimento, naturalidade, escolaridade, profissão,
// e-mail, redes, situação), comissões, frentes e proposições apresentadas.
//
// Rodar LOCAL (o sandbox não alcança as APIs). Precisa de .env com SUPABASE_URL e
// SUPABASE_SERVICE_ROLE_KEY. Opcional: filtrar casa → `node coletores/coletor_biografia.js camara`
// (valores: camara | senado | alesp). Idempotente: só faz UPDATE por id.
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import { XMLParser } from 'fast-xml-parser';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SUPABASE_KEY) { console.error('❌ Faltam credenciais Supabase (.env).'); process.exit(1); }
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const CAMARA = 'https://dadosabertos.camara.leg.br/api/v2';
const SENADO = 'https://legis.senado.leg.br/dadosabertos';
// Início do mandato atual (57ª Legislatura da Câmara) — limita as proposições ao mandato vigente.
const MANDATO_INICIO = '2023-02-01';

const xml = new XMLParser({ ignoreAttributes: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// fetch com RETRY + backoff. As APIs oficiais (Câmara) fazem throttling (HTTP 429)
// em rajada — sem retry, muitos parlamentares voltavam "sem dados". Retenta em
// 429/5xx/erro de rede com espera exponencial (respeita Retry-After quando vier).
async function fetchRetry(url, accept, tentativas = 4) {
  for (let i = 0; i < tentativas; i++) {
    try {
      const r = await fetch(url, { headers: { Accept: accept } });
      if (r.ok) return r;
      if (r.status === 429 || r.status >= 500) {
        const ra = parseInt(r.headers.get('retry-after') || '', 10);
        const espera = Number.isFinite(ra) ? ra * 1000 : 800 * Math.pow(2, i); // 0.8s,1.6s,3.2s,6.4s
        await sleep(espera);
        continue;
      }
      return null; // 4xx (exceto 429) = não adianta retentar
    } catch {
      await sleep(800 * Math.pow(2, i)); // erro de rede → espera e retenta
    }
  }
  return null;
}
async function getJSON(url) {
  const r = await fetchRetry(url, 'application/json');
  if (!r) return null;
  try { return await r.json(); } catch { return null; }
}
async function getXML(url) {
  const r = await fetchRetry(url, 'application/xml');
  if (!r) return null;
  try { return xml.parse(await r.text()); } catch { return null; }
}
const arr = (x) => (x == null ? [] : Array.isArray(x) ? x : [x]);
const cap = (s) => (s ? String(s).trim() : null);

// ─────────────────────────── CÂMARA ───────────────────────────
async function bioCamara(id) {
  const det = await getJSON(`${CAMARA}/deputados/${id}`);
  const d = det?.dados;
  if (!d) return null;
  const st = d.ultimoStatus || {};

  // Profissão: primeira profissão declarada (endpoint próprio).
  let profissao = null;
  const prof = await getJSON(`${CAMARA}/deputados/${id}/profissoes`);
  if (prof?.dados?.length) profissao = cap(prof.dados[0].titulo);

  // Comissões (órgãos) ATUAIS — sem data de fim. Guarda sigla, nome, papel e início.
  let comissoes = [];
  const org = await getJSON(`${CAMARA}/deputados/${id}/orgaos?itens=100&ordem=ASC&ordenarPor=dataInicio`);
  if (org?.dados?.length) {
    comissoes = org.dados
      .filter((o) => !o.dataFim)
      .map((o) => ({ sigla: cap(o.siglaOrgao), nome: cap(o.nomeOrgao), papel: cap(o.titulo), inicio: o.dataInicio || null }))
      .filter((o) => o.sigla || o.nome);
  }

  // Frentes parlamentares que integra (só título).
  let frentes = [];
  const fr = await getJSON(`${CAMARA}/deputados/${id}/frentes`);
  if (fr?.dados?.length) frentes = fr.dados.map((f) => ({ titulo: cap(f.titulo) })).filter((f) => f.titulo);

  // Proposições apresentadas no mandato atual (autor). Pagina até acabar (teto 5 páginas de 100).
  let props = [];
  for (let pag = 1; pag <= 5; pag++) {
    const p = await getJSON(`${CAMARA}/proposicoes?idDeputadoAutor=${id}&dataApresentacaoInicio=${MANDATO_INICIO}&ordem=DESC&ordenarPor=id&itens=100&pagina=${pag}`);
    const lote = p?.dados || [];
    props.push(...lote);
    if (lote.length < 100) break;
    await sleep(120);
  }
  const proposicoes = props.slice(0, 20).map((p) => ({
    tipo: cap(p.siglaTipo), numero: p.numero, ano: p.ano, ementa: cap(p.ementa),
  }));

  return {
    nome_completo: cap(d.nomeCivil),
    data_nascimento: d.dataNascimento || null,
    naturalidade_uf: cap(d.ufNascimento),
    naturalidade_municipio: cap(d.municipioNascimento),
    escolaridade: cap(d.escolaridade),
    profissao,
    email_oficial: cap(st.email),
    situacao: cap(st.situacao),
    condicao_eleitoral: cap(st.condicaoEleitoral),
    website: cap(d.urlWebsite),
    redes_sociais: arr(d.redeSocial).map((u) => cap(u)).filter(Boolean),
    comissoes,
    frentes,
    proposicoes,
    n_proposicoes: props.length,
    bio_atualizada_em: new Date().toISOString(),
  };
}

// ─────────────────────────── SENADO ───────────────────────────
async function bioSenado(codigo) {
  const det = await getXML(`${SENADO}/senador/${codigo}`);
  const par = det?.DetalheParlamentar?.Parlamentar;
  if (!par) return null;
  const db = par.DadosBasicosParlamentar || {};
  const id = par.IdentificacaoParlamentar || {};

  // Comissões atuais (sem data de fim).
  let comissoes = [];
  const com = await getXML(`${SENADO}/senador/${codigo}/comissoes`);
  const membros = arr(com?.MembroComissaoParlamentar?.Parlamentar?.MembroComissoes?.Comissao
    || com?.MembroComissaoParlamentar?.Comissoes?.Comissao);
  comissoes = membros
    .filter((c) => !c?.DataFim)
    .map((c) => ({
      sigla: cap(c?.IdentificacaoComissao?.SiglaComissao),
      nome: cap(c?.IdentificacaoComissao?.NomeComissao),
      papel: cap(c?.DescricaoParticipacao),
      inicio: c?.DataInicio || null,
    }))
    .filter((c) => c.sigla || c.nome);

  // Autorias (proposições) do parlamentar. A estrutura do XML do Senado varia
  // (Autoria pode trazer IdentificacaoMateria direto ou aninhado em Materia),
  // então tentamos os dois caminhos e vários nomes de campo de ementa.
  let proposicoes = [], nProps = 0;
  const aut = await getXML(`${SENADO}/senador/${codigo}/autorias`);
  const materias = arr(
    aut?.MateriasAutoriaParlamentar?.Parlamentar?.Autorias?.Autoria
    ?? aut?.AutoriasParlamentar?.Parlamentar?.Autorias?.Autoria
    ?? aut?.AutoriasParlamentar?.Autorias?.Autoria
  );
  nProps = materias.length;
  proposicoes = materias.slice(0, 20).map((m) => {
    const mat = m?.IdentificacaoMateria || m?.Materia?.IdentificacaoMateria || {};
    return {
      tipo: cap(mat.SiglaSubtipoMateria || mat.SiglaTipoMateria),
      numero: mat.NumeroMateria || null,
      ano: mat.AnoMateria || null,
      ementa: cap(mat.EmentaMateria || m?.EmentaMateria || m?.Materia?.EmentaMateria || m?.Ementa),
    };
  });

  return {
    nome_completo: cap(id.NomeCompletoParlamentar),
    data_nascimento: db.DataNascimento || null,
    naturalidade_uf: cap(db.UfNaturalidade),
    naturalidade_municipio: cap(db.Naturalidade),
    escolaridade: null, // Senado não expõe escolaridade de forma estruturada.
    profissao: cap(db.Profissao),
    email_oficial: cap(id.EmailParlamentar),
    situacao: 'Exercício',
    condicao_eleitoral: null,
    website: cap(id.UrlPaginaParlamentar),
    redes_sociais: [],
    comissoes,
    frentes: [],
    proposicoes,
    n_proposicoes: nProps,
    bio_atualizada_em: new Date().toISOString(),
  };
}

// ─────────────────────────── ALESP (best-effort) ───────────────────────────
// A ALESP não publica um JSON estável de biografia; a SPA lê de endpoints internos.
// Tentamos um candidato conhecido; se falhar, deixamos a bio nula (a UI mostra "não disponível").
async function bioAlesp(matricula) {
  const cand = await getJSON(`https://www.al.sp.gov.br/repositorioDados/deputados/deputado_${matricula}.json`);
  if (!cand) return null;
  return {
    nome_completo: cap(cand.nome || cand.nomeCompleto),
    data_nascimento: cand.dataNascimento || null,
    naturalidade_uf: cap(cand.ufNascimento),
    naturalidade_municipio: cap(cand.municipioNascimento || cand.naturalidade),
    escolaridade: cap(cand.escolaridade),
    profissao: cap(cand.profissao),
    email_oficial: cap(cand.email),
    situacao: 'Exercício',
    condicao_eleitoral: null,
    website: null,
    redes_sociais: [],
    comissoes: [],
    frentes: [],
    proposicoes: [],
    n_proposicoes: null,
    bio_atualizada_em: new Date().toISOString(),
  };
}

function casaDe(fonte) {
  const f = (fonte || '').toLowerCase();
  if (f.includes('camara')) return 'camara';
  if (f.includes('senado')) return 'senado';
  if (f.includes('alesp')) return 'alesp';
  return 'outro';
}

async function main() {
  const filtro = (process.argv[2] || '').toLowerCase(); // camara|senado|alesp|'' (todos)
  console.log(`🚀 Coletando biografia 360°${filtro ? ` — só ${filtro}` : ''}…`);

  const { data: agentes, error } = await supabase
    .from('agentes_politicos')
    .select('id, id_externo_api, fonte_api, nome_urna')
    .not('id_externo_api', 'is', null);
  if (error) { console.error('Erro ao listar agentes:', error.message); process.exit(1); }

  // ALESP: a fonte oficial não expõe biografia estruturada (nascimento, escolaridade
  // etc.) — só nome/partido/matrícula. Pular explicitamente evita 94 "sem dados"
  // enganosos; a UI já mostra "em breve" para estaduais. Rode `... alesp` só se um
  // dia houver fonte (bioAlesp continua best-effort).
  const alespNaFila = agentes.filter((a) => casaDe(a.fonte_api) === 'alesp').length;
  if (alespNaFila && filtro !== 'alesp') {
    console.log(`  ⤷ ${alespNaFila} estaduais (ALESP) pulados: a fonte não publica biografia estruturada.`);
  }

  let ok = 0, vazio = 0, pulados = 0;
  for (const a of agentes) {
    const casa = casaDe(a.fonte_api);
    if (casa === 'outro') { pulados++; continue; }
    if (casa === 'alesp' && filtro !== 'alesp') { pulados++; continue; }
    if (filtro && casa !== filtro) { pulados++; continue; }

    const idExt = String(a.id_externo_api).split('-').pop();
    let reg = null;
    try {
      if (casa === 'camara') reg = await bioCamara(idExt);
      else if (casa === 'senado') reg = await bioSenado(idExt);
      else if (casa === 'alesp') reg = await bioAlesp(idExt);
    } catch (e) { console.warn(`  ⚠️  ${a.nome_urna}: ${e.message}`); }

    if (!reg) { vazio++; console.log(`  ∅ ${a.nome_urna} (${casa}) — sem dados`); await sleep(200); continue; }

    // Não sobrescreve nome_completo com null; remove chaves nulas de identidade sensível.
    if (!reg.nome_completo) delete reg.nome_completo;
    const { error: upErr } = await supabase.from('agentes_politicos').update(reg).eq('id', a.id);
    if (upErr) { console.warn(`  ⚠️  update ${a.nome_urna}: ${upErr.message}`); }
    else { ok++; if (ok % 25 === 0) console.log(`  … ${ok} atualizados`); }
    await sleep(200); // gentileza com as APIs oficiais (reduz throttling)
  }

  console.log(`\n✅ Biografia 360°: ${ok} atualizados, ${vazio} sem dados, ${pulados} fora do filtro.`);
}

main().catch((e) => { console.error('💥 Erro:', e.message); process.exit(1); });
// fim do coletor_biografia.js
