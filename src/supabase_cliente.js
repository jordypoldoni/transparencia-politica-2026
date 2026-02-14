require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

// Centralizamos a conexão para que todos os outros scripts usem este mesmo cliente
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("❌ ERRO: Variáveis de ambiente SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY não encontradas.");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

module.exports = supabase;