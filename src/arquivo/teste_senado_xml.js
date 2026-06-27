require('dotenv').config();
const axios = require('axios');
const { XMLParser } = require('fast-xml-parser');

async function testarGastoXml() {
  const idRomario = '5142';
  const ano = 2024;
  
  console.log(`🧪 Testando busca de gastos via XML - Senador Romário (${idRomario}) - Ano ${ano}`);

  try {
    const url = `https://legis.senado.leg.br/dadosabertos/senador/${idRomario}/ceaps/${ano}`;
    
    const response = await axios.get(url, { 
      headers: { 'Accept': 'application/xml' } 
    });

    // Configuração para garantir que campos repetidos virem sempre arrays
    const parser = new XMLParser();
    const jObj = parser.parse(response.data);

    // Caminho seguro para os dados
    const materias = jObj?.MovimentacaoCeapsParlamentar?.Legislatura?.Materias?.Materia;

    if (!materias) {
      console.log('⚠️ Nenhuma despesa encontrada ou estrutura vazia para este ano.');
      return;
    }

    // Garante que materias seja uma lista para podermos iterar
    const listaMaterias = Array.isArray(materias) ? materias : [materias];
    
    console.log(`✅ Sucesso! Encontradas ${listaMaterias.length} categorias de gastos.`);

    listaMaterias.forEach(cat => {
      const descricao = cat.DescricaoObjetivoGasto || 'Sem categoria';
      console.log(`\n📂 Categoria: ${descricao}`);
      
      // Acessa as operações (as notas fiscais em si)
      const opsRaw = cat.Operacoes?.Operacao;
      if (opsRaw) {
        const listaOps = Array.isArray(opsRaw) ? opsRaw : [opsRaw];
        
        listaOps.slice(0, 2).forEach(op => {
          const valor = op.ValorLiquido || '0,00';
          const data = op.DataEmissao || 'Data ignorada';
          const fornecedor = op.Fornecedor || 'Fornecedor não informado';
          console.log(`   - Gasto: R$ ${valor} em ${data} (${fornecedor})`);
        });
      }
    });

  } catch (error) {
    console.error('❌ Erro na execução:', error.message);
  }
}

testarGastoXml();