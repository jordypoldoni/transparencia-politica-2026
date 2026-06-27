require('dotenv').config();
const axios = require('axios');

async function farejarSenado() {
  // Lista de possíveis locais onde o Senado guarda os gastos em 2026
  const caminhos = [
    'https://www12.senado.leg.br/dados-abertos/recursos/v1/cotas/2025.xml',
    'https://www12.senado.leg.br/dados-abertos/recursos/v1/cotas/2026.xml',
    'https://legis.senado.leg.br/dadosabertos/cota/atual',
    'https://www12.senado.leg.br/transparencia/dados-abertos/cas/gastos-ceaps'
  ];

  console.log('🕵️ Iniciando varredura em repositórios alternativos do Senado...');

  for (const url of caminhos) {
    try {
      console.log(`\n📡 Testando: ${url}`);
      const res = await axios.head(url); // HEAD apenas verifica se o arquivo existe sem baixar tudo
      if (res.status === 200) {
        console.log(`✅ ACHAMOS! O repositório está vivo em: ${url}`);
        return; 
      }
    } catch (error) {
      console.log(`❌ 404 ou Erro: ${error.response?.status || error.message}`);
    }
  }

  console.log('\n🛑 Nenhuma das rotas padrão respondeu. A estrutura de Dados Abertos do Senado pode ter sido migrada ou estar em manutenção prolongada.');
}

farejarSenado();