require('dotenv').config();
const axios = require('axios');
const { XMLParser } = require('fast-xml-parser');

async function testarGastoXml() {
  const idRomario = '5142';
  const ano = 2024;
  
  console.log(`🧪 Testando busca de gastos via XML - Senador Romário (${idRomario}) - Ano ${ano}`);

  try {
    // Endpoint da CEAPS (Cota Parlamentar)
    const url = `https://legis.senado.leg.br/dadosabertos/senador/${idRomario}/ceaps/${ano}`;
    
    const response = await axios.get(url, { 
      headers: { 'Accept': 'application/xml' } 
    });

    const parser = new XMLParser();
    const jObj = parser.parse(response.data);

    // Navegando na estrutura do XML do Senado
    const despesas = jObj.MovimentacaoCeapsParlamentar?.Legislatura?.Materias?.Materia;

    if (!despesas) {
      console.log('⚠️ Nenhuma despesa encontrada ou estrutura mudou.');
      console.log('Resposta bruta (resumo):', JSON.stringify(jObj).substring(0, 500));
      return;
    }

    // O Senado agrupa por "Matéria" (Tipo de gasto)
    const listaDespesas = Array.isArray(despesas) ? despesas : [despesas];
    
    console.log(`✅ Sucesso! Encontradas ${listaDespesas.length} categorias de gastos.`);

    listaDespesas.forEach(cat => {
      console.log(`\n📂 Categoria: ${cat.DescricaoObjetivoGasto}`);
      
      // Detalhes de cada nota fiscal dentro da categoria
      const operacoes = Array.isArray(cat.Operacoes?.Operacao) 
        ? cat.Operacoes.Operacao 
        : [cat.Operacoes?.Operacao].filter(Boolean);

      operacoes.slice(0, 2).forEach(op => {
        console.log(`   - Gasto: R$ ${op.ValorLiquido} em ${op.DataEmissao} (${op.Fornecedor})`);
      });
    });

  } catch (error) {
    if (error.response) {
      console.error(`❌ Erro da API (${error.response.status}):`, error.response.data);
    } else {
      console.error('❌ Erro de Conexão:', error.message);
    }
  }
}

testarGastoXml();