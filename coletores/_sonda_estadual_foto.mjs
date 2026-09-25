// Sonda (25/09/2026): a LISTAGEM de deputado estadual vem sem foto (fotoUrl null). Da para
// montar o endereco da foto so com o que a listagem traz (ano, UF, id)? Pega 3 candidatos de
// UFs diferentes, busca a ficha de cada um e poe o fotoUrl ao lado do id para comparar.
// So le; nao grava nada. Uso: node coletores/_sonda_estadual_foto.mjs
import 'dotenv/config';

const PONTE = `${process.env.SUPABASE_URL}/functions/v1/tse-ponte`;
const TOKEN = process.env.PONTE_TOKEN || '';
const ANO = 2026, ID_LISTA = 6257, ID_ELEICAO = 20322002026, CARGO = 7;
const ponte = (c) => fetch(`${PONTE}?caminho=${encodeURIComponent(c)}`, { headers: { Authorization: `Bearer ${TOKEN}` } });

for (const uf of ['SP', 'RS', 'RR']) {
  const lista = (await (await ponte(`/divulga/rest/v1/candidatura/listar/${ANO}/${uf}/${ID_LISTA}/${CARGO}/candidatos`)).json()).candidatos || [];
  for (const c of [lista[0], lista[Math.floor(lista.length / 2)]]) {
    const f = await (await ponte(`/divulga/rest/v1/candidatura/buscar/${ANO}/${uf}/${ID_ELEICAO}/candidato/${c.id}`)).json();
    console.log(`${uf} id=${c.id} publicavel=${f.fotoUrlPublicavel}\n   ${f.fotoUrl}`);
  }
}
