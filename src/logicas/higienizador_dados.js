require('dotenv').config();
const supabase = require('../supabase_cliente');

const DICIONARIO_UNIVERSAL = {
    // Termos da Câmara e Senado que mapeiam para 'Transporte e Mobilidade'
    'COMBUSTÍVEIS E LUBRIFICANTES.': 'Transporte e Mobilidade',
    'LOCAÇÃO OU FRETAMENTO DE VEÍCULOS AUTOMOTORES.': 'Transporte e Mobilidade',
    'SERVIÇOS DE TÁXI, PEDÁGIO E ESTACIONAMENTO.': 'Transporte e Mobilidade',
    'Aluguel de embarcações ou aeronaves': 'Transporte e Mobilidade',
    'Locomoção, hospedagem, alimentação, combustíveis e lubrificantes': 'Transporte e Mobilidade',

    // Termos para 'Manutenção de Gabinete'
    'MANUTENÇÃO DE ESCRITÓRIO DE APOIO À ATIVIDADE PARLAMENTAR.': 'Manutenção de Gabinete',
    'Aluguel de imóveis para escritório político, compreendendo despesas concernentes a eles.': 'Manutenção de Gabinete',
    'Aquisição de material de consumo para uso no escritório político': 'Manutenção de Gabinete',

    // Termos para 'Publicidade e Marketing'
    'DIVULGAÇÃO DA ATIVIDADE PARLAMENTAR.': 'Publicidade e Marketing',
    'Divulgação da atividade parlamentar': 'Publicidade e Marketing',

    // Adicione mais mapeamentos conforme identificar novos termos no banco
};

async function higienizar() {
    console.log('🧼 Iniciando Higienização e Normalização de dados...');

    try {
        // 1. Buscar todas as despesas que ainda não foram normalizadas ou são do Senado
        const { data: despesas, error } = await supabase
            .from('despesas_parlamentares')
            .select('id, tipo_despesa')
            .or('categoria_normalizada.eq.Processamento em Lote (Senado),categoria_normalizada.is.null');

        if (error) throw error;
        if (despesas.length === 0) {
            console.log('✨ Tudo limpo! Nenhuma despesa pendente de normalização.');
            return;
        }

        console.log(`🧹 Higienizando ${despesas.length} registros...`);

        for (const item of despesas) {
            const novaCategoria = DICIONARIO_UNIVERSAL[item.tipo_despesa] || 'Outros Operacionais';

            await supabase
                .from('despesas_parlamentares')
                .update({ categoria_normalizada: novaCategoria })
                .eq('id', item.id);
        }

        console.log('✅ Higienização concluída.');

    } catch (err) {
        console.error('❌ Erro na higienização:', err.message);
    }
}

higienizar();