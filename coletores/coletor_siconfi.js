/**
 * Coletor do panorama fiscal (SICONFI/Tesouro Nacional).
 * - Popula `entes_fiscais` com TODOS os entes (União, estados, DF, municípios) — leve, p/ busca.
 * - Popula `fiscal_resumo` + `fiscal_funcao` para União + 27 estados + DF (esfera != 'M').
 *   Municípios ficam sob demanda (garantirResumo, chamado quando o cidadão busca o município).
 *
 * Rodar LOCAL:  node coletores/coletor_siconfi.js
 * (o .env precisa de SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY)
 */
import supabase from '../src/supabase_cliente.js';
import { listarEntes, coletarEnteRecente, salvarResumo } from '../src/lib/siconfi.js';

const delay = (ms) => new Promise((r) => setTimeout(r, ms));

function chunk(arr, n) {
  const out = [];
  for (let i = 0; i < arr.length; i += n) out.push(arr.slice(i, i + n));
  return out;
}

async function popularEntes() {
  console.log('📥 Baixando lista de entes do SICONFI…');
  const brutos = await listarEntes();
  if (!brutos.length) {
    console.error('❌ Nenhum ente retornado — abortando.');
    return [];
  }
  // Dedup por cod_ibge (a API pode repetir por exercício).
  const mapa = new Map();
  for (const r of brutos) {
    const cod = Number(r.cod_ibge);
    if (!cod || mapa.has(cod)) continue;
    mapa.set(cod, {
      cod_ibge: cod,
      ente: r.ente,
      esfera: r.esfera,
      uf: r.uf,
      regiao: r.regiao,
      capital: String(r.capital || '').trim() === '1',
      populacao: r.populacao ? Number(r.populacao) : null,
      cnpj: r.cnpj || null,
      atualizado_em: new Date().toISOString(),
    });
  }
  const linhas = [...mapa.values()];
  console.log(`   ${linhas.length} entes únicos. Gravando em lotes…`);
  for (const lote of chunk(linhas, 500)) {
    const { error } = await supabase.from('entes_fiscais').upsert(lote, { onConflict: 'cod_ibge' });
    if (error) console.warn('   ⚠️ lote falhou:', error.message);
  }
  const porEsfera = linhas.reduce((a, e) => ((a[e.esfera] = (a[e.esfera] || 0) + 1), a), {});
  console.log('   ✅ entes_fiscais populada:', porEsfera);
  return linhas;
}

async function popularFiscalSubnacional(entes) {
  // União + estados + DF (tudo que não é município).
  const alvo = entes.filter((e) => e.esfera !== 'M');
  console.log(`\n💰 Coletando execução orçamentária de ${alvo.length} entes (União/estados/DF)…`);
  let ok = 0, vazio = 0;
  for (const ente of alvo) {
    try {
      const dados = await coletarEnteRecente({ idEnte: ente.cod_ibge, esfera: ente.esfera });
      if (!dados) {
        vazio++;
        console.log(`   ∅ ${ente.ente} (${ente.uf || ente.esfera}) — sem dados publicados`);
      } else {
        await salvarResumo(supabase, ente, dados);
        ok++;
        const r = dados.receita_total, d = dados.despesa_total, nf = Object.keys(dados.funcoes).length;
        console.log(`   ✓ ${ente.ente} ${dados.ano}/P${dados.periodo} — receita ${fmt(r)} · despesa ${fmt(d)} · ${nf} funções`);
      }
    } catch (e) {
      console.warn(`   ⚠️ ${ente.ente}:`, e.message);
    }
    await delay(200); // gentileza com a API do Tesouro
  }
  console.log(`\n✅ Fiscal subnacional: ${ok} com dados, ${vazio} sem dados.`);
}

function fmt(v) {
  if (v == null) return '—';
  return 'R$ ' + Number(v).toLocaleString('pt-BR', { maximumFractionDigits: 0 });
}

async function main() {
  const filtro = (process.argv[2] || '').toLowerCase(); // 'entes' | 'fiscal' | vazio (tudo)
  const entes = await popularEntes();
  if (!entes.length) process.exit(1);
  if (filtro !== 'entes') await popularFiscalSubnacional(entes);
  console.log('\n🏁 Concluído.');
  process.exit(0);
}

main().catch((e) => { console.error('Erro fatal:', e); process.exit(1); });
