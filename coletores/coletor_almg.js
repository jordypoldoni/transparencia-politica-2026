// Deputados estaduais de MINAS GERAIS (ALMG): cadastro de quem está em exercício e as notas da
// verba indenizatória, nota a nota. (30/09/2026)
//
// POR QUE MG PRIMEIRO: no levantamento de 30/09 (Decisões, vault) foi a Assembleia grande com a
// fonte mais completa. Decisão do Jordy: começar por MG e guardar só 2025 e 2026, por causa do
// espaço no banco 1 (~404 bytes por nota; MG dá ~26 mil notas por ano).
//
// A FONTE (conferida no navegador do Jordy em 30/09):
//   - deputados em exercício: /api/v2/deputados/em_exercicio (77)
//   - meses com prestação de contas: /api/v2/prestacao_contas/verbas_indenizatorias/deputados/{id}/datas
//   - notas do mês: /api/v2/prestacao_contas/verbas_indenizatorias/deputados/{id}/{ano}/{mes}
//     Cada tipo de despesa traz `valor` e `listaDetalheVerba` (emitente, CPF/CNPJ, documento,
//     data de emissão, valor da despesa e valor reembolsado).
//   ⚠️ O ARQUIVO CSV "verbas-indenizatorias" do mesmo portal vem com emitente, CNPJ e valores
//   VAZIOS em todas as 177 mil linhas (conferido em 30/09). Por isso a API, e não o arquivo.
//
// O QUE GRAVA
//   - agentes_politicos (fonte_api 'almg'), upsert pelo código da ALMG. Quem saiu da lista de
//     em exercício fica com em_exercicio = false (sem apagar: o histórico do mandato vale).
//   - despesas_parlamentares, uma linha por nota, valor = valor REEMBOLSADO (o que a Assembleia
//     pagou). Tipo de despesa com valor e sem nota detalhada vira UMA linha sem fornecedor, para
//     o total do mês bater com a fonte; o coletor conta quantas foram.
//   - Só os anos pedidos. Baixa tudo primeiro e só depois apaga e regrava os anos coletados.
//
// Uso (na máquina do Jordy):
//   node coletores/coletor_almg.js --simular          (mede, não grava)
//   node coletores/coletor_almg.js                    (2025 e 2026)
//   node coletores/coletor_almg.js --anos=2026        (só um ano)
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import { categoria } from './categoria_gastos.js';
import { refreshRadar } from './refresh_radar.js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const API = 'https://dadosabertos.almg.gov.br/api/v2';
const FOTO = (id) => `https://www.almg.gov.br/export/sites/portal/a-assembleia/deputados/fotos/${id}.jpg`;
const BYTES_POR_NOTA = 404; // medido em despesas_parlamentares em 29/09/2026

const args = process.argv.slice(2);
const opcao = (nome) => { const a = args.find((x) => x.startsWith(`--${nome}=`)); return a ? a.split('=')[1] : null; };
const SIMULAR = args.includes('--simular');
const ANOS = (opcao('anos') || '2025,2026').split(',').map((x) => parseInt(x, 10)).filter(Boolean);

if (!SUPABASE_URL || !SUPABASE_KEY) { console.error('❌ Faltam SUPABASE_URL e/ou SUPABASE_SERVICE_ROLE_KEY.'); process.exit(1); }
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const pausa = (ms = 150) => new Promise((r) => setTimeout(r, ms));
const slugify = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

async function lerApi(caminho, tentativas = 3) {
  for (let t = 1; t <= tentativas; t++) {
    try {
      const r = await fetch(`${API}${caminho}${caminho.includes('?') ? '&' : '?'}formato=json`, { headers: { Accept: 'application/json' } });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return await r.json();
    } catch (e) {
      if (t === tentativas) throw new Error(`${caminho}: ${e.message}`);
      await pausa(1500 * t);
    }
  }
  return null;
}

// "2026-05-13" de {"@class":"sql-timestamp","$":"2026-05-13"} ou de "2026-05-13".
const dataDe = (v) => { const s = String((v && v.$) || v || ''); const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/); return m ? `${m[1]}-${m[2]}-${m[3]}` : null; };

