require('dotenv').config();
const axios = require('axios');
const supabase = require('../supabase_cliente');

async function atualizarAgentesCamara() {
    console.log('🔄 Iniciando atualização de dados cadastrais: Câmara');

    try {
        // 1. Puxa os deputados que estão ativos agora na API
        const url = 'https://dadosabertos.camara.leg.br/api/v2/deputados?ordem=ASC&ordenarPor=nome';
        const response = await axios.get(url);
        const deputadosApi = response.data.dados;

        console.log(`📡 API retornou ${deputadosApi.length} deputados ativos.`);

        for (const dep of deputadosApi) {
            const idExterno = `CAMARA-BR-${dep.id}`;
            
            // 2. Upsert: Se o ID existe, atualiza. Se não, cria.
            const { error } = await supabase
                .from('agentes_politicos')
                .upsert({
                    id_externo_api: idExterno,
                    nome_urna: dep.nome,
                    partido_atual: dep.siglaPartido,
                    uf_origem: dep.siglaUf,
                    url_foto: dep.urlFoto,
                    email: dep.email,
                    cargo_atual: 'Deputado Federal',
                    casa_legislativa: 'Câmara',
                    fonte_api: 'https://dadosabertos.camara.leg.br/api/v2'
                }, { onConflict: 'id_externo_api' });

            if (error) {
                console.error(`⚠️ Erro ao atualizar ${dep.nome}:`, error.message);
            }
        }

        console.log('✅ Dados cadastrais da Câmara atualizados com sucesso!');

    } catch (error) {
        console.error('💥 Falha na atualização de agentes:', error.message);
    }
}

// Executa a função
atualizarAgentesCamara();