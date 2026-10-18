// SERVIDOR FALSO DO TSE para testes (18/10/2026, I4). Serve os 29 arquivos REAIS gravados em docs/fixtures_tse/turno1/
// em http://127.0.0.1:<porta>/ele2026/6257/dados/<pasta>/<pasta>-c0001-e006257-u.json. Cada pasta (br, zz, ac...) pode ser
// posta em modo: ok | 404 | 500 | 403 | lento (atraso em ms) | corrompido | vazio. Conta pedidos por pasta.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..', 'docs', 'fixtures_tse', 'turno1');
export const temFixtures = fs.existsSync(path.join(dir, 'br.json'));
export const lerBruto = (pasta) => JSON.parse(fs.readFileSync(path.join(dir, `${pasta}.json`), 'utf8'));

const nm = (x) => Number(String(x).replace(/\./g, '').replace(',', '.'));

// Deixa o arquivo nacional "parado no passado": menos votos, menos seções, menos comparecimento (sempre coerente).
export function rebaixarNacional(bruto, tirar = 1000) {
  const b = JSON.parse(JSON.stringify(bruto));
  const cand = b.carg[0].agr.flatMap((a) => a.par.flatMap((p) => p.cand)).sort((x, y) => nm(y.vap) - nm(x.vap))[0];
  cand.vap = String(nm(cand.vap) - tirar);
  b.v.vv = String(nm(b.v.vv) - tirar); b.v.tv = String(nm(b.v.tv) - tirar);
  b.s.st = String(nm(b.s.st) - 100);
  b.e.c = String(nm(b.e.c) - tirar);
  b.dg = '05/10/2026'; b.hg = '11:00:00';
  return b;
}

export async function subirTseFalso({ nacional } = {}) {
  const modos = {}; // pasta -> { modo, atraso }
  const pedidos = {}; // pasta -> n
  const corpo = {}; // pasta -> bruto sobreposto
  if (nacional) corpo.br = nacional;
  const servidor = http.createServer((req, res) => {
    const m = /\/dados\/([a-z]{2})\/[a-z]{2}-c0001-e006257-u\.json$/.exec(req.url);
    if (!m) { res.statusCode = 404; return res.end(); }
    const pasta = m[1];
    pedidos[pasta] = (pedidos[pasta] || 0) + 1;
    const { modo = 'ok', atraso = 0 } = modos[pasta] || {};
    const enviar = () => {
      if (modo === '404') { res.statusCode = 404; return res.end('nao'); }
      if (modo === '500') { res.statusCode = 500; return res.end('erro'); }
      if (modo === '403') { res.statusCode = 403; return res.end('proibido'); }
      if (modo === 'vazio') { res.statusCode = 200; return res.end(''); }
      if (modo === 'corrompido') { res.statusCode = 200; return res.end('{"carg":[{"agr":['); }
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify(corpo[pasta] || lerBruto(pasta)));
    };
    if (modo === 'lento') setTimeout(enviar, atraso); else enviar();
  });
  await new Promise((ok) => servidor.listen(0, '127.0.0.1', ok));
  return {
    base: `http://127.0.0.1:${servidor.address().port}`,
    modos, pedidos, corpo,
    total: () => Object.values(pedidos).reduce((a, b) => a + b, 0),
    fechar: () => new Promise((ok) => { servidor.closeAllConnections?.(); servidor.close(ok); }),
  };
}
