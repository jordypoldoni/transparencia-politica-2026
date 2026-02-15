require('dotenv').config();
const axios = require('axios');
const supabase = require('./src/supabase_cliente');

const mapaCategorias = {
  'COMBUSTÍVEIS E LUBRIFICANTES.': 'Transporte e Mobilidade',
  'SERVIÇOS DE TÁXI, PEDÁGIO E ESTACIONAMENTO.': 'Transporte e Mobilidade',
  'PASSAGENS AÉREAS': 'Viagens e Estadias',
  'HOSPEDAGEM ,EXCETO DO PARLAMENTAR NO DISTRITO FEDERAL.': 'Viagens e Estadias',
  'LOCAÇÃO OU FRETAMENTO DE AERONAVES.': 'Viagens e Estadias',
  'MANUTENÇÃO DE ESCRITÓRIO DE APOIO À ATIVIDADE PARLAMENTAR.': 'Manutenção de Gabinete',
  'LOCAÇÃO OU FRETAMENTO DE VEÍCULOS AUTOMOTORES.': 'Transporte e Mobilidade',
  'DIVULGAÇÃO DA ATIVIDADE PARLAMENTAR.': 'Publicidade e Marketing',
  'SERVIÇO DE SEGURANÇA PRESTADO POR EMPRESA ESPECIALIZADA.': 'Segurança e Defesa',
  'TELEFONIA.': 'Comunicação e Correios',
  'SERVIÇOS POSTAIS.': 'Comunicação e Correios',
  'ASSINATURA DE PUBLICAÇÕES.': 'Comunicação e Correios',
  'FORNECIMENTO DE ALIMENTAÇÃO DO PARLAMENTAR.': 'Viagens e Estadias'
};

async function sincronizarGastos(idCompletoBanco, ano) {
  // Extrai apenas o número do ID (ex: de CAMARA-BR-178835 vira 178835)
  const idNumericoApi = idCompletoBanco.split('-').pop();
  
  console.log(`🚀 Iniciando: ${idCompletoBanco} (API: ${idNumericoApi}) | Ano ${ano}`);

  try {
    // 1. Busca pelo ID exato que está no seu banco
    const { data: politico, error: polError } = await supabase
      .from('agentes_politicos')
      .select('id')
      .eq('id_externo_api', idCompletoBanco)
      .single();

    if (polError || !politico) {
      console.error('❌ Político não encontrado no banco local com o ID:', idCompletoBanco);
      return;
    }

    // 2. Chama a API da Câmara usando apenas o número
    const url = `https://dadosabertos.camara.leg.br/api/v2/deputados/${idNumericoApi}/despesas?ano=${ano}&ordem=ASC&ordenarPor=mes`;
    const response = await axios.get(url);
    const despesas = response.data.dados;

    console.log(`📊 Processando ${despesas.length} despesas encontradas...`);

    for (const gasto of despesas) {
      const categoriaNormalizada = mapaCategorias[gasto.tipoDespesa] || 'Outros Operacionais';

      const { error: insError } = await supabase
        .from('despesas_parlamentares')
        .upsert({
          agente_id: politico.id,
          ano: gasto.ano,
          mes: gasto.mes,
          tipo_despesa: gasto.tipoDespesa,
          categoria_normalizada: categoriaNormalizada,
          fornecedor_nome: gasto.nomeFornecedor,
          fornecedor_cnpj_cpf: gasto.cnpjCpfFornecedor,
          valor_liquido: gasto.valorLiquido,
          data_emissao: gasto.dataDocumento,
          id_externo_documento: String(gasto.numDocumento || gasto.codLote || Math.random()), 
          url_documento: gasto.urlDocumento,
          casa_legislativa: 'Câmara'
        }, { onConflict: 'id_externo_documento' });

      if (insError) {
        console.error(`⚠️ Erro na nota ${gasto.numDocumento}:`, insError.message);
      }
    }

    console.log(`✅ Sincronização de ${idCompletoBanco} finalizada!`);

  } catch (error) {
    console.error('❌ Falha:', error.message);
  }
}

// TESTE COM AFONSO MOTTA (ID que confirmamos estar no seu banco)
sincronizarGastos('CAMARA-BR-178835', 2024);