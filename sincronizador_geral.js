require('dotenv').config();
const axios = require('axios');
const supabase = require('./src/supabase_cliente');

const mapaCategorias = {
    'COMBUSTÍVEIS E LUBRIFICANTES.': 'Transporte e Mobilidade',
    'SERVIÇOS DE TÁXI, PEDÁGIO E ESTACIONAMENTO.': 'Transporte e Mobilidade',
    'PASSAGENS AÉREAS': 'Viagens e Estadias',
    'HOSPEDAGEM ,EXCETO DO PARLAMENTAR NO DISTRITO FEDERAL.': 'Viagens e Estadias',
    'LOCAÇÃO OU FRETAMENTO DE AERONAVES.': 'Viagens e Estadias',
    'MANUTENÇÃO DE ESCRITÓRIO DE APOIO À ATIVIDADE PARLAMENTAR.': 'Manutenção de Gabinete',
    'LOCAÇÃO OU FRETAMENTO DE VEÍCULOS AUTOMOTORES.': 'Transporte e Mobilidade',
    'DIVULGAÇÃO DA ATIVIDADE PARLAMENTAR.': 'Publicidade e Marketing',
    'SERVIÇO DE SEGURANÇA PRESTADO POR EMPRESA ESPECIALIZADA.': 'Segurança e Defesa',
    'TELEFONIA.': 'Comunicação e Correios',
    'SERVIÇOS POSTAIS.': 'Comunicação e Correios',
    'ASSINATURA DE PUBLICAÇÕES.': 'Comunicação e Correios',
    'FORNECIMENTO DE ALIMENTAÇÃO DO PARLAMENTAR.': 'Viagens e Estadias'
};

async function sincronizarTudo() {
    console.log('🏁 Iniciando Sincronização Semanal - Câmara');
    const agora = new Date();
    const anoAtual = agora.getFullYear();

    try {
        // 1. Puxar todos os agentes da Câmara do Banco
        const { data: agentes, error } = await supabase
            .from('agentes_politicos')
            .select('id, id_externo_api, nome_urna')
            .eq('casa_legislativa', 'Câmara');

        if (error) throw error;

        console.log(`📡 Encontrados ${agentes.length} agentes para atualizar.`);

        for (const agente of agentes) {
            const idNumerico = agente.id_externo_api.split('-').pop();
            console.log(`⏳ Processando: ${agente.nome_urna} (${idNumerico})...`);

            try {
                // Buscamos gastos do ano atual
                const url = `https://dadosabertos.camara.leg.br/api/v2/deputados/${idNumerico}/despesas?ano=${anoAtual}&ordem=ASC&ordenarPor=mes`;
                const response = await axios.get(url);
                const despesas = response.data.dados;

                if (despesas.length > 0) {
                    const payloads = despesas.map(gasto => ({
                        agente_id: agente.id,
                        ano: gasto.ano,
                        mes: gasto.mes,
                        tipo_despesa: gasto.tipoDespesa,
                        categoria_normalizada: mapaCategorias[gasto.tipoDespesa] || 'Outros Operacionais',
                        fornecedor_nome: gasto.nomeFornecedor,
                        fornecedor_cnpj_cpf: gasto.cnpjCpfFornecedor,
                        valor_liquido: gasto.valorLiquido,
                        data_emissao: gasto.dataDocumento,
                        id_externo_documento: String(gasto.numDocumento || gasto.codLote || Math.random()),
                        url_documento: gasto.urlDocumento,
                        casa_legislativa: 'Câmara'
                    }));

                    // Upsert em massa para este agente
                    const { error: upsertError } = await supabase
                        .from('despesas_parlamentares')
                        .upsert(payloads, { onConflict: 'id_externo_documento' });

                    if (upsertError) console.error(`⚠️ Erro no upsert de ${agente.nome_urna}:`, upsertError.message);
                }
                
                // Pequena pausa para não estressar a API (Escalabilidade)
                await new Promise(resolve => setTimeout(resolve, 300));

            } catch (err) {
                console.error(`❌ Falha ao buscar dados de ${agente.nome_urna}:`, err.message);
            }
        }

        // 3. Registrar Log de Sucesso
        await supabase.from('controle_sincronizacao').insert({ 
            casa_legislativa: 'Câmara', 
            status: 'sucesso',
            detalhes: { agentes_processados: agentes.length }
        });

        console.log('✅ Sincronização Semanal Concluída!');

    } catch (error) {
        console.error('💥 Erro Crítico na Sincronização:', error.message);
    }
}

sincronizarTudo();