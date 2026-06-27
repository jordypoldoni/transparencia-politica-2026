require('dotenv').config();
const supabase = require('./src/supabase_cliente');
const apiDespesas = require('./src/servicos/api_despesas');
const mapeamento = require('./src/logicas/mapeamento_despesas');

async function sincronizarGastos() {
  console.log('🚀 Iniciando sincronização de gastos...');

  // 1. Buscar parlamentares que temos no banco
  const { data: agentes, error } = await supabase
    .from('agentes_politicos')
    .select('id, id_externo_api, casa_legislativa');

  if (error) {
    console.error('Erro ao buscar agentes:', error);
    return;
  }

  const anoAtual = new Date().getFullYear();
  const mesAtual = new Date().getMonth() + 1;

  for (const agente of agentes) {
    let gastosBrutos = [];
    let gastosFormatados = [];

    console.log(`⏳ Processando: ${agente.id_externo_api} (${agente.casa_legislativa})...`);

    // 2. Extrair dados dependendo da Casa
    if (agente.casa_legislativa === 'Câmara') {
      // O ID na nossa tabela está como CAMARA-BR-12345, precisamos apenas do número
      const idNumerico = agente.id_externo_api.split('-').pop();
      gastosBrutos = await apiDespesas.buscarDespesasCamara(idNumerico, anoAtual, mesAtual);
      
      // 3. Mapear para o formato do Supabase
      gastosFormatados = gastosBrutos.map(g => mapeamento.paraSupabaseCamara(g, agente.id));
    
    } else if (agente.casa_legislativa === 'Senado') {
      gastosBrutos = await apiDespesas.buscarDespesasSenado(agente.id_externo_api, anoAtual);
      gastosFormatados = gastosBrutos.map(g => mapeamento.paraSupabaseSenado(g, agente.id, anoAtual));
    }

    // 4. Salvar no banco se houver gastos
    if (gastosFormatados.length > 0) {
      const { error: insertError } = await supabase
        .from('gastos_cotas_individuais')
        .insert(gastosFormatados);

      if (insertError) {
        console.error(`❌ Erro ao inserir gastos do agente ${agente.id}:`, insertError.message);
      } else {
        console.log(`✅ ${gastosFormatados.length} gastos inseridos para o agente.`);
      }
    }
  }

  console.log('🏁 Sincronização de gastos concluída!');
}

sincronizarGastos();