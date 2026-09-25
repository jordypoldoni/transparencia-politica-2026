// Candidatos a Deputado ESTADUAL 2026, lidos do TSE NA HORA. (25/09/2026)
//
// Mora aqui, e não na rota, porque são DOIS que usam: a rota /api/candidatos-deputado-estadual
// (busca e troca de página no navegador) e o getServerSideProps de /candidatos-2026 (a primeira
// página já vem no HTML, que é o que o Google enxerga). Duas cópias viram duas regras.
//
// UF É OBRIGATÓRIA: a fonte só lista por estado, e o país inteiro seriam 27 chamadas por visita.
// DF fica de fora: lá o cargo é deputado DISTRITAL (cargo 8), não estadual.
//
// O QUE SAI DAQUI: só o que o cartão mostra e a busca usa. A lista do TSE traz o TÍTULO DE
// ELEITOR de cada candidato (visto na sonda de 25/09); ele, o CPF e o resto nunca saem.
import { lerTse, fotoTse, slugify } from './tseAoVivo';

const ANO = 2026;
const ID_ELEICAO_LISTA = 6257;      // o id que a LISTAGEM aceita (o mesmo dos outros cargos)
export const ID_ELEICAO_ESTADUAL = 20322002026; // o id que a ficha e a foto usam
const CARGO = 7;                    // Deputado Estadual
export const UFS_ESTADUAL = 'AC AL AP AM BA CE ES GO MA MT MS MG PA PB PR PE PI RJ RN RS RO RR SC SP SE TO'.split(' ');
const UFS = new Set(UFS_ESTADUAL);

// Cache na memória da função: a lista muda devagar (situação de registro) e a busca e a troca
// de página não devem pedir 1.431 candidatos de novo ao TSE. Era 30 minutos; subiu para 6 horas
// em 25/09 quando entrou a contagem do país (26 listas): cada lista cheia passa pela ponte do
// Supabase (3,4 MB só a de SP) e isso conta na franquia de tráfego do plano gratuito.
export const TTL_LISTA_S = 6 * 60 * 60;
const TTL_MS = TTL_LISTA_S * 1000;
const cache = new Map();

const semAcento = (s) => (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

function enxugar(c, uf) {
  const sq = String(c.id);
  const nome = c.nomeUrna || c.nomeCompleto || '';
  return {
    id: sq,
    slug: `${slugify(nome)}-${c.numero || 's'}-${sq}-${uf.toLowerCase()}`,
    uf,
    nr_candidato: c.numero != null ? String(c.numero) : null,
    nome_urna: nome,
    nome_completo: c.nomeCompleto || null,
    partido_sigla: c.partido?.sigla || null,
    coligacao_nome: c.nomeColigacao || null,
    situacao_tse: c.descricaoSituacao || null,
    apto_tse: typeof c.candidatoApto === 'boolean' ? c.candidatoApto : null,
    totalizacao_tse: c.descricaoTotalizacao || null,
    // SEM `reeleicao` (retirado em 25/09/2026): na LISTA o st_REELEICAO vem false para todo mundo.
    // Conferido no PT do RS: Leonel Radde e Jeferson Fernandes são deputados estaduais em exercício
    // e vieram false. Campo que sempre diz "não" é afirmação falsa, então não sai daqui.
    foto_url: fotoTse(ID_ELEICAO_ESTADUAL, sq, uf),
  };
}

async function listaDaUf(uf) {
  const guardado = cache.get(uf);
  if (guardado && Date.now() - guardado.em < TTL_MS) return guardado.lista;
  const j = await lerTse(`/divulga/rest/v1/candidatura/listar/${ANO}/${uf}/${ID_ELEICAO_LISTA}/${CARGO}/candidatos`);
  const lista = ((j && j.candidatos) || [])
    .map((c) => enxugar(c, uf))
    .sort((a, b) => a.nome_urna.localeCompare(b.nome_urna, 'pt-BR'));
  cache.set(uf, { em: Date.now(), lista });
  return lista;
}

// Mesmo formato das listas dos outros cargos ({ itens, total }). Sem UF válida devolve
// precisaUf, e a tela pede o estado. Falha do TSE LANÇA erro: quem chama decide como dizer, e
// "zero candidatos" nunca pode ser a resposta para "a fonte não respondeu".
export async function listarCandidatosEstaduais({ uf, busca = '', pagina = 1, porPagina = 25 } = {}) {
  const UF = String(uf || '').toUpperCase();
  if (!UFS.has(UF)) return { itens: [], total: 0, precisaUf: true };
  let lista = await listaDaUf(UF);
  // Mesma regra de busca dos outros cargos: só dígitos = começo do número; texto = nome de
  // urna, nome completo ou sigla exata. (Nome do partido por extenso a lista do TSE não traz.)
  const termo = String(busca || '').trim().slice(0, 80);
  if (termo) {
    if (/^\d+$/.test(termo)) lista = lista.filter((c) => (c.nr_candidato || '').startsWith(termo));
    else {
      const q = semAcento(termo);
      lista = lista.filter((c) => semAcento(c.nome_urna).includes(q) || semAcento(c.nome_completo).includes(q) || semAcento(c.partido_sigla) === q);
    }
  }
  const de = (Math.max(1, Number(pagina) || 1) - 1) * porPagina;
  const itens = lista.slice(de, de + porPagina).map(({ nome_completo, ...resto }) => resto);
  return { itens, total: lista.length };
}

// CONTAGEM DO PAÍS E POR ESTADO (25/09/2026), para a aba e o seletor mostrarem números como os
// outros cargos. Não existe endpoint de contagem: são as 26 listas, de 4 em 4 para não disparar
// tudo de uma vez contra a fonte. Guardada 24 horas. Se algum estado falhar, o total NÃO sai:
// um número do país faltando um estado seria um número errado com cara de certo.
const TTL_RESUMO_MS = 24 * 60 * 60 * 1000;
let resumoGuardado = null;

export async function resumoCandidatosEstaduais() {
  if (resumoGuardado && Date.now() - resumoGuardado.em < TTL_RESUMO_MS) return resumoGuardado.dados;
  const porUf = {};
  const falhas = [];
  for (let i = 0; i < UFS_ESTADUAL.length; i += 4) {
    await Promise.all(UFS_ESTADUAL.slice(i, i + 4).map(async (uf) => {
      try { porUf[uf] = (await listaDaUf(uf)).length; } catch (e) { falhas.push(uf); }
    }));
  }
  const completo = falhas.length === 0;
  const dados = { total: completo ? Object.values(porUf).reduce((a, b) => a + b, 0) : null, porUf, completo, falhas };
  if (completo) resumoGuardado = { em: Date.now(), dados };
  return dados;
}
