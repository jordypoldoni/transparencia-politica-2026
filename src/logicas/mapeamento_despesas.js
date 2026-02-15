/**
 * Lógica para transformar dados brutos das APIs no formato do Supabase
 */
const mapeamentoDespesas = {

  /**
   * Mapeia dados da Câmara para a tabela gastos_cotas_individuais
   */
  paraSupabaseCamara: (gastoBruto, agenteIdUUID) => {
    return {
      agente_id: agenteIdUUID,
      ano_mes: `${gastoBruto.ano}-${String(gastoBruto.mes).padStart(2, '0')}-01`, // Formata para o tipo DATE
      categoria_gasto: gastoBruto.tipoDespesa,
      descricao_detalhada: gastoBruto.tipoExtensao || 'Despesa de Gabinete',
      valor_total: gastoBruto.valorLiquido,
      fornecedor_nome: gastoBruto.nomeFornecedor,
      link_comprovante: gastoBruto.urlDocumento,
      created_at: new Date()
    };
  },

  /**
   * Mapeia dados do Senado para a tabela gastos_cotas_individuais
   * Nota: O Senado usa campos diferentes (ex: Valor, TipoDespesa)
   */
  paraSupabaseSenado: (dados, agenteId, ano) => {
    return {
      agente_id: agenteId,
      tipo_despesa: dados.TipoDespesa || 'Outras Despesas',
      fornecedor_nome: dados.Fornecedor || 'Não identificado',
      fornecedor_cnpj_cpf: dados.CNPJ_CPF || null,
      valor_liquido: parseFloat(dados.ValorRaw || dados.Valor || 0),
      data_emissao: `${ano}-${String(dados.mes).padStart(2, '0')}-01`, // Data fictícia (dia 1) pois o Senado dá o mês
      documento_url: null, // Senado não fornece link direto da nota na maioria das vezes
      id_externo_api: null
    };
  }
};

module.exports = mapeamentoDespesas;