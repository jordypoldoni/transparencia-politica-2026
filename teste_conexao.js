require('dotenv').config();

async function testar() {
    console.log("Tentando conectar em:", process.env.SUPABASE_URL);
    try {
        const response = await fetch(process.env.SUPABASE_URL);
        console.log("Status da resposta:", response.status);
        console.log("✅ Conexão física com o Supabase OK!");
    } catch (err) {
        console.error("❌ Falha total de conexão:", err.message);
        console.log("\n--- DICA ---");
        console.log("Verifique se você consegue abrir a URL do Supabase no seu navegador.");
    }
}

testar();