import ServicoAPI from '../servicos/servico_api.js';
import Auditador from '../servicos/auditador.js';

export const PlataformaData = {
    // Busca os dados para o Dashboard Principal
    fetchHomeDash: async (ano) => {
        try {
            // Chamamos o serviço que acabámos de atualizar
            const ranking = await ServicoAPI.getRankingGeral(ano);
            const porCategoria = await ServicoAPI.getGastosPorCategoria(ano);
            
            return { ranking, porCategoria };
        } catch (e) {
            console.error("Erro no fetchHomeDash:", e);
            return { ranking: [], porCategoria: [] };
        }
    },

    // Busca os alertas gerados pelo Auditador
    fetchAlertasIntegridade: async (ano) => {
        try {
            const marketing = await Auditador.detectarDesvios(ano, 'Publicidade e Marketing');
            const transporte = await Auditador.detectarDesvios(ano, 'Transporte e Mobilidade');
            
            return { marketing, transporte };
        } catch (e) {
            console.error("Erro no fetchAlertas:", e);
            return { 
                marketing: { alertas_detectados: [] }, 
                transporte: { alertas_detectados: [] } 
            };
        }
    }
};