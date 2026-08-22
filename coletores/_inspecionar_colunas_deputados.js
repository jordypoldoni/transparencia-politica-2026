// _inspecionar_colunas_deputados.js — script de INVESTIGAÇÃO, não faz parte do fluxo normal do
// site. Baixa o mesmo consulta_cand_2026.zip e imprime o cabeçalho REAL das colunas do CSV, pra
// eu confirmar contra o que o coletor está assumindo — porque o coletor avisou que a coluna
// "ST_REELEICAO" não existe no arquivo real deste ano (e eu preciso saber o nome certo, se existir
// com outro nome, ou confirmar que o TSE não disponibiliza esse dado pra 2026 neste arquivo).
//
// Rodar do mesmo jeito que o coletor (dentro de hub_politica, com internet livre):
//   node coletores/_inspecionar_colunas_deputados.js
//
// Não grava nada no banco, não sobe nada — só baixa (3 MB) e imprime no terminal. Pode rodar
// numa aba de terminal separada, mesmo com o coletor principal ainda rodando na outra.
import AdmZip from 'adm-zip';
import iconv from 'iconv-lite';
import fs from 'fs';
import os from 'os';
import path from 'path';

const URL = 'https://cdn.tse.jus.br/estatistica/sead/odsele/consulta_cand/consulta_cand_2026.zip';

async function main() {
  console.log('⬇️  Baixando consulta_cand_2026.zip…');
  const r = await fetch(URL);
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  const buf = Buffer.from(await r.arrayBuffer());
  console.log(`   ${(buf.length / 1024 / 1024).toFixed(1)} MB`);
  const tmp = path.join(os.tmpdir(), 'tse_inspecao_2026.zip');
  fs.writeFileSync(tmp, buf);
  const zip = new AdmZip(tmp);

  const entry = zip.getEntries().find((e) => /consulta_cand_2026_SP\.csv$/i.test(e.entryName))
    || zip.getEntries().find((e) => /consulta_cand.*\.csv$/i.test(e.entryName));
  if (!entry) throw new Error('Não achei nenhum CSV de candidatos dentro do zip.');
  console.log('\nArquivo inspecionado:', entry.entryName);

  const texto = iconv.decode(entry.getData(), 'latin1');
  const primeiraLinha = texto.split(/\r?\n/)[0];
  const colunas = primeiraLinha.split(';').map((c) => c.trim().replace(/^"|"$/g, ''));

  console.log(`\n📋 ${colunas.length} colunas encontradas neste arquivo:\n`);
  colunas.forEach((c, i) => console.log(`  ${String(i + 1).padStart(2, ' ')}. ${c}`));

  const candidatasReeleicao = colunas.filter((c) => /REELEI|RE.?ELEI/i.test(c));
  const candidatasSituacao = colunas.filter((c) => /SITUACAO|SIT_/i.test(c));
  console.log(`\n🔎 Colunas com "REELEI" no nome: ${candidatasReeleicao.length ? candidatasReeleicao.join(', ') : '(nenhuma — pode ser que o TSE não disponibilize esse dado neste arquivo em 2026)'}`);
  console.log(`🔎 Colunas com "SITUACAO"/"SIT_" no nome (referência): ${candidatasSituacao.length ? candidatasSituacao.join(', ') : '(nenhuma)'}`);

  console.log('\n👉 Copia e me manda a lista de colunas acima (ou pelo menos as linhas dos dois "🔎").');
}

main().catch((e) => { console.error('💥 Erro:', e.message); process.exit(1); });
