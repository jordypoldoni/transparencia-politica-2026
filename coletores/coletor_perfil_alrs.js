// Coletor de COMISSOES, PROPOSICOES e CONTATO dos deputados estaduais do RIO GRANDE DO SUL.
//
// DE ONDE VEM O DADO (descoberto em 10/09/2026)
// O portal da Assembleia (ww4.al.rs.gov.br, um Drupal) NAO tem API publica documentada, e as
// paginas do deputado parecem vazias no HTML porque o conteudo e desenhado por JavaScript.
// Mas os dados NAO vem de uma chamada externa: o Drupal ja injeta tudo dentro da propria
// pagina, num bloco <script type="application/json" data-drupal-selector="drupal-settings-json">.
// O JS do portal so le esse bloco e monta os cards (ver modules/custom/alergs_deputados/js/).
// Ou seja: baixamos a pagina e lemos JSON estruturado, sem raspar layout. Bem mais estavel.
//
//   /deputados/<id>/proposicoes -> alergs_deputados.proposicoes.body.lista
//   /deputados/<id>/comissoes   -> alergs_deputados.comissoes
//   /deputados/<id>/contato     -> alergs_deputados.deputado
//
// O <id> e o mesmo numero de id_externo_api ('ALERGS-2144' -> 2144).
//
// O QUE NAO DA PARA PEGAR: trajetoria (profissao, cargos anteriores, filiacoes). A ficha
// principal do deputado e a unica das quatro paginas SEM bloco de dados. O portal nao publica.
//
// DECISAO DE ARMAZENAMENTO: guardamos uma projecao ENXUTA, nao o JSON bruto. O bruto tem
// 65 kB por deputado (situacoesPorPeriodo, proponente repetido, campos internos); a projecao
// tem 36 kB e nao perde nada que o site use. Nos 55 deputados: ~2 MB no pior caso.
//
// NAO coletamos /noticias de proposito: e a assessoria da propria Casa falando do proprio
// deputado. Material promocional nao entra numa ficha que promete so fato e fonte.
//
// SEGURANCA: so toca em linhas com fonte_api='alergs'. Nunca apaga nada. Se o portal mudar e
// nenhum deputado for reconhecido, aborta sem gravar em vez de zerar os campos de todo mundo.
//
// USO:
//   node coletores/coletor_perfil_alrs.js            (todos os 55)
//   node coletores/coletor_perfil_alrs.js --so=2144  (um so, para testar)
//   node coletores/coletor_perfil_alrs.js --seco     (mostra o que faria, sem gravar)

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SUPABASE_KEY) { console.error('❌ Faltam credenciais Supabase (.env).'); process.exit(1); }
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const BASE = 'https://ww4.al.rs.gov.br/deputados';
const UA = 'Mozilla/5.0 (compativel; LumeCidadao/1.0; transparencia publica)';
const PAUSA_MS = 700;            // gentileza com o portal: ~1,4 requisicoes por segundo
const SO = (process.argv.find((a) => a.startsWith('--so=')) || '').slice(5);
const SECO = process.argv.includes('--seco');
const FORCE = process.argv.includes('--force');

const dormir = (ms) => new Promise((r) => setTimeout(r, ms));
const fmt = (n) => n.toLocaleString('pt-BR');

// GOTCHA (10/09/2026): rodando os 55 de uma vez, os 6 ULTIMOS da ordem alfabetica falharam
// em sequencia com "fetch failed" - erro de rede, nao resposta HTTP. O portal corta a conexao
// depois de ~150 requisicoes seguidas. Por isso: espera crescente e nova tentativa, em vez de
// desistir do deputado.
const TENTATIVAS = 3;
const ESPERA = [3000, 8000, 20000];

