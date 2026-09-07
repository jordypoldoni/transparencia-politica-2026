// Coletor de GASTOS de gabinete dos deputados estaduais do RIO GRANDE DO SUL (ALERGS).
//
// ⚠️ O DADO DO RS E DIFERENTE DO DE SP E DA CAMARA — leia antes de mexer:
// A ALERGS publica apenas o AGREGADO MENSAL POR CATEGORIA. Nao ha nota fiscal, nem fornecedor,
// nem CNPJ. O que vem por deputado/mes e:
//     saldo transferido do mes anterior · cota do mes · disponibilidade ·
//     despesas por categoria (Passagens Aereas, Telefones, Indenizacao por uso de veiculo…) ·
//     outros creditos · saldo atual
// Por isso cada linha gravada aqui e uma CATEGORIA do mes, com fornecedor/CNPJ nulos, e a tela
// tem de dizer isso ao usuario. Nao existe "para quem foi o dinheiro" no RS.
// (A cota e o saldo NAO sao gravados ainda — precisam de tabela propria. Ficam para o passo
// seguinte; sao o que permitira mostrar "quanto da cota o deputado usou", coisa que nem a
// Camara nem a ALESP publicam junto com o gasto.)
//
// Fontes:
//   Meses do ano ...... /ajax-gastosParlamentaresListarMes?ano={ano}            (JSON)
//   Gabinetes do mes .. /ajax-gastosParlamentaresListarGabinete?ano=&mes=       (JSON; codProponente = id do deputado)
//   Gastos ............ /parlamentares/gastos/pesquisa?solicitante=&ano=&mes=   (HTML)
// Todas em https://transparencia.al.rs.gov.br
//
// Uso:
//   node coletores/coletor_gastos_alergs.js          -> ano corrente
//   node coletores/coletor_gastos_alergs.js 2025     -> um ano especifico
//   node coletores/coletor_gastos_alergs.js 2023 2024 2025 2026
//
// Idempotente e seguro (mesmas travas do coletor da Camara, pelo mesmo motivo: fonte fora do ar
// nao pode virar exclusao em massa):
//   1. SONDA: testa o primeiro mes antes de escrever. Nada encontrado => aborta sem apagar.
//   2. DELETE ESCOPADO: apaga so os deputados com fonte_api='alergs'. NUNCA por
//      casa_legislativa='estadual', que tambem e a marcacao de Sao Paulo.
//   3. TETO de linhas por execucao, para nao estourar o limite do plano free do Supabase.

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const BASE = 'https://transparencia.al.rs.gov.br';
const FONTE = 'alergs';
const DELAY_MS = 300;
const MAX_LINHAS = parseInt(process.env.MAX_LINHAS || '60000', 10);

const anosArg = process.argv.slice(2).filter((a) => /^\d{4}$/.test(a)).map(Number);
const ANOS = anosArg.length ? anosArg : [new Date().getFullYear()];

const dorme = (ms) => new Promise((r) => setTimeout(r, ms));

// O portal devolve a pagina VAZIA para clientes que nao parecem navegador (200, sem resultado).
const CABECALHOS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
  'Accept-Language': 'pt-BR,pt;q=0.9,en;q=0.8',
};

