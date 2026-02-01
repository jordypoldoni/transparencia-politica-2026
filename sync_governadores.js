require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

// 1. Configuração de Conexão (As variáveis devem estar no seu .env)
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY; 
const supabase = createClient(supabaseUrl, supabaseKey);

// 2. Base de Dados dos Governadores (Sincronização 2026)
const governadores = [
    { uf: 'AC', nome: 'Gladson Cameli', partido: 'PP', foto: 'https://www.ac.gov.br/wp-content/uploads/2023/01/gladson.jpg' },
    { uf: 'AL', nome: 'Paulo Dantas', partido: 'MDB', foto: 'https://alagoas.al.gov.br/governo/governador.jpg' },
    { uf: 'AP', nome: 'Clécio Luís', partido: 'SOLIDARIEDADE', foto: 'https://www.portal.ap.gov.br/foto-governador.png' },
    { uf: 'AM', nome: 'Wilson Lima', partido: 'UNIÃO', foto: 'https://www.amazonas.am.gov.br/wp-content/uploads/wilson.jpg' },
    { uf: 'BA', nome: 'Jerônimo Rodrigues', partido: 'PT', foto: 'https://www.ba.gov.br/governo/jeronimo.jpg' },
    { uf: 'CE', nome: 'Elmano de Freitas', partido: 'PT', foto: 'https://www.ceara.gov.br/elmano.jpg' },
    { uf: 'DF', nome: 'Ibaneis Rocha', partido: 'MDB', foto: 'https://www.df.gov.br/ibaneis.jpg' },
    { uf: 'ES', nome: 'Renato Casagrande', partido: 'PSB', foto: 'https://www.es.gov.br/casagrande.jpg' },
    { uf: 'GO', nome: 'Ronaldo Caiado', partido: 'UNIÃO', foto: 'https://www.goias.gov.br/caiado.jpg' },
    { uf: 'MA', nome: 'Carlos Brandão', partido: 'PSB', foto: 'https://www.ma.gov.br/brandao.jpg' },
    { uf: 'MT', nome: 'Mauro Mendes', partido: 'UNIÃO', foto: 'https://www.mt.gov.br/mauro.jpg' },
    { uf: 'MS', nome: 'Eduardo Riedel', partido: 'PSDB', foto: 'https://www.ms.gov.br/riedel.jpg' },
    { uf: 'MG', nome: 'Romeu Zema', partido: 'NOVO', foto: 'https://www.mg.gov.br/zema.jpg' },
    { uf: 'PA', nome: 'Helder Barbalho', partido: 'MDB', foto: 'https://www.pa.gov.br/helder.jpg' },
    { uf: 'PB', nome: 'João Azevêdo', partido: 'PSB', foto: 'https://www.pb.gov.br/joao.jpg' },
    { uf: 'PR', nome: 'Ratinho Júnior', partido: 'PSD', foto: 'https://www.pr.gov.br/ratinho.jpg' },
    { uf: 'PE', nome: 'Raquel Lyra', partido: 'PSDB', foto: 'https://www.pe.gov.br/raquel.jpg' },
    { uf: 'PI', nome: 'Rafael Fonteles', partido: 'PT', foto: 'https://www.pi.gov.br/rafael.jpg' },
    { uf: 'RJ', nome: 'Cláudio Castro', partido: 'PL', foto: 'https://www.rj.gov.br/castro.jpg' },
    { uf: 'RN', nome: 'Fátima Bezerra', partido: 'PT', foto: 'https://www.rn.gov.br/fatima.jpg' },
    { uf: 'RS', nome: 'Eduardo Leite', partido: 'PSDB', foto: 'https://www.rs.gov.br/eduardo.jpg' },
    { uf: 'RO', nome: 'Marcos Rocha', partido: 'UNIÃO', foto: 'https://www.ro.gov.br/rocha.jpg' },
    { uf: 'RR', nome: 'Antonio Denarium', partido: 'PP', foto: 'https://www.rr.gov.br/denarium.jpg' },
    { uf: 'SC', nome: 'Jorginho Mello', partido: 'PL', foto: 'https://www.sc.gov.br/jorginho.jpg' },
    { uf: 'SP', nome: 'Tarcísio de Freitas', partido: 'REPUBLICANOS', foto: 'https://www.sp.gov.br/tarcisio.jpg' },
    { uf: 'SE', nome: 'Fábio Mitidieri', partido: 'PSD', foto: 'https://www.se.gov.br/fabio.jpg' },
    { uf: 'TO', nome: 'Wanderlei Barbosa', partido: 'REPUBLICANOS', foto: 'https://www.to.gov.br/wanderlei.jpg' }
];

async function syncGovernadores() {
    console.log("--------------------------------------------------");
    console.log("✨ Iniciando Sincronização e Limpeza de NULLs...");
    console.log("--------------------------------------------------");

    let sucessos = 0;
    let erros = 0;

    for (const gov of governadores) {
        try {
            // Tentamos atualizar baseados no nome_urna (que é o que está causando o conflito)
            const { error } = await supabase
                .from('agentes_politicos')
                .upsert({
                    nome_urna: gov.nome, // Coluna de referência do conflito
                    id_externo_api: `GOV-BR-${gov.uf}`, // O novo ID que queremos injetar
                    nome_completo: gov.nome,
                    partido_atual: gov.partido,
                    cargo_atual: 'Governador',
                    uf_sede: gov.uf,
                    foto_url: gov.foto,
                    data_atualizacao: new Date().toISOString(),
                    fonte_api: `Sincronização Integridade 2026`
                }, { 
                    onConflict: 'nome_urna' // IMPORTANTE: Agora ele resolve o conflito pelo nome
                });

            if (error) throw error;

            console.log(`✅ [${gov.uf}] Dados e ID atualizados para: ${gov.nome}`);
            sucessos++;
        } catch (err) {
            console.error(`❌ [${gov.uf}] Falha ao sincronizar:`, err.message);
            erros++;
        }
    }

    console.log("--------------------------------------------------");
    console.log(`🏁 Relatório Final: ${sucessos} Sucessos, ${erros} Erros.`);
    console.log("--------------------------------------------------");
}

// Execução
syncGovernadores();