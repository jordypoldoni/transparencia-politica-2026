// Sonda: por que 19 fichas de governador trazem MAIS DE UM vice? (24/09/2026)
// A suspeita e substituicao (vice antigo + vice novo na mesma chapa). Se for isso, guardar
// "o primeiro" pode estar guardando o substituido, e a tela mostraria vice errado.
// Uso: node coletores/_sonda_vice_duplicado.mjs
import 'dotenv/config';

const HOST = 'https://divulgacandcontas.tse.jus.br';
const REST = '/divulga/rest/v1/candidatura';
const ANO = 2026, ID_ELEICAO = 20322002026, ID_LISTA = 6257, CARGO = 3;
const UA = { 'User-Agent': 'Mozilla/5.0', Accept: 'application/json' };
const UFS = ['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'];
const pausa = (ms = 350) => new Promise((r) => setTimeout(r, ms));

async function pegar(caminho) {
  const r = await fetch(HOST + caminho, { headers: UA });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  const t = await r.text();
  if (!t) throw new Error('corpo vazio');
  return JSON.parse(t);
}

async function main() {
  console.log('\nSonda: fichas de governador com mais de um vice\n');
  let achados = 0;
  for (const uf of UFS) {
    let lista = [];
    try { lista = (await pegar(`${REST}/listar/${ANO}/${uf}/${ID_LISTA}/${CARGO}/candidatos`)).candidatos || []; }
    catch (e) { console.log(`  ${uf}: falha na listagem (${e.message})`); continue; }
    for (const c of lista) {
      try {
        const f = await pegar(`${REST}/buscar/${ANO}/${uf}/${ID_ELEICAO}/candidato/${String(c.id)}`);
        const v = Array.isArray(f.vices) ? f.vices : [];
        if (v.length > 1) {
          achados++;
          console.log(`\n${uf} · ${f.nomeUrna} (${f.partido?.sigla}) · ${v.length} vices`);
          v.forEach((x, i) => console.log(
            `   ${i + 1}. ${x.nm_URNA || x.nm_CANDIDATO} (${x.sg_PARTIDO})` +
            ` cargo="${x.ds_CARGO || '?'}" situacaoVice="${x.situacaoVice || '?'}"` +
            ` situacaoCandidato="${x.situacaoCandidato || '?'}" stRegistro="${x.stRegistro || '?'}"` +
            ` apto=${x.candidatoApto} sq=${x.sq_CANDIDATO}`
          ));
        }
      } catch (e) { /* uma ficha que falha nao interrompe a varredura */ }
      await pausa();
    }
  }
  console.log(`\n${achados} chapas com mais de um vice.\n`);
}

main().catch((e) => { console.error('Erro:', e.message); process.exitCode = 1; });
