// Sonda: a ponte tse-ponte responde, e a chave do .env e a mesma que o Supabase injeta nela?
// NUNCA imprime a chave, so o tamanho e os 4 primeiros caracteres do formato.
// Uso: node coletores/_sonda_ponte_tse.mjs
import 'dotenv/config';

const PROJ = 'fedxytdorrecllugnicu';
const PONTE = `https://${PROJ}.supabase.co/functions/v1/tse-ponte`;
const CAMINHO = '/divulga/rest/v1/candidatura/listar/2026/BR/2045202026/1/candidatos';
const chave = process.env.PONTE_TOKEN || '';
const legada = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

console.log(`PONTE_TOKEN no .env: ${chave ? `${chave.length} caracteres, comeca com "${chave.slice(0, 4)}"` : 'AUSENTE'}`);
console.log(`chave do banco .....: ${legada ? `${legada.length} caracteres, comeca com "${legada.slice(0, 4)}"` : 'AUSENTE'}\n`);

async function tentar(rotulo, autorizacao) {
  const url = `${PONTE}?caminho=${encodeURIComponent(CAMINHO)}`;
  try {
    const r = await fetch(url, { headers: autorizacao ? { Authorization: `Bearer ${autorizacao}` } : {} });
    const corpo = await r.text();
    const erroPonte = r.headers.get('x-ponte-erro');
    const origem = r.headers.get('x-ponte-origem');
    console.log(
      `${rotulo.padEnd(26)} http=${r.status} bytes=${corpo.length}` +
      `${erroPonte ? ` | ERRO DA PONTE: ${erroPonte}` : ''}` +
      `${origem ? ` | origem=${origem}` : ''}` +
      `${!erroPonte && corpo.length < 300 ? ` | corpo: ${corpo.slice(0, 200)}` : ''}`
    );
  } catch (e) {
    console.log(`${rotulo.padEnd(26)} FALHOU: ${e.message}${e.cause ? ` | causa: ${e.cause}` : ''}`);
  }
}

await tentar('sem Authorization', null);
await tentar('com chave errada', 'chave-que-nao-existe');
await tentar('com o PONTE_TOKEN', chave);
await tentar('com a chave do banco', legada);

// Controle: o mesmo caminho direto no TSE, da maquina do Jordy, que sabemos que passa.
try {
  const r = await fetch('https://divulgacandcontas.tse.jus.br' + CAMINHO, { headers: { 'User-Agent': 'Mozilla/5.0', Accept: 'application/json' } });
  const c = await r.text();
  console.log(`\ncontrole, direto no TSE  http=${r.status} bytes=${c.length}`);
} catch (e) { console.log(`\ncontrole, direto no TSE  FALHOU: ${e.message}`); }
