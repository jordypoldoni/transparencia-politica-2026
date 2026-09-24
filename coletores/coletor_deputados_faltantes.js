// Cadastra os DEPUTADOS QUE FALTAM em agentes_politicos. (24/09/2026)
//
// O PROBLEMA: o coletor de gastos lê o arquivo anual da cota e, para cada lançamento, procura
// o deputado pelo ideCadastro. Quem não está em agentes_politicos tem os gastos DESCARTADOS,
// com aviso no log (lição de 19/09: nada some em silêncio). Medido: 51 pessoas, 5.709
// lançamentos de fora do site. São quase todos suplentes que assumiram no meio do mandato.
//
// POR QUE NÃO USAR A API: /deputados devolve lista vazia desde 20/09 (issues 382 e 383 da
// Câmara). A saída é o ARQUIVO ESTÁTICO de deputados, que continua publicado e traz todos os
// parlamentares de todas as legislaturas.
//
// O QUE MEDIMOS ANTES DE ESCREVER (24/09, coletores/_sonda_arquivo_deputados.mjs):
//   deputados.csv, 1,3 MB, 7.891 linhas, separador ";", colunas:
//   uri, nome, idLegislaturaInicial, idLegislaturaFinal, nomeCivil, cpf, siglaSexo,
//   urlRedeSocial, urlWebsite, dataNascimento, dataFalecimento, ufNascimento, municipioNascimento
//   O id do deputado vem no fim da uri. NÃO há partido nem UF de mandato neste arquivo:
//   esses dois saem do próprio arquivo da cota, que traz sgPartido e sgUF em cada lançamento.
//
// O QUE NÃO FAZEMOS: inventar situação ("Exercício", "Suplente"). O arquivo não diz em que
// condição a pessoa esteve na Casa, então esses campos ficam vazios. Melhor vazio do que
// afirmado sem fonte.
//
// Uso:
//   node coletores/coletor_deputados_faltantes.js --simular   (lista quem entraria, não grava)
//   node coletores/coletor_deputados_faltantes.js             (cadastra)
//   node coletores/coletor_deputados_faltantes.js 2025        (outro ano da cota)
import 'dotenv/config';
import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';
import { lerCsv, baixarCotaAnual } from './cota_arquivo.js';
import { buscarTudo } from '../src/lib/paginar.js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const args = process.argv.slice(2);
const ANO = parseInt(args.find((a) => /^\d{4}$/.test(a)) || '2026', 10);
const SIMULAR = args.includes('--simular');
const URL_DEPUTADOS = 'https://dadosabertos.camara.leg.br/arquivos/deputados/csv/deputados.csv';
// Teto de segurança: se o cruzamento apontar mais do que isto, alguma coisa está errada com a
// fonte (layout mudado, id em branco) e é melhor parar do que despejar gente no cadastro.
const MAX_NOVOS = parseInt(process.env.MAX_NOVOS || '300', 10);

