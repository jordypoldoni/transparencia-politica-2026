// Gera os votos por candidato do replay (22/10/2026, D-074): votos ACUMULADOS por UF, por minuto, desde 17:00 de Brasília.
// Entrada: mesma pasta de agregados do gerar_secoes_1t.mjs (um {UF}.json por estado, ZZ = exterior; campos candidatos, votos, comparecimento: um valor por minuto desde 17:00).
// Saída: { versao, turno, minutos, candidatos: [{n, nome, partido, tipo}] (ordem FIXA: número de urna; Branco e Nulo por último), ufs: { UF: { [n]: acum[601] } } }
// Uso: node scripts/replay/gerar_votos_1t.mjs <pasta_dos_agregados> [saida]
import fs from 'node:fs';
import path from 'node:path';

const [, , origem, destino = 'public/replay/1t-2026-votos.json'] = process.argv;
if (!origem) { console.error('uso: node scripts/replay/gerar_votos_1t.mjs <pasta_dos_agregados> [saida]'); process.exit(1); }

const MINUTOS = 601;
// Votos ANULADOS: o nº 28 (candidatura indeferida) aparece nos boletins, mas o TSE conta esses votos como NULOS no resultado oficial
// (conferido: nulos oficiais = nulos do boletim + votos do 28, em todos os 24 estados). Aqui eles entram em Nulos e o 28 sai da lista.
const ANULADOS = new Set(['28']);
const cands = new Map();
const ufs = {};
for (const f of fs.readdirSync(origem).filter((x) => /^[A-Z]{2}\.json$/.test(x)).sort()) {
  const d = JSON.parse(fs.readFileSync(path.join(origem, f), 'utf8'));
  const porMinuto = {}; // chegadas por minuto de cada opção (anulados somados em Nulos)
  let somaVotos = 0;
  for (const [n0, arr] of Object.entries(d.votos)) {
    const n = ANULADOS.has(n0) ? '96' : n0;
    if (!cands.has(n)) cands.set(n, { n: Number(n), nome: d.candidatos[n].nome, partido: d.candidatos[n].partido, tipo: d.candidatos[n].tipo });
    if (arr.length > MINUTOS && arr.slice(MINUTOS).some((x) => x)) throw new Error(`${d.uf} ${n0}: votos fora da janela de ${MINUTOS} minutos`);
    const dest = (porMinuto[n] = porMinuto[n] || new Array(MINUTOS).fill(0));
    for (let i = 0; i < MINUTOS; i++) dest[i] += arr[i] || 0;
    somaVotos += arr.reduce((x, y) => x + y, 0);
  }
  const porCand = {};
  for (const [n, chegadas] of Object.entries(porMinuto)) {
    let soma = 0;
    porCand[n] = chegadas.map((v) => (soma += v));
  }
  const comp = d.comparecimento.reduce((a, b) => a + b, 0);
  if (somaVotos !== comp) throw new Error(`${d.uf}: soma dos votos ${somaVotos} difere do comparecimento ${comp}`);
  ufs[d.uf] = porCand;
}
const ordem = (c) => (c.tipo === 'Branco' ? 1000 : c.tipo === 'Nulo' ? 1001 : c.n);
const candidatos = [...cands.values()].sort((a, b) => ordem(a) - ordem(b));
fs.mkdirSync(path.dirname(destino), { recursive: true });
fs.writeFileSync(destino, JSON.stringify({ versao: 1, turno: 1, minutos: MINUTOS, candidatos, ufs }));
console.log(`${Object.keys(ufs).length} UFs, ${candidatos.length} opções, ${fs.statSync(destino).size} bytes em ${destino}`);
