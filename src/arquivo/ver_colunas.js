require('dotenv').config();
const supabase = require('./src/supabase_cliente');

async function verColunas() {
  const { data, error } = await supabase
    .from('agentes_politicos')
    .select('*')
    .limit(1);

  if (data && data.length > 0) {
    console.log('✅ Colunas encontradas na tabela agentes_politicos:');
    console.log(Object.keys(data[0]));
  } else {
    console.log('❌ Erro ou tabela vazia:', error?.message);
  }
}

verColunas();