require('dotenv').config();
const axios = require('axios');
const { XMLParser } = require('fast-xml-parser');

async function mapearRecursos() {
  console.log('🔍 Solicitando mapa oficial de recursos ao Senado...');

  try {
    // Este é o índice de todos os serviços da API
    const url = 'https://legis.senado.leg.br/dadosabertos/servicos';
    const response = await axios.get(url, { headers: { 'Accept': 'application/xml' } });
    
    const parser = new XMLParser();
    const jObj = parser.parse(response.data);

    const servicos = jObj.ListaServicos?.Servicos?.Servico;

    if (!servicos) {
      console.log('❌ Não foi possível ler o mapa de serviços.');
      return;
    }

    const listaServicos = Array.isArray(servicos) ? servicos : [servicos];

    console.log('📋 Links encontrados para despesas/cotas:');
    listaServicos.forEach(s => {
      const nome = s.Nome.toLowerCase();
      if (nome.includes('despesa') || nome.includes('cota') || nome.includes('ceaps')) {
        console.log(`\n🔹 Serviço: ${s.Nome}`);
        console.log(`   Descrição: ${s.Descricao}`);
        console.log(`   URL: ${s.UrlFormatada}`);
      }
    });

  } catch (error) {
    console.error('❌ Erro ao mapear:', error.message);
  }
}

mapearRecursos();