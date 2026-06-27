require('dotenv').config();
const axios = require('axios');
const { XMLParser } = require('fast-xml-parser');
const supabase = require('./src/supabase_cliente');

async function descobrirIds() {
  console.log('🔍 Iniciando mapeamento ultra-seguro (Colunas: nome_completo / nome_urna)...');

  try {
    // 1. Verificação do Banco de Dados com as colunas reais
    const { data: agentesLocais, error: dbError } = await supabase
      .from('agentes_politicos')
      .select('id, nome_completo, nome_urna, id_externo_api')
      .eq('casa_legislativa', 'Senado');

    if (dbError || !agentesLocais) {
      console.error('❌ Erro ao ler Supabase:', dbError?.message || 'Banco retornou vazio');
      return;
    }

    // 2. Busca e Conversão do XML (Fonte mais estável do Senado)
    const urlOficial = 'https://legis.senado.leg.br/dadosabertos/senador/lista/atual';
    const response = await axios.get(urlOficial, { headers: { 'Accept': 'application/xml' } });
    
    const parser = new XMLParser();
    const jObj = parser.parse(response.data);
    
    // Garantir que parlamentaresRaw seja tratado como lista
    let parlamentaresRaw = jObj.ListaParlamentarEmExercicio?.Parlamentares?.Parlamentar;
    if (!parlamentaresRaw) {
      console.error('❌ Estrutura do Senado não encontrada no XML.');
      return;
    }
    const listaOficial = Array.isArray(parlamentaresRaw) ? parlamentaresRaw : [parlamentaresRaw];

    console.log(`📊 Comparando ${agentesLocais.length} senadores locais...\n`);

    for (const local of agentesLocais) {
      // Prioriza o nome de urna para bater com o "NomeParlamentar" da API
      const nomeParaComparar = (local.nome_urna || local.nome_completo || "").toLowerCase();
      
      const oficial = listaOficial.find(p => {
        const nomeOficial = p.IdentificacaoParlamentar?.NomeParlamentar || "";
        return nomeParaComparar.includes(nomeOficial.toLowerCase()) || 
               nomeOficial.toLowerCase().includes(nomeParaComparar);
      });

      if (oficial) {
        const idOficial = String(oficial.IdentificacaoParlamentar.CodigoParlamentar);
        const idLocalLimpo = String(local.id_externo_api).match(/\d+/g)?.join('');
        
        if (idOficial !== idLocalLimpo) {
          console.log(`⚠️ DIVERGÊNCIA: ${local.nome_urna || local.nome_completo}`);
          console.log(`   - Banco: ${idLocalLimpo} | Oficial: ${idOficial}`);
        } else {
          console.log(`✅ ID CORRETO: ${local.nome_urna || local.nome_completo} (${idOficial})`);
        }
      } else {
        console.log(`❌ NÃO LOCALIZADO NA LISTA ATUAL: ${local.nome_urna || local.nome_completo}`);
      }
    }
    
    console.log('\n🏁 Verificação finalizada.');
  } catch (error) {
    console.error('❌ Erro Crítico:', error.message);
  }
}

descobrirIds();