if (!SUPABASE_URL || !SUPABASE_KEY) { console.error('❌ Faltam SUPABASE_URL e/ou SUPABASE_SERVICE_ROLE_KEY.'); process.exit(1); }
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const semAcento = (s) => (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '');
const slugify = (s) => semAcento(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
// Mesmo formato de slug dos deputados que já estão no banco: nome-uf-8hex. O sufixo aqui é
// derivado do id da Câmara, então rodar duas vezes gera o MESMO slug e o upsert não duplica.
const sufixo = (id) => crypto.createHash('sha1').update(String(id)).digest('hex').slice(0, 8);
// Dois perfis com o mesmo endereco seriam duas pessoas disputando a mesma pagina. Colisao e
// improvavel (o sufixo vem do id), mas se acontecer o desempate e explicito, nao silencioso.
function slugLivre(desejado, usados) {
  let s = desejado, n = 2;
  while (usados.has(s)) s = `${desejado}-${n++}`;
  usados.add(s);
  return s;
}

function lerArquivoDeputados(texto) {
  const linhas = texto.split(/\r?\n/).filter(Boolean).map((l) => l.split(';').map((c) => c.replace(/^"|"$/g, '').trim()));
  const cab = linhas.shift();
  const idx = Object.fromEntries(cab.map((c, i) => [c.replace(/^"|"$/g, ''), i]));
  const porId = new Map();
  for (const l of linhas) {
    const id = (l[idx.uri] || '').split('/').pop();
    if (!id || !/^\d+$/.test(id)) continue;
    porId.set(id, {
      nome: l[idx.nome] || null,
      nome_civil: l[idx.nomeCivil] || null,
      sexo: l[idx.siglaSexo] || null,
      nascimento: /^\d{4}-\d{2}-\d{2}$/.test(l[idx.dataNascimento] || '') ? l[idx.dataNascimento] : null,
      falecimento: l[idx.dataFalecimento] || null,
      uf_nascimento: l[idx.ufNascimento] || null,
      municipio_nascimento: l[idx.municipioNascimento] || null,
      redes: (l[idx.urlRedeSocial] || '').split(',').map((x) => x.trim()).filter(Boolean),
      website: l[idx.urlWebsite] || null,
      legislatura_final: l[idx.idLegislaturaFinal] || null,
    });
  }
  return porId;
}

async function main() {
  console.log(`🚀 Deputados faltantes no cadastro, pela cota de ${ANO}${SIMULAR ? ' (SIMULAÇÃO, nada gravado)' : ''}`);

  // buscarTudo, sempre: o PostgREST corta em 1.000 linhas sem erro e sem aviso, e aqui um
  // corte silencioso apresentaria deputados JÁ CADASTRADOS como faltantes.
  const jaTem = await buscarTudo(
    () => supabase.from('agentes_politicos').select('id_externo_api, slug, fonte_api'),
    'faltantes.jaCadastrados',
  );
  const daCamara = jaTem.filter((a) => /camara/i.test(a.fonte_api || ''));
  const cadastrados = new Set(daCamara.map((a) => String(a.id_externo_api || '').trim()).filter(Boolean));
  // Os slugs de TODAS as casas, não só da Câmara: o endereço do perfil é único no site inteiro.
  const slugsUsados = new Set(jaTem.map((a) => a.slug).filter(Boolean));
  console.log(`👥 ${cadastrados.size} deputados da Câmara já cadastrados (${slugsUsados.size} perfis no total).`);

  // 1. Quem aparece na cota e não está no cadastro. Partido e UF só existem aqui.
  const linhas = lerCsv(await baixarCotaAnual(ANO));
  const cab = linhas.shift().map((c) => c.trim());
  const col = (nome) => {
    const i = cab.indexOf(nome);
    if (i < 0) throw new Error(`coluna ${nome} não existe no arquivo (a Câmara mudou o layout)`);
    return i;
  };
  const iCad = col('ideCadastro'), iAno = col('numAno'), iNome = col('txNomeParlamentar'),
    iPart = col('sgPartido'), iUf = col('sgUF');

  const faltantes = new Map();
  for (const l of linhas) {
    if (l.length < cab.length - 2) continue;
    const cad = (l[iCad] || '').trim();
    if (!cad || cadastrados.has(cad)) continue;
    if ((l[iAno] || '').trim() !== String(ANO)) continue;
    const atual = faltantes.get(cad) || { id: cad, nome: null, partido: null, uf: null, lancamentos: 0 };
    atual.nome = atual.nome || (l[iNome] || '').trim() || null;
    atual.partido = atual.partido || (l[iPart] || '').trim() || null;
    atual.uf = atual.uf || (l[iUf] || '').trim() || null;
    atual.lancamentos++;
    faltantes.set(cad, atual);
  }
  console.log(`\n📊 ${faltantes.size} pessoas na cota de ${ANO} sem cadastro, somando ${[...faltantes.values()].reduce((s, f) => s + f.lancamentos, 0)} lançamentos fora do site.`);

  if (faltantes.size === 0) { console.log('Nada a fazer.'); return; }
  if (faltantes.size > MAX_NOVOS) {
    console.error(`\n🛑 ABORTADO: ${faltantes.size} faltantes passa do teto de ${MAX_NOVOS}. Fonte anômala; nada foi gravado.`);
    if (process.env.GITHUB_ACTIONS) console.log('::warning title=deputados faltantes::numero de faltantes acima do teto, nada gravado');
    process.exit(1);
  }

  // 2. Completa cada um com o arquivo estático de deputados.
  console.log(`\n⬇️  ${URL_DEPUTADOS}`);
  const r = await fetch(URL_DEPUTADOS, { headers: { 'User-Agent': 'Mozilla/5.0' } });
  if (!r.ok) throw new Error(`HTTP ${r.status} ao baixar o arquivo de deputados`);
  const porId = lerArquivoDeputados(await r.text());
  console.log(`   ${porId.size} deputados no arquivo.`);

  const linhasNovas = [];
  const semFicha = [];
  for (const f of faltantes.values()) {
    const d = porId.get(f.id) || null;
    if (!d) semFicha.push(`${f.nome} (${f.id})`);
    const nome = d?.nome || f.nome;
    linhasNovas.push({
      id_externo_api: f.id,
      nome_completo: d?.nome_civil || nome,
      nome_urna: nome,
      partido_atual: f.partido,
      uf_sede: f.uf,
      cargo_atual: 'Deputado Federal',
      casa_legislativa: 'Câmara',
      // Contém "camara", que é como casaDoPerfil() decide a casa. Aqui vai a fonte de verdade,
      // e não o JSON de paginação da API que ficou gravado nos registros antigos.
      fonte_api: URL_DEPUTADOS,
      slug: slugLivre(`${slugify(nome)}-${(f.uf || '').toLowerCase()}-${sufixo(f.id)}`, slugsUsados),
      // A foto da Câmara é montada pelo id, mesmo padrão dos deputados já cadastrados.
      foto_url: `https://www.camara.leg.br/internet/deputado/bandep/${f.id}.jpg`,
      sexo: d?.sexo || null,
      data_nascimento: d?.nascimento || null,
      naturalidade_uf: d?.uf_nascimento || null,
      naturalidade_municipio: d?.municipio_nascimento || null,
      website: d?.website || null,
      redes_sociais: d?.redes?.length ? d.redes : null,
      data_atualizacao: new Date().toISOString(),
    });
  }

  if (semFicha.length) {
    console.warn(`\n⚠️  ${semFicha.length} não foram achados no arquivo de deputados; entram só com o que a cota informa:`);
    semFicha.slice(0, 15).forEach((n) => console.warn(`     · ${n}`));
  }

  if (SIMULAR) {
    console.log('\nQuem entraria:');
    for (const l of linhasNovas.sort((a, b) => a.nome_urna.localeCompare(b.nome_urna))) {
      console.log(`   ${l.nome_urna} (${l.partido_atual || 's/p'} · ${l.uf_sede || '??'}) · nasc. ${l.data_nascimento || 'n/d'} · id ${l.id_externo_api}`);
    }
    console.log(`\n${linhasNovas.length} cadastros (simulação, nada gravado).`);
    console.log('Depois de gravar, rode o coletor de gastos para os lançamentos deles entrarem:');
    console.log(`   node coletores/coletor_gastos_arquivo.js ${ANO}`);
    return;
  }

  // insert, nao upsert: a tabela so tem chave unica em id, entao nao ha coluna em que o
  // upsert possa se apoiar. E nao precisa: a lista ja e, por construcao, so quem falta.
  const { error } = await supabase.from('agentes_politicos').insert(linhasNovas);
  if (error) throw new Error(`gravação: ${error.message}`);
  console.log(`\n✅ ${linhasNovas.length} deputados cadastrados.`);
  console.log('Agora rode o coletor de gastos: os lançamentos deles deixam de ser descartados.');
  console.log(`   node coletores/coletor_gastos_arquivo.js ${ANO}`);
}

main().catch((e) => { console.error('💥 Erro:', e.message); process.exitCode = 1; });
