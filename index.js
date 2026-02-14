const { sincronizarParlamentares } = require('./src/logicas/parlamentares');

/**
 * Ponto de entrada principal da Plataforma de Integridade Democrática 2026.
 * Este script pode ser agendado via Cron ou mantido pelo PM2.
 */
async function executarSincronizacaoGeral() {
    console.log("--------------------------------------------------");
    console.log(`📅 Iniciando rotina de atualização: ${new Date().toLocaleString()}`);
    console.log("--------------------------------------------------");

    try {
        // Por enquanto, disparamos o Legislativo (Câmara e Senado)
        // No futuro, podemos adicionar aqui: await sincronizarGovernadores();
        await sincronizarParlamentares();

        console.log("✅ [FINALIZADO] Todos os processos foram concluídos.");
        process.exit(0);
    } catch (error) {
        console.error("🚨 [ERRO NO PROCESSO GERAL]:", error.message);
        process.exit(1);
    }
}

// Execução
executarSincronizacaoGeral();