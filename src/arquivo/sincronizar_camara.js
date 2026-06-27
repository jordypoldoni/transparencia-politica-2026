require('dotenv').config();
const supabase = require('./src/supabase_cliente');
const apiDespesas = require('./src/servicos/api_despesas');
const mapeamento = require('./src/logicas/mapeamento_despesas');

async function rodarCamara() {
  const ano = 2024;
  const mes = 5;
  console.log(`🚀 Sincronizando Câmara: ${mes}/${ano}`);

  const { data: agentes } = await supabase
    .from('agentes_politicos')
    .select('id, id_externo_api')
    .eq('casa_legislativa', 'Câmara');

  for (const agente of agentes) {
    const idNumerico = String(agente.id_externo_api).match(/\d+/g)?.join('');
    const gastos = await apiDespesas.buscarDespesasCamara(idNumerico, ano, mes);

    if (gastos.length > 0) {
      const formatados = gastos.map(g => mapeamento.paraSupabaseCamara(g, agente.id));
      await supabase.from('gastos_cotas_individuais').insert(formatados);
      console.log(`✅ ID ${idNumerico}: ${gastos.length} gastos salvos.`);
    }
  }
  console.log('🏁 Câmara concluída.');
}

rodarCamara();