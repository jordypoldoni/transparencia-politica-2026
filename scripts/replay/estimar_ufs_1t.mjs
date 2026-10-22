// Acrescenta aos arquivos do replay os estados SEM boletins de urna completos (MS, RN, SE, TO): votos finais OFICIAIS (oficial_1t_2026.json) com
// ritmo de chegada ESTIMADO (média da região, src/lib/replayEstimativa.js). Marca `estimado: true` no estado e `estimadas: [...]` no arquivo.
// Rodar DEPOIS de gerar_secoes_1t.mjs e gerar_votos_1t.mjs (idempotente: refaz os estimados do zero).
// Uso: node scripts/replay/estimar_ufs_1t.mjs [pasta_public_replay]
import fs from 'node:fs';
import path from 'node:path';
import { curvaMedia, estimarUrnas, distribuir } from '../../src/lib/replayEstimativa.js';

const pasta = process.argv[2] || 'public/replay';
const arqS = path.join(pasta, '1t-2026-secoes.json');
const arqV = path.join(pasta, '1t-2026-votos.json');
const oficial = JSON.parse(fs.readFileSync(new URL('./oficial_1t_2026.json', import.meta.url), 'utf8'));
const S = JSON.parse(fs.readFileSync(arqS, 'utf8'));
const V = JSON.parse(fs.readFileSync(arqV, 'utf8'));

// Região de referência de cada estado estimado (mesmas regiões do mapa do replay).
const REGIAO = { MS: ['GO', 'MT', 'DF'], RN: ['AL', 'BA', 'CE', 'MA', 'PB', 'PE', 'PI'], SE: ['AL', 'BA', 'CE', 'MA', 'PB', 'PE', 'PI'], TO: ['AC', 'AM', 'AP', 'PA', 'RO', 'RR'] };

for (const uf of Object.keys(REGIAO)) { delete S.ufs[uf]; delete V.ufs[uf]; }
for (const [uf, ref] of Object.entries(REGIAO)) {
  const refsS = ref.map((r) => S.ufs[r]);
  if (refsS.some((x) => !x)) throw new Error(`${uf}: faltam estados de referência`);
  const curva = curvaMedia(refsS);
  const total = estimarUrnas(oficial.eleitorado[uf], ref.map((r) => ({ te: oficial.eleitorado[r], total: S.ufs[r].total })));
  const acum = distribuir(total, curva);
  while (acum.length < S.minutos) acum.push(total);
  S.ufs[uf] = { total, acum, estimado: true };
  const finais = oficial.finais[uf];
  const porCand = {};
  for (const c of V.candidatos) {
    if (finais[c.n] == null) throw new Error(`${uf}: falta o candidato ${c.n} no resultado oficial`);
    const a = distribuir(finais[c.n], curva);
    while (a.length < V.minutos) a.push(finais[c.n]);
    porCand[c.n] = a;
  }
  V.ufs[uf] = porCand;
}
S.estimadas = Object.keys(REGIAO); V.estimadas = Object.keys(REGIAO);
fs.writeFileSync(arqS, JSON.stringify(S));
fs.writeFileSync(arqV, JSON.stringify(V));
console.log('estimados:', S.estimadas.map((u) => `${u} (${S.ufs[u].total} urnas)`).join(', '));
