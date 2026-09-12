import ServicoAPI from './servico_api.js';

// Carrega os dados das duas listas. Fica aqui, exportado, porque /senadores usa a mesma
// tela: a unica diferenca e a casa que abre. Ver pages/senadores.js.
export async function carregarParlamentares(query, casaFixa, req) {
    const settled = await Promise.allSettled([
        ServicoAPI.listarDeputados(),
        // Uma consulta só traz o top 10 de TODAS as casas e TODOS os anos: a view radar_gastos é
        // pequena, e assim o seletor de ano troca no cliente, sem ida ao servidor.
        ServicoAPI.getRadaresPorCasaEAno(10),
    ]);
    const get = (i) => (settled[i].status === 'fulfilled' ? settled[i].value : []);
    const c = String(query.casa || '').toLowerCase();
    // Links antigos (?casa=sp, ?casa=alesp, ?casa=estaduais) continuam caindo em São Paulo;
    // ?casa=rs / ?casa=alergs abrem a aba do Rio Grande do Sul.
    const casaInicial = casaFixa
        || ((c.includes('alergs') || c === 'rs') ? 'Assembleia (RS)'
        : (c.includes('alesp') || c === 'sp' || c.includes('estad') || c.includes('assembleia')) ? 'Assembleia (SP)'
        : 'Câmara');
    const proto = req?.headers?.['x-forwarded-proto'] || 'http';
    const caminho = casaFixa === 'Senado' ? '/senadores' : '/deputados';
    return {
        deputados: JSON.parse(JSON.stringify(get(0))),
        qInicial: query.q || '',
        ufInicial: query.uf || '',
        casaInicial,
        radares: JSON.parse(JSON.stringify(get(1) || {})),
        canonical: req?.headers?.host ? `${proto}://${req.headers.host}${caminho}` : null,
    };
}
