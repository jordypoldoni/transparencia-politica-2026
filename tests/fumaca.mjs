// TESTE DE FUMAÇA (17/10/2026): visita o site de verdade (servidor local ou o site no ar) e confere o
// básico: páginas abrem, rotas de API recusam entrada inválida sem quebrar, cabeçalhos de segurança
// presentes, domínio antigo redireciona. NÃO depende de banco: serve igual com banco de mentira (CI) e com o real.
//
// Uso:  node tests/fumaca.mjs http://localhost:3100
//       node tests/fumaca.mjs https://www.lumecidadao.com.br --producao
// Sai com código 1 se algo falhar. Cada linha diz o que foi conferido.
import http from 'node:http';
import https from 'node:https';

const base = (process.argv[2] || 'http://localhost:3100').replace(/\/+$/, '');
const producao = process.argv.includes('--producao');
const falhas = [];
const ok = (msg) => console.log(`  ok   ${msg}`);
const falha = (msg) => {
  falhas.push(msg);
  console.log(`  FALHA ${msg}`);
  // No GitHub Actions o log exige login; a anotação aparece na página pública do run.
  if (process.env.GITHUB_ACTIONS) console.log(`::error::fumaça: ${msg}`);
};

// Pedido que permite escolher o método e o cabeçalho Host (o fetch não deixa trocar o Host).
function pedir(caminho, { metodo = 'GET', host } = {}) {
  return new Promise((resolve, reject) => {
    const u = new URL(base + caminho);
    const lib = u.protocol === 'https:' ? https : http;
    const req = lib.request(u, { method: metodo, headers: host ? { Host: host } : {}, timeout: 60000 }, (res) => {
      const partes = [];
      res.on('data', (d) => partes.push(d));
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, corpo: Buffer.concat(partes).toString('utf8') }));
    });
    req.on('timeout', () => req.destroy(new Error('tempo esgotado')));
    req.on('error', reject);
    req.end();
  });
}

async function confere(nome, fn) {
  try { await fn(); } catch (e) { falha(`${nome}: ${e.message}`); }
}

console.log(`Fumaça em ${base}${producao ? ' (produção)' : ''}`);

// 1. Páginas que não dependem de dado do banco para abrir.
for (const p of ['/', '/entenda', '/sobre', '/entrar', '/privacidade', '/entenda/atualizacao']) {
  await confere(p, async () => {
    const r = await pedir(p);
    if (r.status !== 200) return falha(`${p} respondeu ${r.status}, esperado 200`);
    if (!r.corpo.includes('__NEXT_DATA__')) return falha(`${p} abriu mas sem o script de hidratação do Next`);
    ok(`${p} abre (200, ${(r.corpo.length / 1024).toFixed(0)} kB)`);
  });
}

// 2. Página inexistente tem de dar 404 (e não 200 com "erro" dentro, nem 500).
await confere('404', async () => {
  const r = await pedir('/esta-pagina-nao-existe-xyz');
  r.status === 404 ? ok('página inexistente dá 404') : falha(`página inexistente respondeu ${r.status}, esperado 404`);
});

// 3. Rotas de API recusam entrada inválida sem quebrar e sem falar com o TSE ou o banco.
await confere('/api/apuracao inválida', async () => {
  const r = await pedir('/api/apuracao?cargo=prefeito&uf=RS');
  r.status === 400 ? ok('/api/apuracao com cargo inválido dá 400') : falha(`/api/apuracao inválida respondeu ${r.status}, esperado 400`);
});
await confere('/api/apuracao POST', async () => {
  const r = await pedir('/api/apuracao', { metodo: 'POST' });
  r.status === 405 ? ok('/api/apuracao por POST dá 405') : falha(`/api/apuracao POST respondeu ${r.status}, esperado 405`);
});

// 4. Cabeçalhos de segurança (D-025).
await confere('cabeçalhos', async () => {
  const r = await pedir('/');
  const h = r.headers;
  const faltam = [];
  if (h['x-content-type-options'] !== 'nosniff') faltam.push('X-Content-Type-Options');
  if (String(h['x-frame-options']).toUpperCase() !== 'DENY') faltam.push('X-Frame-Options');
  if (!h['referrer-policy']) faltam.push('Referrer-Policy');
  if (!h['permissions-policy']) faltam.push('Permissions-Policy');
  if (!h['content-security-policy-report-only'] && !h['content-security-policy']) faltam.push('Content-Security-Policy');
  faltam.length ? falha(`cabeçalhos de segurança ausentes: ${faltam.join(', ')}`) : ok('cabeçalhos de segurança presentes');
});

// 5. O endereço antigo da Vercel redireciona (308) para o domínio oficial. Só no servidor local:
//    no site no ar, o pedido com outro Host cairia na regra da própria Vercel.
if (!producao) {
  await confere('redirecionamento', async () => {
    const r = await pedir('/sobre', { host: 'hub-politico.vercel.app' });
    const destino = String(r.headers.location || '');
    r.status === 308 && destino.startsWith('https://www.lumecidadao.com.br/sobre')
      ? ok('hub-politico.vercel.app redireciona (308) para o domínio oficial')
      : falha(`redirecionamento errado: ${r.status} ${destino}`);
  });
}

// 6. Só no site no ar: a rota dos selos responde JSON válido.
if (producao) {
  await confere('/api/fonte-status', async () => {
    const r = await pedir('/api/fonte-status');
    if (r.status !== 200) return falha(`/api/fonte-status respondeu ${r.status}`);
    JSON.parse(r.corpo);
    ok('/api/fonte-status devolve JSON');
  });
}

if (falhas.length) {
  console.log(`\n${falhas.length} falha(s).`);
  process.exit(1);
}
console.log('\nFumaça ok.');
