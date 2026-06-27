import dotenv from 'dotenv';
import { resolve } from 'path';
import { createClient } from '@supabase/supabase-js';

// Busca o .env na raiz
const envPath = resolve(process.cwd(), '.env');
dotenv.config({ path: envPath });

// Mapeamos os nomes que você realmente está usando no .env
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY; 

if (!supabaseUrl || !supabaseKey) {
    console.error("❌ ERRO: Verifique se os nomes no .env batem com o código!");
    console.log("Variáveis lidas do .env:", { 
        url: supabaseUrl ? "OK" : "Vazio", 
        key: supabaseKey ? "OK" : "Vazio" 
    });
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

export default supabase;