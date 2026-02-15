require('dotenv').config();
const supabase = require('./src/supabase_cliente');
const apiDespesas = require('./src/servicos/api_despesas');
const mapeamento = require('./src/logicas/mapeamento_despesas');

async function testarSenado() {
  console.log('🧪 Iniciando TESTE ISOLADO: Senado');

  const { data: agentes, error } = await supabase
    .from('agentes_politicos')
    .select('id, id_externo_api')
    .eq('casa_legislativa', 'Senado');

  if (error) {
    console.error('Erro ao buscar senadores:', error);
    return;
  }

  console.log(`📊 Senadores no banco: ${agentes.length}`);

  // Testando com 2024 pois 2025/2026 pode estar vazio ainda
  const anoBusca = 2023; 

  for (const agente of agentes) {
    const idNumerico = String(agente.id_externo_api).match(/\d+/g)?.join('');
    console.log(`\n🔍 Verificando Senador ID: ${idNumerico}`);

    const gastosBrutos = await apiDespesas.buscarDespesasSenado(idNumerico, anoBusca);

    if (gastosBrutos.length > 0) {
      console.log(`✅ ${gastosBrutos.length} itens encontrados para ID ${idNumerico}!`);
      // Aqui podemos implementar a inserção depois que a API responder
    } else {
      console.log(`❌ Nada encontrado para ID ${idNumerico} em ${anoBusca}`);
    }
  }
}

testarSenado();