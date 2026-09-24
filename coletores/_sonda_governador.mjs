// Sonda: mede a fonte do TSE para GOVERNADOR (cargo 3) e DEPUTADO ESTADUAL (cargo 7) antes de
// escrever o coletor. Mesma disciplina do senador: medir, depois codar.
// Uso: node coletores/_sonda_governador.mjs
import 'dotenv/config';

const HOST = 'https://divulgacandcontas.tse.jus.br';
const REST = '/divulga/rest/v1/candidatura';
const ANO = 2026;
const ID_ELEICAO = 20322002026;   // o mesmo do senador e do deputado federal
const ID_LISTA = 6257;
const UA = { 'User-Agent': 'Mozilla/5.0', Accept: 'application/json' };
const CARGOS = { 3: 'Governador', 7: 'Deputado Estadual' };
const UFS_AMOSTRA = ['RS', 'SP', 'AC'];

const pausa = (ms = 400) => new Promise((r) => setTimeout(r, ms));

async function pegar(caminho) {
  const r = await fetch(HOST + caminho, { headers: UA });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  const texto = await r.text();
  if (!texto) throw new Error('corpo vazio');
  return JSON.parse(texto);
}

async function main() {
  console.log(`\nSonda: governador e deputado estadual ${ANO}\n`);

  for (const [cargo, nome] of Object.entries(CARGOS)) {
    console.log(`── cargo ${cargo} (${nome})`);
    let primeiraFicha = null;
    for (const uf of UFS_AMOSTRA) {
      try {
        const d = await pegar(`${REST}/listar/${ANO}/${uf}/${ID_LISTA}/${cargo}/candidatos`);
        const lista = d.candidatos || [];
        console.log(`   ${uf}: ${lista.length} candidatos`);
        if (!primeiraFicha && lista.length) primeiraFicha = { uf, sq: String(lista[0].id), nome: lista[0].nomeUrna };
      } catch (e) {
        console.log(`   ${uf}: FALHA ${e.message}`);
      }
      await pausa();
    }

    if (primeiraFicha) {
      try {
        const f = await pegar(`${REST}/buscar/${ANO}/${primeiraFicha.uf}/${ID_ELEICAO}/candidato/${primeiraFicha.sq}`);
        console.log(`   ficha de ${primeiraFicha.nome} (${primeiraFicha.uf}): ${Object.keys(f).length} campos`);
        console.log(`     nome=${f.nomeUrna} nr=${f.numero} partido=${f.partido?.sigla} situacao=${f.descricaoSituacao}`);
        console.log(`     bens=${Array.isArray(f.bens) ? f.bens.length : 'n/d'} eleicoes_anteriores=${Array.isArray(f.eleicoesAnteriores) ? f.eleicoesAnteriores.length : 'n/d'}`);
        console.log(`     vices=${Array.isArray(f.vices) ? f.vices.length : 'n/d'}${Array.isArray(f.vices) && f.vices.length ? ` (campos: ${Object.keys(f.vices[0]).join(', ')})` : ''}`);
        console.log(`     foto=${f.fotoUrl ? 'sim' : 'nao'} publicavel=${f.fotoUrlPublicavel}`);
      } catch (e) {
        console.log(`   ficha: FALHA ${e.message}`);
      }
    }
    console.log('');
    await pausa();
  }
}

main().catch((e) => { console.error('Erro:', e.message); process.exitCode = 1; });
