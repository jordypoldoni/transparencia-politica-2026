// Sonda do banco 2: confere que a chave do .env abre o banco certo, antes de qualquer coleta.
// Uso: node coletores/sonda_banco2.js
//
// Existe porque a pasta de coletores ja tropecou nisso: chave trocada, chave do projeto errado
// e URL sem a chave correspondente dao erro so la na hora de gravar, com o coletor no meio.
import supabase2, { banco2Configurado } from '../src/supabase_cliente_2.js';

const ok = (m) => console.log('  OK   ' + m);
const erro = (m) => console.log('  FALHA ' + m);

async function main() {
    console.log('\nSonda do banco 2\n');

    if (!banco2Configurado) {
        erro('SUPABASE_URL_2 ou SUPABASE_SERVICE_ROLE_KEY_2 faltando no .env.');
        process.exit(1);
    }
    ok('variaveis do .env encontradas');

    const url = process.env.SUPABASE_URL_2;
    const refUrl = (url.match(/https:\/\/([a-z0-9]+)\.supabase\.co/) || [])[1] || '?';
    // O "ref" do projeto vem escrito dentro do proprio token, entao da para conferir sem rede
    // se a chave e mesmo deste banco e nao a do banco 1.
    let refChave = '?';
    try {
        const corpo = process.env.SUPABASE_SERVICE_ROLE_KEY_2.split('.')[1];
        const dados = JSON.parse(Buffer.from(corpo, 'base64').toString('utf8'));
        refChave = dados.ref || '?';
        if (dados.role !== 'service_role') erro(`a chave e do papel "${dados.role}", nao service_role`);
        else ok('a chave e service_role');
    } catch (e) {
        console.log('  AVISO chave em formato novo (sb_secret_): nao da para conferir o projeto sem rede');
        refChave = refUrl;
    }
    if (refChave !== refUrl) {
        erro(`a URL aponta para "${refUrl}" e a chave para "${refChave}": sao projetos diferentes`);
        process.exit(1);
    }
    ok(`URL e chave apontam para o mesmo projeto (${refUrl})`);

    // Consulta de verdade. Tabela inexistente de proposito: se a resposta for "nao existe essa
    // tabela", a conexao e a autenticacao funcionaram, que e o que a sonda quer saber.
    const { error } = await supabase2.from('__sonda__').select('id').limit(1);
    if (!error) { ok('conexao respondeu'); }
    else if (/does not exist|Could not find the table/i.test(error.message)) { ok('conexao e chave aceitas pelo banco'); }
    else { erro(`o banco recusou: ${error.message}`); process.exit(1); }

    console.log('\nBanco 2 pronto para receber coleta.\n');
}

main().catch((e) => { erro(e.message); process.exit(1); });