// Le o bloco de configuracao que o Drupal injeta na pagina.
async function lerDrupalSettings(url, tentativa = 0) {
  let r;
  try {
    r = await fetch(url, { headers: { 'User-Agent': UA } });
  } catch (e) {
    if (tentativa < TENTATIVAS - 1) {
      await dormir(ESPERA[tentativa]);
      return lerDrupalSettings(url, tentativa + 1);
    }
    throw new Error(`${e.message} (após ${TENTATIVAS} tentativas)`);
  }
  if (r.status === 429 || r.status >= 500) {
    if (tentativa < TENTATIVAS - 1) {
      await dormir(ESPERA[tentativa]);
      return lerDrupalSettings(url, tentativa + 1);
    }
  }
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  const html = await r.text();
  const m = html.match(/<script type="application\/json" data-drupal-selector="drupal-settings-json">([\s\S]*?)<\/script>/);
  if (!m) throw new Error('bloco drupal-settings-json ausente (o portal mudou?)');
  const cfg = JSON.parse(m[1]);
  return cfg.alergs_deputados || null;
}

// "03/02/2026" -> "2026-02-03" (ISO, ordenavel). Devolve null se nao bater o formato.
function paraIso(br) {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(String(br || '').trim());
  return m ? `${m[3]}-${m[2]}-${m[1]}` : null;
}

const limpo = (t) => String(t ?? '').replace(/\s+/g, ' ').trim() || null;

async function coletarProposicoes(id) {
  const ad = await lerDrupalSettings(`${BASE}/${id}/proposicoes`);
  const lista = ad?.proposicoes?.body?.lista;
  if (!Array.isArray(lista)) return null;
  // Projecao enxuta: so o que o site usa ou vai usar. 'link' entra porque rastreabilidade
  // ate a fonte e o compromisso do projeto - cada proposicao passa a ter endereco proprio.
  return lista.map((p) => ({
    tipo: limpo(p.siglaTipoProposicao),
    numero: limpo(p.nroProposicao),
    ano: limpo(p.anoProposicao),
    ementa: limpo(p.ementa),
    situacao: limpo(p.descricao),
    local: limpo(p.siglaLocal),
    data: paraIso(p.dthProtocolo) || paraIso(p.dthSituacaoProposicao),
    link: p.proposicaoId
      ? `https://ww4.al.rs.gov.br/proposicao/${p.siglaTipoProposicao}/${p.nroProposicao}/${p.anoProposicao}/${p.proposicaoId}`
      : null,
  })).filter((p) => p.ementa || p.tipo);
}

async function coletarComissoes(id) {
  const ad = await lerDrupalSettings(`${BASE}/${id}/comissoes`);
  const lista = ad?.comissoes;
  if (!Array.isArray(lista)) return null;
  // 'papel' recebe a categoria (Permanente/Temporaria/...), que e a informacao util aqui:
  // o portal nao diz se o deputado e presidente ou relator, entao nao inventamos cargo.
  const categoria = { PERMANENTES: 'Permanente', TEMPORARIAS: 'Temporária', SUBCOMISSOES: 'Subcomissão', ENCERRADAS: 'Encerrada' };
  return lista.map((c) => ({
    nome: limpo(c.nomeComissao),
    sigla: null,
    papel: categoria[c.comissao] || limpo(c.tipoComissao),
    encerrada: c.comissao === 'ENCERRADAS',
    link: c.idComissao ? `https://ww4.al.rs.gov.br/comissoes-parlamentares/${c.idComissao}/composicao` : null,
  })).filter((c) => c.nome);
}

async function coletarContato(id) {
  const ad = await lerDrupalSettings(`${BASE}/${id}/contato`);
  const d = ad?.deputado;
  if (!d) return null;
  return {
    contato: (d.telefoneDeputado || d.emailDeputado)
      ? { telefone: limpo(d.telefoneDeputado), email: limpo(d.emailDeputado), predio: null, sala: null }
      : null,
    email: limpo(d.emailDeputado),
    partido_nome: limpo(d.nomePartido),
    foto_grande: limpo(d.fotoGrandeDeputado),
  };
}

