const axios = require('axios');

/**
 * Serviço para extração de despesas das APIs Oficiais (Câmara e Senado)
 */
const apiDespesas = {
  
  /**
   * Busca despesas de um Deputado na API da Câmara
   * @param {string} idExterno - O ID numérico da Câmara (ex: 160600)
   * @param {number} ano - Ano da despesa
   * @param {number} mes - Mês da despesa
   */
  buscarDespesasCamara: async (idExterno, ano, mes) => {
    try {
      // Montamos a URL com os filtros diretamente para evitar que o Axios os formate de forma inesperada
      const url = `https://dadosabertos.camara.leg.br/api/v2/deputados/${idExterno}/despesas?ano=${ano}&mes=${mes}&itens=100`;
      
      const response = await axios.get(url);
      return response.data.dados;
    } catch (error) {
      if (error.response && error.response.status !== 400) {
        console.error(`Erro API Câmara ID ${idExterno}:`, error.message);
      }
      return [];
    }
  },

  /**
   * Busca despesas de um Senador na API do Senado
   * Nota: A API do Senado tem um formato diferente e exige tratamento específico.
   */
  buscarDespesasSenado: async (idExterno, ano) => {
    try {
      const idLimpo = String(idExterno).match(/\d+/g)?.join('');
      
      // Tentativa com o endpoint de detalhamento completo
      const url = `https://legis.senado.leg.br/dadosabertos/senador/${idLimpo}/despesas/${ano}`;
      
      const response = await axios.get(url, { 
        headers: { 
          'Accept': 'application/json',
          'User-Agent': 'Mozilla/5.0' // Algumas APIs do governo bloqueiam requisições sem User-Agent claro
        } 
      });

      // Se chegamos aqui sem 404, vamos verificar a estrutura
      const despesaParlamentar = response.data.DespesaParlamentar;
      
      if (!despesaParlamentar || !despesaParlamentar.ResumoDespesa) {
        return [];
      }

      const resumo = despesaParlamentar.ResumoDespesa;
      if (!resumo.AnoDespesa) return [];

      let todasAsDespesas = [];
      const anosArray = Array.isArray(resumo.AnoDespesa) ? resumo.AnoDespesa : [resumo.AnoDespesa];

      anosArray.forEach(anoObj => {
        if (!anoObj.MesDespesa) return;
        const meses = Array.isArray(anoObj.MesDespesa) ? anoObj.MesDespesa : [anoObj.MesDespesa];
        
        meses.forEach(mesObj => {
          if (mesObj.Detalhes && mesObj.Detalhes.DetalheDespesa) {
            const detalhes = Array.isArray(mesObj.Detalhes.DetalheDespesa) 
              ? mesObj.Detalhes.DetalheDespesa 
              : [mesObj.Detalhes.DetalheDespesa];
            
            detalhes.forEach(det => {
              todasAsDespesas.push({
                ...det,
                mes: mesObj.CodigoMes,
                TipoDespesa: det.TipoDespesa 
              });
            });
          }
        });
      });

      return todasAsDespesas;
    } catch (error) {
      // Se der 404, vamos apenas retornar vazio em vez de estourar erro crítico
      if (error.response && error.response.status === 404) {
        return []; 
      }
      console.error(`Erro na conexão com Senado ID ${idExterno}:`, error.message);
      return [];
    }
  }
};

module.exports = apiDespesas;