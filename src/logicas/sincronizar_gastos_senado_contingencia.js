require('dotenv').config();
const axios = require('axios');
const supabase = require('../supabase_cliente');
const csv = require('csv-parser'); // Certifique-se de ter instalado: npm install csv-parser
const { Readable } = require('stream');

async function sincronizarSenadoCSV(ano) {
    console.log(`🏛️ Iniciando Contingência Senado: Ano ${ano}`);

    // URL de Dados Abertos do Senado para Despesas (CEAPS)
    const urlCsv = `https://www12.senado.leg.br/transparencia/dados-abertos-transparencia/consultas/venda-de-dados-abertos?formato=csv&ano=${ano}`;

    try {
        const response = await axios({
            method: 'get',
            url: urlCsv,
            responseType: 'stream'
        });

        console.log('📡 Arquivo CSV localizado. Iniciando processamento...');

        response.data
            .pipe(csv({ separator: ';' })) // O CSV do Senado costuma usar ponto e vírgula
            .on('data', async (row) => {
                // Mapeamento de colunas do CSV do Senado para nossa estrutura
                // Nota: Os nomes das colunas abaixo devem ser validados com o cabeçalho do arquivo real
                const nomeSenador = row['SENADOR'];
                const valor = parseFloat(row['VALOR_REEMBOLSADO']?.replace(',', '.'));

                if (nomeSenador && valor > 0) {
                    // 1. Localizar o Senador no nosso banco pelo Nome (ou ID se disponível no CSV)
                    const { data: politico } = await supabase
                        .from('agentes_politicos')
                        .select('id')
                        .ilike('nome_urna', `%${nomeSenador}%`)
                        .eq('casa_legislativa', 'Senado')
                        .single();

                    if (politico) {
                        // 2. Upsert do Gasto
                        await supabase.from('despesas_parlamentares').upsert({
                            agente_id: politico.id,
                            ano: parseInt(row['ANO']),
                            mes: parseInt(row['MES']),
                            tipo_despesa: row['TIPO_DESPESA'],
                            categoria_normalizada: 'Processamento em Lote (Senado)', // Depois normalizamos
                            fornecedor_nome: row['FORNECEDOR'],
                            valor_liquido: valor,
                            id_externo_documento: `SENADO-${row['DOCUMENTO'] || Math.random()}`,
                            casa_legislativa: 'Senado'
                        }, { onConflict: 'id_externo_documento' });
                    }
                }
            })
            .on('end', () => {
                console.log('✅ Processamento do CSV do Senado finalizado.');
            });

    } catch (error) {
        console.error('❌ O Portal de Transparência do Senado não respondeu ao CSV:', error.message);
    }
}

sincronizarSenadoCSV(2026);