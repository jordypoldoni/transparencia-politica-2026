// Gera o arquivo de dados do replay da apuração (22/10/2026, D-073 e D-074): seções recebidas pelo TSE por minuto, acumuladas, por UF.
// Entrada: pasta com um {UF}.json por estado (e ZZ = exterior), saída do agregador dos boletins de urna do TSE (campo `secoes` = chegadas por
// minuto desde 17:00 de Brasília, `secoes_total`). Os agregados e o agregador ficam fora do git (pasta _quarentena/bu_teste do PC).
// Uso: node scripts/replay/gerar_secoes_1t.mjs <pasta_dos_agregados> [saida]
import fs from 'node:fs';
import path from 'node:path';

const [, , origem, destino = 'public/replay/1t-2026-secoes.json'] = process.argv;
if (!origem) { console.error('uso: node scripts/replay/gerar_secoes_1t.mjs <pasta_dos_agregados> [saida]'); process.exit(1); }

const MINUTOS = 601; // minutos 0 a 600 (17:00 a 03:00 do dia seguinte)
const ufs = {};
for (const f of fs.readdirSync(origem).filter((x) => /^[A-Z]{2}\.json$/.test(x)).sort()) {
  const d = JSON.parse(fs.readFileSync(path.join(origem, f), 'utf8'));
  const acum = new Array(MINUTOS).fill(0);
  let soma = 0;
  for (let i = 0; i < MINUTOS; i++) { soma += d.secoes[i] || 0; acum[i] = soma; }
  if (soma !== d.secoes_total) throw new Error(`${d.uf}: soma ${soma} difere do total ${d.secoes_total} (urnas fora da janela de ${MINUTOS} minutos)`);
  ufs[d.uf] = { total: d.secoes_total, acum };
}
fs.mkdirSync(path.dirname(destino), { recursive: true });
fs.writeFileSync(destino, JSON.stringify({ versao: 1, turno: 1, base: '2026-10-04T17:00:00-03:00', minutos: MINUTOS, ufs }));
console.log(`${Object.keys(ufs).length} UFs, ${fs.statSync(destino).size} bytes em ${destino}`);
