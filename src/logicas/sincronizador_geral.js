import supabase from '../supabase_cliente.js';
import axios from 'axios';
import { Higienizador } from '../utils/higienizador.js';

const SincronizadorCamara = {
    ano: 2026,

    executar: async () => {
        console.log(`🚀 Iniciando sincronização da Câmara para o ano ${SincronizadorCamara.ano}...`);

        try {
            // 1. Criar MAPA de IDs para vincular despesas aos políticos (A PONTE QUE FALTA)
            const { data: politicosExistentes } = await supabase
                .from('agentes_politicos')
                .select('id, id_externo_api');
            
            const mapaIds = new Map(politicosExistentes.map(p => [p.id_externo_api, p.id]));

            // 2. Buscar lista de deputados da API
            const { data: { dados: deputados } } = await axios.get(
                `https://dadosabertos.camara.leg.br/api/v2/deputados?idLegislatura=57&ordem=ASC&ordenarPor=nome`
            );

            for (const deputado of deputados) {
                console.log(`🔍 Processando: ${deputado.nome}...`);

                // Busca o ID interno usando a ponte CAMARA-BR- + ID da API
                const uuidBanco = mapaIds.get(`CAMARA-BR-${deputado.id}`);

                const resDespesas = await axios.get(
                    `https://dadosabertos.camara.leg.br/api/v2/deputados/${deputado.id}/despesas?ano=${SincronizadorCamara.ano}&itens=100`
                );

                const despesas = resDespesas.data.dados;

                if (despesas.length > 0) {
                    const records = despesas.map(d => ({
                        id_externo_documento: String(d.idDocumento || `${deputado.id}-${Math.random()}`),
                        agente_id: uuidBanco, // AGORA VINCULADO CORRETAMENTE!
                        ano: d.ano,
                        mes: d.mes,
                        tipo_despesa: d.tipoDespesa,
                        categoria_normalizada: Higienizador.normalizar(d.tipoDespesa),
                        fornecedor_nome: d.nomeFornecedor,
                        fornecedor_cnpj_cpf: d.cnpjCPFFornecedor,
                        valor_liquido: d.valorLiquido,
                        data_emissao: d.dataDocumento,
                        url_documento: d.urlDocumento,
                        casa_legislativa: 'Câmara'
                    }));

                    const { error } = await supabase
                        .from('despesas_parlamentares')
                        .upsert(records, { onConflict: 'id_externo_documento' });

                    if (error) console.error(`❌ Erro no Supabase: ${error.message}`);
                }
            }
            console.log("✅ Sincronização concluída com sucesso!");
        } catch (err) {
            console.error("❌ Falha geral:", err.message);
        }
    }
};

SincronizadorCamara.executar();