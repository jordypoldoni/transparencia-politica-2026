// Removidos os requires antigos para usar o padrão do resto do projeto
export const DICIONARIO_UNIVERSAL = {
    'COMBUSTÍVEIS E LUBRIFICANTES.': 'Transporte e Mobilidade',
    'LOCAÇÃO OU FRETAMENTO DE VEÍCULOS AUTOMOTORES.': 'Transporte e Mobilidade',
    'SERVIÇOS DE TÁXI, PEDÁGIO E ESTACIONAMENTO.': 'Transporte e Mobilidade',
    'Aluguel de embarcações ou aeronaves': 'Transporte e Mobilidade',
    'Locomoção, hospedagem, alimentação, combustíveis e lubrificantes': 'Transporte e Mobilidade',
    'MANUTENÇÃO DE ESCRITÓRIO DE APOIO À ATIVIDADE PARLAMENTAR.': 'Manutenção de Gabinete',
    'Aluguel de imóveis para escritório político, compreendendo despesas concernentes a eles.': 'Manutenção de Gabinete',
    'Aquisição de material de consumo para uso no escritório político': 'Manutenção de Gabinete',
    'DIVULGAÇÃO DA ATIVIDADE PARLAMENTAR.': 'Publicidade e Marketing',
    'Divulgação da atividade parlamentar': 'Publicidade e Marketing',
};

export const Higienizador = {
    normalizar: (tipo) => {
        return DICIONARIO_UNIVERSAL[tipo] || 'Outros Operacionais';
    }
};