import supabase from '../supabase_cliente.js';

const Auditador = {

    /**
     * Calcula quem são os "Outliers" em uma categoria específica
     */
    detectarDesvios: async (ano, categoria) => {
        console.log(`🔍 Auditando categoria: ${categoria}...`);

        // 1. Puxa todos os gastos consolidados por político naquela categoria
        const { data, error } = await supabase
            .from('despesas_parlamentares')
            .select(`
                valor_liquido,
                agentes_politicos (nome_urna, partido_atual)
            `)
            .eq('ano', ano)
            .eq('categoria_normalizada', categoria);

        if (error || data.length === 0) return { erro: "Dados insuficientes para auditoria" };

        // 2. Agrupa por Político
        const gastosPorPolitico = data.reduce((acc, item) => {
            const nome = item.agentes_politicos?.nome_urna || 'Político não Identificado';
            acc[nome] = (acc[nome] || 0) + item.valor_liquido;
            return acc;
        }, {});

        // 3. Usa a MEDIANA como referência (robusta: não infla com os gastões,
        //    evitando acusar injustamente — protege a credibilidade do portal).
        const valores = Object.values(gastosPorPolitico).sort((a, b) => a - b);
        const meio = Math.floor(valores.length / 2);
        const mediana = valores.length % 2 !== 0
            ? valores[meio]
            : (valores[meio - 1] + valores[meio]) / 2;

        // Alerta quem gastou acima de 2x a mediana (claramente fora do padrão)
        const alertas = Object.entries(gastosPorPolitico)
            .map(([nome, total]) => ({
                nome,
                valor_gasto: total,
                valor_media: mediana, // referência (mediana) exibida no frontend
                percentual_acima_media: mediana > 0 ? ((total / mediana) - 1) * 100 : 0
            }))
            .filter(item => mediana > 0 && item.valor_gasto >= mediana * 2)
            .sort((a, b) => b.percentual_acima_media - a.percentual_acima_media);

        return {
            media_categoria: mediana,
            alertas_detectados: alertas
        };
    }
};

export default Auditador;