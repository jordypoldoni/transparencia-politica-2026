import ServicoAPI from './servico_api.js';
import { caminhoDaCasa } from '../lib/assembleias.js';

// Carrega os dados das listas de parlamentares. Fica FORA de pages/ de proposito: exportar
// isto de um arquivo de pagina arrastou o cliente do Supabase para o pacote do navegador e
// derrubou /deputados e /senadores em 12/09/2026. Pagina so exporta default + getServerSideProps.
export async function carregarParlamentares({ query = {}, req, casaFixa = null }) {
    const settled = await Promise.allSettled([
        ServicoAPI.listarDeputados(),
        // Uma consulta só traz o top 10 de TODAS as casas e TODOS os anos: a view radar_gastos é
        // pequena, e assim o seletor de ano troca no cliente, sem ida ao servidor.
        ServicoAPI.getRadaresPorCasaEAno(10),
    ]);
    const get = (i) => (settled[i].status === 'fulfilled' ? settled[i].value : []);
    const deputados = get(0);
    // Falha na consulta e lista legitimamente vazia sao coisas diferentes, e a tela precisa
    // saber qual das duas aconteceu: dizer "0 deputados federais" quando a consulta caiu e
    // afirmar um numero falso.
    const falhaNaLista = settled[0].status === 'rejected';

    const casa = casaFixa || 'Câmara';
    const caminho = caminhoDaCasa(casa);
    const proto = req?.headers?.['x-forwarded-proto'] || 'http';

    return {
        deputados: JSON.parse(JSON.stringify(deputados)),
        qInicial: query.q || '',
        ufInicial: query.uf || '',
        casaInicial: casa,
        radares: JSON.parse(JSON.stringify(get(1) || {})),
        falhaNaLista,
        canonical: req?.headers?.host ? `${proto}://${req.headers.host}${caminho}` : null,
    };
}
