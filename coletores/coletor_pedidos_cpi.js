// Pedidos de CPI da Camara (requerimentos RCP) -> tabela public.pedidos_cpi_camara (banco 1).
// I1 / D-031. Por que existe: o servidor da Vercel nao conecta em dadosabertos.camara.leg.br
// ("fetch failed" em 13/10/2026); o GitHub Actions conecta. A pagina /cpis le desta tabela.
//
// A busca e a leitura dos campos ficam em src/lib/cpisAoVivo.js (fonte unica, a mesma que a
// pagina usava). Aqui so se grava.
//
// Regras de seguranca:
//  - So faz upsert por id. NUNCA apaga linha.
//  - Se a Camara nao responder a lista, sai com erro e nao grava nada.
//  - TRAMITACAO (tabela pedidos_cpi_tramitacoes, 19/10/2026): upsert por (pedido_id, ordem). EXCECAO
//    aprovada pelo Jordy a regra de nunca apagar: de cada pedido, so as linhas com `ordem` maior que a
//    ultima da leitura nova (movimentacao retirada na fonte), e SO quando a leitura desse pedido
//    terminou completa. Pedido cuja leitura falhou nao e tocado e entra na lista de pulados.
//  - Linha cujo detalhe ou assinantes falharam e PULADA (nao grava nulos por cima de dado bom);
//    tenta de novo na proxima execucao.
//  - `--dry` mostra o que gravaria, sem tocar no banco.
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import { pedidosCamara, tramitacoesPedido } from '../src/lib/cpisAoVivo.js';
import { registrarStatus } from './_status.js';

const DRY = process.argv.includes('--dry');
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!DRY && (!SUPABASE_URL || !SUPABASE_KEY)) { console.error('Faltam credenciais Supabase.'); process.exit(1); }

async function main() {
  console.log(`Coletando pedidos de CPI da Camara${DRY ? ' (dry-run)' : ''}...`);
  let itens;
  try {
    itens = await pedidosCamara();
  } catch (e) {
    console.error(`A Camara nao respondeu a lista: ${e.cause?.message || e.message}. Nada foi gravado.`);
    process.exit(1);
  }
  console.log(`${itens.length} pedidos na fonte.`);
  if (itens.length === 0) { console.error('Lista vazia: estrutura da API pode ter mudado. Nada foi gravado.'); process.exit(1); }

  const completos = [];
  const pulados = [];
  for (const p of itens) {
    if (p.data && p.situacao && p.assinaturas !== null) completos.push(p);
    else pulados.push(`${p.numero}/${p.ano}`);
  }
  if (pulados.length) console.warn(`Pulados (detalhe ou assinantes falharam): ${pulados.join(', ')}`);

  const linhas = completos.map((p) => ({
    id: p.id,
    numero: p.numero,
    ano: p.ano,
    ementa: p.ementa,
    data_apresentacao: p.data,
    situacao: p.situacao,
    despacho: p.despacho,
    data_situacao: p.dataSituacao,
    assinaturas: p.assinaturas,
    primeiro_autor: p.primeiro,
    inteiro_teor: p.inteiroTeor,
    ficha: p.ficha,
    coletado_em: new Date().toISOString(),
  }));

  if (DRY) {
    console.log(JSON.stringify(linhas.slice(0, 3), null, 2));
    console.log(`Dry-run: gravaria ${linhas.length} linhas.`);
    for (const p of completos) {
      try { console.log(`  ${p.numero}/${p.ano}: ${(await tramitacoesPedido(p.id)).length} movimentacoes`); }
      catch (e) { console.log(`  ${p.numero}/${p.ano}: FALHOU (${e.message})`); }
    }
    return;
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
  const { error } = await supabase.from('pedidos_cpi_camara').upsert(linhas, { onConflict: 'id' });
  if (error) { console.error(`Erro ao gravar: ${error.message}`); process.exit(1); }
  console.log(`${linhas.length} pedidos gravados.`);
  await registrarStatus(supabase, { fonte: 'pedidos_cpi_camara', linhas: linhas.length });

  // Tramitacao: um pedido por vez (a Camara limita; os maiores trazem ~600 movimentacoes).
  const tramPulados = [];
  let totalTram = 0;
  for (const p of completos) {
    try {
      const mov = await tramitacoesPedido(p.id);
      if (mov.length === 0) throw new Error('lista vazia');
      const agora = new Date().toISOString();
      const lote = mov.map((m) => ({ ...m, coletado_em: agora }));
      for (let i = 0; i < lote.length; i += 500) {
        const { error: e1 } = await supabase.from('pedidos_cpi_tramitacoes')
          .upsert(lote.slice(i, i + 500), { onConflict: 'pedido_id,ordem' });
        if (e1) throw new Error(e1.message);
      }
      const { error: e2 } = await supabase.from('pedidos_cpi_tramitacoes')
        .delete().eq('pedido_id', p.id).gt('ordem', mov.length);
      if (e2) throw new Error(e2.message);
      totalTram += mov.length;
    } catch (e) {
      tramPulados.push(`${p.numero}/${p.ano}`);
      console.warn(`Tramitacao de ${p.numero}/${p.ano} nao gravada (${e.cause?.message || e.message}); fica o que ja estava.`);
    }
  }
  console.log(`${totalTram} movimentacoes gravadas em ${completos.length - tramPulados.length} pedidos.`);
  // So carimba a tramitacao se nenhum pedido foi pulado: e isso que o vigia de frescor cobra.
  if (!tramPulados.length) await registrarStatus(supabase, { fonte: 'pedidos_cpi_tramitacoes', linhas: totalTram });
  if (pulados.length || tramPulados.length) process.exit(1); // sinaliza a execucao como parcial
}

main().catch((e) => { console.error(e); process.exit(1); });
