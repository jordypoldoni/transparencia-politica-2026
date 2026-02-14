const supabase = require('../supabase_cliente');
const { obterDeputadosAtivos } = require('../servicos/api_camara');
const { obterSenadoresAtivos } = require('../servicos/api_senado');
const fetch = require('node-fetch');

async function verificarIntegridadeFoto(url) {
    if (!url) return false;
    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 2500); // 2.5s limite
        
        const response = await fetch(url, { 
            method: 'GET',
            signal: controller.signal,
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) PID/1.0' }
        });
        clearTimeout(timeout);
        return response.ok;
    } catch {
        return false;
    }
}

async function sincronizarParlamentares() {
    console.log("🚀 [INÍCIO] Capturando dados das APIs...");
    
    try {
        const [deputados, senadores] = await Promise.all([
            obterDeputadosAtivos(),
            obterSenadoresAtivos()
        ]);

        const todosParlamentares = [...deputados, ...senadores];
        console.log(`📊 [INFO] Validando integridade de ${todosParlamentares.length} fotos em paralelo...`);

        // Processamos as fotos em "chunks" (pedaços) de 20 para não travar a CPU
        const parlamentaresProcessados = [];
        const tamanhoLote = 20;

        for (let i = 0; i < todosParlamentares.length; i += tamanhoLote) {
            const loteAtual = todosParlamentares.slice(i, i + tamanhoLote);
            
            const promessasLote = loteAtual.map(async (p) => {
                const fotoOk = await verificarIntegridadeFoto(p.foto_url);
                return {
                    ...p,
                    foto_status: fotoOk ? 'ok' : 'quebrado',
                    data_atualizacao: new Date().toISOString(),
                    fonte_api: 'Sincronização Lote 2026'
                };
            });

            const resultadosLote = await Promise.all(promessasLote);
            parlamentaresProcessados.push(...resultadosLote);
            console.log(`⏳ Processados: ${parlamentaresProcessados.length}/${todosParlamentares.length}`);
        }

        console.log("📤 [BANCO] Enviando lote completo para o Supabase...");

        // Ajustado para o nome correto da coluna no seu banco: id_externo_api
        const { error } = await supabase
            .from('agentes_politicos')
            .upsert(parlamentaresProcessados, { 
                onConflict: 'id_externo_api' 
            });

        if (error) {
            console.error("❌ Erro detalhado do Supabase:", error);
            throw error;
        }

        console.log(`✅ [SUCESSO] Sincronização finalizada com ${parlamentaresProcessados.length} registros.`);

    } catch (err) {
        console.error("🚨 [ERRO CRÍTICO]:", err.message);
    }
}

module.exports = { sincronizarParlamentares };