async function main() {
  console.log('🚀 Comissões, proposições e contato dos deputados estaduais do RS');
  if (SECO) console.log('   (modo seco: nada será gravado)\n');

  let q = supabase.from('agentes_politicos')
    .select('id, nome_urna, id_externo_api, proposicoes, comissoes')
    .eq('fonte_api', 'alergs').order('nome_urna');
  const { data: deputados, error } = await q;
  if (error) { console.error(error.message); process.exit(1); }

  let fila = SO
    ? deputados.filter((d) => String(d.id_externo_api).replace(/^ALERGS-/i, '') === SO)
    : deputados;

  // Sem --force, so tenta quem ainda nao tem dado. Assim, rodar de novo depois de uma queda
  // de rede retoma so os que faltaram, em vez de refazer os 49 que ja deram certo.
  //
  // ARMADILHA (10/09/2026): a primeira versao testava `!d.proposicoes`, e uma lista VAZIA e
  // verdadeira em JavaScript ([] nao e falsy). Os 6 deputados que falharam por queda de rede
  // tinham [] gravado por um coletor anterior, entao o script os considerou prontos e nao
  // tentou nenhum. Vazio conta como ausente.
  const semDado = (v) => !v || (Array.isArray(v) && v.length === 0);
  if (!FORCE && !SO) {
    const antes = fila.length;
    fila = fila.filter((d) => semDado(d.proposicoes) || semDado(d.comissoes));
    if (antes !== fila.length) console.log(`   (${antes - fila.length} já coletado(s), pulando - use --force para refazer)`);
  }
  if (!fila.length) { console.log('Nenhum deputado do RS encontrado com esse filtro.'); return; }
  console.log(`📥 ${fila.length} deputado(s) na fila.\n`);

  let ok = 0, falhou = 0, totalProp = 0, totalCom = 0, bytes = 0;

  for (const d of fila) {
    const id = String(d.id_externo_api).replace(/^ALERGS-/i, '');
    try {
      const proposicoes = await coletarProposicoes(id);
      await dormir(PAUSA_MS);
      const comissoes = await coletarComissoes(id);
      await dormir(PAUSA_MS);
      const extra = await coletarContato(id);
      await dormir(PAUSA_MS);

      if (!proposicoes && !comissoes && !extra) throw new Error('nenhum dos três blocos veio');

      const patch = { data_atualizacao: new Date().toISOString() };
      if (proposicoes) { patch.proposicoes = proposicoes; patch.n_proposicoes = proposicoes.length; totalProp += proposicoes.length; }
      if (comissoes) { patch.comissoes = comissoes; totalCom += comissoes.length; }
      if (extra?.contato) patch.contato = extra.contato;
      if (extra?.email) patch.email_oficial = extra.email;
      bytes += Buffer.byteLength(JSON.stringify(patch));

      if (!SECO) {
        const { error: upErr } = await supabase.from('agentes_politicos').update(patch).eq('id', d.id);
        if (upErr) throw new Error(upErr.message);
      }
      console.log(`  ✅ ${d.nome_urna.padEnd(30)} ${String(proposicoes?.length ?? 0).padStart(3)} proposições · ${String(comissoes?.length ?? 0).padStart(2)} comissões`);
      ok++;
    } catch (e) {
      console.warn(`  ⚠️  ${d.nome_urna.padEnd(30)} ${e.message}`);
      falhou++;
    }
  }

  // Trava de seguranca: se o portal mudou e ninguem foi reconhecido, isso precisa gritar.
  if (ok === 0) {
    console.error('\n💥 ABORTADO: nenhum deputado retornou dado. O portal provavelmente mudou de formato — confira antes de rodar de novo.');
    process.exit(1);
  }

  console.log('\n──────────────────────────────────────────────');
  console.log(`✅ ${ok} deputado(s) atualizado(s)${falhou ? ` · ⚠️ ${falhou} com erro` : ''}`);
  console.log(`📄 ${fmt(totalProp)} proposições e ${fmt(totalCom)} comissões no total`);
  console.log(`💾 ~${(bytes / 1024 / 1024).toFixed(2)} MB gravados (o banco tinha 213 MB livres do teto de 500 MB)`);
  if (SECO) console.log('\n(modo seco: nada foi gravado de verdade)');
}

main().catch((e) => { console.error('💥 Erro:', e.message); process.exit(1); });
