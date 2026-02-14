const fetch = require('node-fetch');

/**
 * Função para obter todos os senadores em exercício.
 * Motivação: O Senado retorna dados em uma estrutura profunda; aqui nós simplificamos para o nosso padrão.
 */
async function obterSenadoresAtivos() {
    // O parâmetro 'atual' garante que peguemos apenas quem está com mandato vigente
    const url = 'https://legis.senado.leg.br/dadosabertos/senador/lista/atual.json';
    
    try {
        console.log("📡 [SENADO] Solicitando lista de senadores à API oficial...");
        const resposta = await fetch(url, {
            method: 'GET',
            headers: { 'Accept': 'application/json' }
        });

        if (!resposta.ok) {
            throw new Error(`Erro na API do Senado: ${resposta.statusText}`);
        }

        const json = await resposta.json();
        const lista = json.ListaParlamentarEmExercicio.Parlamentares.Parlamentar;
        
        // Mapeamento (Tradução) dos dados para o nosso padrão
        return lista.map(senador => {
            const info = senador.IdentificacaoParlamentar;
            
            return {
                id_externo_api: `SENADO-BR-${info.CodigoParlamentar}`,
                nome_completo: info.NomeCompletoParlamentar,
                nome_urna: info.NomeParlamentar,
                partido_atual: info.SiglaPartidoParlamentar,
                uf_sede: info.UfParlamentar,
                foto_url: info.UrlFotoParlamentar,
                cargo_atual: 'Senador',
                casa_legislativa: 'Senado'
            };
        });

    } catch (erro) {
        console.error("❌ [SENADO] Falha ao capturar dados:", erro.message);
        return [];
    }
}

module.exports = { obterSenadoresAtivos };