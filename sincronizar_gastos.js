require('dotenv').config();
const supabase = require('./src/supabase_cliente');
const apiDespesas = require('./src/servicos/api_despesas');
const mapeamento = require('./src/logicas/mapeamento_despesas');

async function sincronizarGastos() {
  console.log('🚀 Iniciando sincronização robusta...');

  const { data: agentes, error } = await supabase
    .from('agentes_politicos')
    .select('id, id_externo_api, casa_legislativa')
    .in('casa_legislativa', ['Câmara', 'Senado']);

  if (error) {
    console.error('Erro ao buscar agentes:', error);
    return;
  }

  console.log(`📊 Total de agentes encontrados no banco: ${agentes.length}`);

  const anoBusca = 2024;
  const mesBusca = 5; 

  // TESTE MANUAL COM ROMÁRIO (ID 5142)
  const idTeste = "5142";
  console.log(`\n🧪 TESTE DE PROVA - SENADO: ID ${idTeste}`);
  const gastosRomario = await apiDespesas.buscarDespesasSenado(idTeste, 2024);
  console.log(`📦 Resposta da API para Romário: ${gastosRomario.length} itens encontrados.`);
}

sincronizarGastos();