// Categoria do site. A lista compartilhada (categoria_gastos.js) foi feita com os nomes da
// Câmara; aqui só um ajuste: "Locação de imóvel e despesas a ele concernentes" é o escritório de
// apoio, e cairia em "Outros".
const categoriaMg = (tipo) => (/im[óo]vel/i.test(tipo || '') ? 'Escritório e Apoio' : categoria(tipo));

async function main() {
  console.log(`🚀 ALMG: deputados estaduais de MG, anos ${ANOS.join(' e ')}${SIMULAR ? ' (SIMULAÇÃO, nada gravado)' : ''}`);

  // 1. Quem está em exercício
  const lista = (await lerApi('/deputados/em_exercicio'))?.list || [];
  console.log(`── ${lista.length} deputados em exercício na ALMG (esperado: 77 cadeiras)`);
  if (lista.length < 60) throw new Error(`lista de em exercício pequena demais (${lista.length}); fonte com problema, nada foi gravado`);

  // 2. Notas, deputado por deputado, só nos meses que a fonte diz ter prestação de contas
  const hoje = new Date();
  const notas = []; // { idAlmg, ano, mes, tipo, fornecedor, cnpj, documento, emissao, valor }
  let semDetalhe = 0; let divergencias = 0; let requisicoes = 0;
  for (const [i, d] of lista.entries()) {
    const datas = (await lerApi(`/prestacao_contas/verbas_indenizatorias/deputados/${d.id}/datas`))?.listaFechamentoVerba || [];
    requisicoes++;
    const meses = datas.map((x) => dataDe(x.dataReferencia)).filter(Boolean)
      .map((s) => ({ ano: +s.slice(0, 4), mes: +s.slice(5, 7) }))
      .filter((x) => ANOS.includes(x.ano) && new Date(x.ano, x.mes - 1, 1) <= hoje);
    for (const { ano, mes } of meses) {
      const j = await lerApi(`/prestacao_contas/verbas_indenizatorias/deputados/${d.id}/${ano}/${mes}`);
      requisicoes++;
      for (const tipo of j?.list || []) {
        const det = tipo.listaDetalheVerba || [];
        if (!det.length) {
          if (Number(tipo.valor) > 0) {
            semDetalhe++;
            notas.push({ idAlmg: d.id, ano, mes, tipo: tipo.descTipoDespesa, fornecedor: null, cnpj: null, documento: null, emissao: null, valor: Number(tipo.valor) });
          }
          continue;
        }
        let soma = 0;
        for (const n of det) {
          const valor = Number(n.valorReembolsado ?? n.valorDespesa ?? 0);
          soma += valor;
          notas.push({
            idAlmg: d.id, ano, mes, tipo: n.descTipoDespesa || tipo.descTipoDespesa,
            fornecedor: n.nomeEmitente || null, cnpj: n.cpfCnpj ? String(n.cpfCnpj) : null,
            documento: n.descDocumento ? String(n.descDocumento) : null, emissao: dataDe(n.dataEmissao), valor,
          });
        }
        // O valor do tipo deve ser a soma das notas reembolsadas. Diferença acima de 1 real é contada.
        if (Math.abs(soma - Number(tipo.valor || 0)) > 1) divergencias++;
      }
      await pausa();
    }
    if ((i + 1) % 10 === 0) console.log(`   ${i + 1}/${lista.length} deputados lidos, ${notas.length} notas até aqui`);
  }

  const total = notas.reduce((s, n) => s + n.valor, 0);
  console.log(`\n📊 ${notas.length} notas em ${requisicoes} consultas; total R$ ${total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`);
  for (const ano of ANOS) {
    const doAno = notas.filter((n) => n.ano === ano);
    console.log(`   ${ano}: ${doAno.length} notas, R$ ${doAno.reduce((s, n) => s + n.valor, 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}, ${new Set(doAno.map((n) => n.idAlmg)).size} deputados`);
  }
  console.log(`   tipos com valor e sem nota detalhada (gravados sem fornecedor): ${semDetalhe}`);
  console.log(`   meses em que a soma das notas não bate com o total do tipo: ${divergencias}`);
  console.log(`   espaço estimado no banco: ${(notas.length * BYTES_POR_NOTA / 1024 / 1024).toFixed(1)} MB`);

  if (SIMULAR) { console.log('\n(simulação: nada gravado)'); return; }
  if (!notas.length) { console.error('❌ Nenhuma nota lida: fonte fora do ar ou mudou de formato. NADA foi apagado.'); process.exit(1); }

  // 3. Cadastro: upsert pelo código da ALMG, mantendo o mesmo id entre execuções
  const { data: existentes, error: errEx } = await supabase.from('agentes_politicos').select('id, id_externo_api, slug').eq('fonte_api', 'almg');
  if (errEx) throw errEx;
  const idPorCodigo = new Map((existentes || []).map((e) => [String(e.id_externo_api), e.id]));
  const { data: slugsUsados } = await supabase.from('agentes_politicos').select('slug').not('fonte_api', 'eq', 'almg');
  const usados = new Set((slugsUsados || []).map((s) => s.slug));
  const novos = [];
  for (const d of lista) {
    const codigo = String(d.id);
    const base = {
      nome_urna: d.nome, partido_atual: d.partido || 'S/P', cargo_atual: 'Deputado Estadual',
      uf_sede: 'MG', fonte_api: 'almg', casa_legislativa: 'estadual', id_externo_api: codigo,
      foto_url: FOTO(codigo), em_exercicio: true,
    };
    const id = idPorCodigo.get(codigo);
    if (id) {
      const { error } = await supabase.from('agentes_politicos').update(base).eq('id', id);
      if (error) throw error;
    } else {
      let slug = slugify(d.nome);
      if (usados.has(slug)) slug = `${slug}-mg`;
      usados.add(slug);
      novos.push({ ...base, nome_completo: d.nome, slug });
    }
  }
  if (novos.length) {
    const { data: ins, error } = await supabase.from('agentes_politicos').insert(novos).select('id, id_externo_api');
    if (error) throw error;
    for (const a of ins || []) idPorCodigo.set(String(a.id_externo_api), a.id);
  }
  // Quem saiu da lista de em exercício: marca, não apaga (regra dos "fantasmas", 18/09).
  const codigosAtuais = new Set(lista.map((d) => String(d.id)));
  const sairam = (existentes || []).filter((e) => !codigosAtuais.has(String(e.id_externo_api))).map((e) => e.id);
  if (sairam.length) {
    const { error } = await supabase.from('agentes_politicos').update({ em_exercicio: false }).in('id', sairam);
    if (error) throw error;
  }
  console.log(`\n👥 cadastro: ${lista.length} em exercício (${novos.length} novos), ${sairam.length} marcados como fora do exercício`);

  // 4. Notas: apaga os anos coletados DESTES deputados e regrava
  const linhas = notas.map((n) => ({
    agente_id: idPorCodigo.get(String(n.idAlmg)), ano: n.ano, mes: n.mes,
    tipo_despesa: n.tipo || null, categoria_normalizada: categoriaMg(n.tipo),
    fornecedor_nome: n.fornecedor, fornecedor_cnpj_cpf: n.cnpj, valor_liquido: n.valor,
    data_emissao: n.emissao, id_externo_documento: n.documento, url_documento: null,
    casa_legislativa: 'estadual',
  })).filter((l) => l.agente_id);
  const ids = [...new Set(linhas.map((l) => l.agente_id))];
  for (let i = 0; i < ids.length; i += 100) {
    const { error } = await supabase.from('despesas_parlamentares').delete().in('ano', ANOS).in('agente_id', ids.slice(i, i + 100));
    if (error) throw error;
  }
  for (let i = 0; i < linhas.length; i += 500) {
    const { error } = await supabase.from('despesas_parlamentares').insert(linhas.slice(i, i + 500));
    if (error) throw error;
  }
  console.log(`💾 ${linhas.length} notas gravadas (${ANOS.join(', ')})`);
  await refreshRadar();
  console.log('✅ pronto');
}

main().catch((e) => { console.error('❌', e.message || e); process.exit(1); });
