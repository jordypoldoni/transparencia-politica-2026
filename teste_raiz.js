const fetch = require('node-fetch');

async function diagnostico() {
    console.log("🔍 --- INICIANDO DIAGNÓSTICO DE CAUSA RAIZ ---");

    // 1. Teste de DNS/Conectividade Básica
    console.log("\n1. Testando Google (Conectividade Geral)...");
    try {
        const t1 = Date.now();
        await fetch('https://google.com', { timeout: 3000 });
        console.log(`✅ Internet OK (${Date.now() - t1}ms)`);
    } catch (e) { console.log("❌ Falha na internet geral."); }

    // 2. Teste de Acesso ao Domínio do Governo
    console.log("\n2. Testando Domínio da Câmara (Fotos)...");
    try {
        const t2 = Date.now();
        const res = await fetch('https://www.camara.leg.br/tema/assets/images/logo-header.png', { timeout: 5000 });
        console.log(`✅ Acesso Câmara OK (${Date.now() - t2}ms) - Status: ${res.status}`);
    } catch (e) { 
        console.log(`❌ BLOQUEIO OU LENTIDÃO NO GOVERNO: ${e.message}`); 
    }

    // 3. Teste de Latência do Supabase
    console.log("\n3. Testando Latência com seu Banco (Supabase)...");
    try {
        const supabase = require('./src/supabase_cliente');
        const t3 = Date.now();
        const { data, error } = await supabase.from('agentes_politicos').select('count');
        if (error) throw error;
        console.log(`✅ Supabase OK (${Date.now() - t3}ms)`);
    } catch (e) { console.log(`❌ Falha no Banco: ${e.message}`); }
}

diagnostico();