async function baixar(url, json = false, tentativas = 4) {
  for (let i = 1; i <= tentativas; i++) {
    try {
      const res = await fetch(url, {
        headers: {
          ...CABECALHOS,
          Accept: json ? 'application/json, text/plain, */*' : 'text/html,application/xhtml+xml',
          Referer: `${BASE}/parlamentares/gastos`,
        },
      });
      if (res.status === 429 || res.status >= 500) throw new Error(`HTTP ${res.status}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return json ? res.json() : res.text();
    } catch (e) {
      if (i === tentativas) throw new Error(`Falhou ${url}: ${e.message}`);
      await dorme(600 * i * i);
    }
  }
}

const paraNumero = (s) => (s == null ? null : Number(String(s).replace(/\./g, '').replace(',', '.')));

// ── PARSER ───────────────────────────────────────────────────────────────────
// A tabela de despesas vem em DUAS linhas irmas: a primeira traz os NOMES das categorias
// (a ultima e "Total"), a segunda traz os VALORES na mesma ordem. Pareamos por indice.
// Nao da pra parsear pelo texto corrido: os nomes se misturam com os valores da linha anterior.
function extrairGastos(html) {
  const i = html.indexOf('4- Despesas do M');
  if (i < 0) return { categorias: [], total: null };

  const resto = html.slice(i);
  const fim = resto.search(/>\s*[56]-\s/);          // corta em "5- Outros Creditos" / "6- Saldo Atual"
  const bloco = fim > 0 ? resto.slice(0, fim) : resto;

  const nomes = [...bloco.matchAll(/header-item--contratada\s*"?\s*>([^<]+)</g)]
    .map((m) => m[1].trim())
    .filter((n) => !/^4-/.test(n));                  // fora o titulo do proprio bloco
  const valores = [...bloco.matchAll(/d-none d-lg-block"[^>]*>\s*-?\s*R\$\s*([\d.,]+)\s*</g)]
    .map((m) => paraNumero(m[1]));

  const categorias = [];
  let total = null;
  for (let k = 0; k < Math.min(nomes.length, valores.length); k++) {
    if (nomes[k].toLowerCase() === 'total') { total = valores[k]; continue; }
    if (valores[k] == null) continue;
    categorias.push({ categoria: nomes[k], valor: valores[k] });
  }
  return { categorias, total };
}

async function gastosDoMes(idDeputado, ano, mes) {
  const html = await baixar(`${BASE}/parlamentares/gastos/pesquisa?solicitante=${idDeputado}&ano=${ano}&mes=${mes}`);
  return extrairGastos(html);
}

// ── MAIN ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`ALERGS (RS) - gastos de gabinete · anos ${ANOS.join('/')}`);

  const { data: agentes, error } = await supabase
    .from('agentes_politicos').select('id, id_externo_api').eq('fonte_api', FONTE);
  if (error) throw error;
  if (!agentes?.length) {
    throw new Error('Nenhum deputado do RS no banco. Rode antes: node coletores/coletor_votos_alergs.js --so-cadastro');
  }
  // id_externo_api e 'ALERGS-2144'; o portal usa so o numero.
  const idPorCodigo = new Map(agentes.map((a) => [String(a.id_externo_api).replace(/^ALERGS-/, ''), a.id]));
  const idsRS = agentes.map((a) => a.id);
  console.log(`${agentes.length} deputados do RS no banco.`);

  let totalLinhas = 0;

  for (const ano of ANOS) {
    const meses = (await baixar(`${BASE}/ajax-gastosParlamentaresListarMes?ano=${ano}`, true))?.lista || [];
    if (!meses.length) { console.warn(`${ano}: o portal nao lista nenhum mes — pulando.`); continue; }
    console.log(`${ano}: ${meses.length} meses publicados.`);

    const linhas = [];
    let semCadastro = 0;

    for (const { mes, nomeMes } of meses) {
      const gabinetes = (await baixar(`${BASE}/ajax-gastosParlamentaresListarGabinete?ano=${ano}&mes=${mes}`, true)) || [];
      const lista = Array.isArray(gabinetes) ? gabinetes : (gabinetes.lista || []);
      let doMes = 0;

      for (const g of lista) {
        const codigo = String(g.codProponente || '');
        const agenteId = idPorCodigo.get(codigo);
        // Suplentes que passaram pela casa aparecem aqui e nao estao no cadastro atual: ignoramos,
        // senao gravariamos gasto sem dono. Sao contados e reportados no fim.
        if (!agenteId) { semCadastro++; continue; }

        const { categorias } = await gastosDoMes(codigo, ano, mes);
        for (const c of categorias) {
          linhas.push({
            agente_id: agenteId,
            ano,
            mes,
            tipo_despesa: c.categoria,
            categoria_normalizada: c.categoria, // ja vem em linguagem de cidadao no RS
            fornecedor_nome: null,              // a ALERGS nao publica fornecedor
            fornecedor_cnpj_cpf: null,          // nem CNPJ
            valor_liquido: c.valor,
            data_emissao: `${ano}-${String(mes).padStart(2, '0')}-01`,
            casa_legislativa: 'estadual',
          });
          doMes++;
        }
        await dorme(DELAY_MS);
      }
      console.log(`  ${nomeMes}: ${doMes} lançamentos`);
    }

    // TRAVA 1: fonte vazia nao vira exclusao.
    if (linhas.length === 0) {
      console.error(
        `ABORTADO em ${ano}: nenhuma despesa reconhecida no portal da ALERGS.\n` +
        `   Isso indica fonte fora do ar ou mudança de layout, não ausência de gastos. NADA foi apagado.`
      );
      process.exit(1);
    }

    // TRAVA 2: teto de linhas.
    if (totalLinhas + linhas.length > MAX_LINHAS) {
      console.error(`ABORTADO: passaria de ${MAX_LINHAS} lançamentos (teto de segurança). Confira a fonte.`);
      process.exit(1);
    }

    // TRAVA 3: delete escopado nos deputados do RS. Nunca por casa_legislativa='estadual',
    // que apagaria tambem os deputados de Sao Paulo.
    for (let i = 0; i < idsRS.length; i += 100) {
      const { error: errDel } = await supabase.from('despesas_parlamentares')
        .delete().eq('ano', ano).in('agente_id', idsRS.slice(i, i + 100));
      if (errDel) throw errDel;
    }

    for (let i = 0; i < linhas.length; i += 500) {
      const { error: errIns } = await supabase.from('despesas_parlamentares').insert(linhas.slice(i, i + 500));
      if (errIns) throw errIns;
    }

    totalLinhas += linhas.length;
    console.log(`${ano}: ${linhas.length} lançamentos gravados` + (semCadastro ? ` (${semCadastro} gabinetes de suplentes ignorados)` : '') + '.');
  }

  console.log(`Concluido: ${totalLinhas} lançamentos de gasto (RS, ${ANOS.join('/')}).`);
}

import { refreshRadar } from './refresh_radar.js';
main()
  .then(() => refreshRadar())
  .catch((e) => { console.error('ERRO:', e.message); process.exit(1); });
