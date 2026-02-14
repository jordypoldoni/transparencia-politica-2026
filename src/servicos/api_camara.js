const fetch = require('node-fetch');

/**
 * Função para obter todos os deputados em exercício.
 * Motivação: Centralizar a regra de negócio da API da Câmara.
 */
async function obterDeputadosAtivos() {
    const url = 'https://dadosabertos.camara.leg.br/api/v2/deputados?ordem=ASC&ordenarPor=nome';
    
    try {
        console.log("📡 [CÂMARA] Solicitando lista de deputados à API oficial...");
        const resposta = await fetch(url, {
            method: 'GET',
            headers: { 'Accept': 'application/json' }
        });

        if (!resposta.ok) {
            throw new Error(`Erro na API da Câmara: ${resposta.statusText}`);
        }

        const json = await resposta.json();
        
        // Mapeamento (Tradução) dos dados para o nosso padrão
        return json.dados.map(deputado => ({
            id_externo_api: `CAMARA-BR-${deputado.id}`,
            nome_completo: deputado.nome,
            nome_urna: deputado.nome, // A Câmara geralmente usa o nome parlamentar aqui
            partido_atual: deputado.siglaPartido,
            uf_sede: deputado.siglaUf,
            foto_url: deputado.urlFoto,
            cargo_atual: 'Deputado Federal',
            casa_legislativa: 'Câmara'
        }));

    } catch (erro) {
        console.error("❌ [CÂMARA] Falha ao capturar dados:", erro.message);
        return [];
    }
}

module.exports = { obterDeputadosAtivos };