// pages/api/ficha-tse.js — a ficha do candidato no DivulgaCandContas, ao vivo.
//
// POR QUE ESTA ROTA EXISTE ALÉM DA /api/situacao-candidatura
// A listagem (usada lá) dá a situação de todos os 28 numa requisição só, e é o que os CARDS
// precisam. Mas ela é um resumo: motivos do indeferimento, substituição e patrimônio só
// existem na ficha INDIVIDUAL. Esta rota serve a ficha, um candidato por vez.
//
// GOTCHA QUE CUSTOU MEIA SESSÃO (16/09/2026): são DOIS identificadores de eleição.
//   CD_ELEICAO      = 6257          → aparece no CSV em lote, serve para a LISTAGEM
//   eleicao.id      = 20322002026   → o que o DivulgaCandContas usa por CANDIDATO
// Usar o 6257 aqui devolve 200 com CORPO VAZIO, que parece endpoint inexistente e não é.
//
// O QUE ESTA ROTA NÃO DEVOLVE, DE PROPÓSITO: cpf e tituloEleitor. A fonte publica os dois
// completos nos 14. Não têm valor de fiscalização (ninguém audita um candidato pelo CPF) e são
// vetor de fraude de identidade. Ficam fora aqui, na rota, e não só na tela: assim nenhum
// componente futuro consegue exibi-los por descuido.

const REST = 'https://divulgacandcontas.tse.jus.br/divulga/rest/v1/candidatura';
const ID_ELEICAO = 20322002026;
const ID_ELEICAO_LISTA = 6257;
const ANO = 2026;
const UA = { 'User-Agent': 'Mozilla/5.0', Accept: 'application/json' };
const TTL_MS = 15 * 60 * 1000;

const cache = new Map();          // sq -> { em, dados }
let nomesCache = { em: 0, mapa: null };

// Nome de um sq_candidato, para poder dizer "substituída por FULANO" em vez de mostrar código.
async function mapaDeNomes() {
  const agora = Date.now();
  if (nomesCache.mapa && (agora - nomesCache.em) < TTL_MS) return nomesCache.mapa;
  const mapa = {};
  for (const cargo of [1, 2]) {
    const r = await fetch(`${REST}/listar/${ANO}/BR/${ID_ELEICAO_LISTA}/${cargo}/candidatos`, { headers: UA, signal: PRAZO() });
    if (!r.ok) continue;
    const j = await r.json();
    for (const c of j.candidatos || []) if (c?.id) mapa[String(c.id)] = c.nomeUrna || c.nomeCompleto || null;
  }
  nomesCache = { em: agora, mapa };
  return mapa;
}

// Por que uma falha de rede precisa de tratamento próprio aqui (17/09/2026).
// Em produção as duas rotas do TSE passaram a devolver `indisponivel: true` enquanto em
// localhost funcionavam. O log não ajudou: quando o fetch do Node falha na conexão, a
// `message` é literalmente "fetch failed" e o motivo real mora em `e.cause` — que eu não
// estava lendo. Sem isso não dá para separar DNS, TLS, recusa de conexão e bloqueio por IP,
// que pedem correções diferentes. Também cortamos a espera em 9s: o limite da função na
// Vercel é 10s, e estourar ele devolve 504 em vez de uma mensagem legível.
function porQueFalhou(e) {
  const causa = e && e.cause;
  const partes = [e && e.message].filter(Boolean);
  if (causa) partes.push(causa.code || causa.message || String(causa));
  if (e && e.name === 'TimeoutError') partes.push('a fonte demorou mais de 9s');
  return partes.join(' \u00b7 ');
}
const PRAZO = () => (typeof AbortSignal !== 'undefined' && AbortSignal.timeout ? AbortSignal.timeout(9000) : undefined);

export default async function handler(req, res) {
  const sq = String(req.query.sq || '').trim();
  if (!/^\d{6,20}$/.test(sq)) return res.status(400).json({ erro: 'parâmetro sq inválido' });

  const agora = Date.now();
  const emCache = cache.get(sq);
  if (emCache && (agora - emCache.em) < TTL_MS) {
    res.setHeader('X-Cache', 'hit');
    return res.status(200).json(emCache.dados);
  }

  try {
    const r = await fetch(`${REST}/buscar/${ANO}/BR/${ID_ELEICAO}/candidato/${sq}`, { headers: UA, signal: PRAZO() });
    if (!r.ok) throw new Error(`TSE respondeu ${r.status}`);
    const texto = await r.text();
    if (!texto) throw new Error('TSE devolveu corpo vazio (id de eleição errado?)');
    const f = JSON.parse(texto);

    const nomes = await mapaDeNomes();
    const nomeDe = (id) => (id ? (nomes[String(id)] || null) : null);

    const dados = {
      consultadoEm: new Date().toISOString(),
      fonteUrl: `https://divulgacandcontas.tse.jus.br/divulga/#/candidato/BR/BR/${ID_ELEICAO}/${sq}/${ANO}/BR`,

      situacao: f.descricaoSituacao || null,
      apto: typeof f.candidatoApto === 'boolean' ? f.candidatoApto : null,
      constaDaUrna: f.descricaoSituacaoCandidato || null,
      totalizacao: f.descricaoTotalizacao || null,
      numeroProcesso: f.numeroProcesso || null,

      // Só existe em candidatura indeferida. São os fundamentos que o TSE registra.
      motivos: Array.isArray(f.motivos) ? f.motivos.filter(Boolean) : [],

      // A resposta definitiva para "por que dois candidatos com o número 28": o TSE PUBLICA
      // a substituição. Não é dedução por código de status, é campo próprio.
      substituido: f.st_SUBSTITUIDO === true,
      substitutoSq: f.substituto?.sqCandidato ? String(f.substituto.sqCandidato) : null,
      substitutoNome: nomeDe(f.substituto?.sqCandidato),

      // A fonte agrupa vices por NÚMERO DE URNA, não por chapa: os dois presidentes do 28
      // recebem a mesma lista, e sq_CANDIDATO_SUPERIOR vem null. Então devolvemos a lista e
      // NÃO afirmamos de quem é cada vice. Verificado em duas fontes independentes.
      // Complemento de identidade que o CSV em lote NÃO tem: o arquivo traz só a UF de
      // nascimento (SG_UF_NASCIMENTO), e o município e a nacionalidade só existem aqui.
      municipioNascimento: f.nomeMunicipioNascimento || null,
      ufNascimento: f.sgUfNascimento || null,
      nacionalidade: f.nacionalidade || null,

      // DOCUMENTOS entregues ao TSE. O campo `url` da fonte vem relativo e inservível
      // ("candidaturas/oficial/2026/BR/BR/6257/candidatos/21107/"). O caminho que FUNCIONA é
      // /divulga/rest/arquivo/doc/{idArquivo} - sabemos porque é exatamente a URL de onde
      // lemos o plano de governo do Marçal em 13/09. Evidência, não palpite.
      documentos: (Array.isArray(f.arquivos) ? f.arquivos : [])
        .filter((a) => a?.idArquivo && a?.nome)
        .map((a) => ({
          nome: a.nome,
          tipo: a.tipo || null,
          url: `https://divulgacandcontas.tse.jus.br/divulga/rest/arquivo/doc/${a.idArquivo}`,
        })),

      // REDES: a fonte devolve handles com um "https://" colado na frente
      // ("https://@clarianabarao"). Virar link assim dá 404. Separamos: o que é domínio de
      // verdade vira link; o que é arroba fica como TEXTO, porque não dá para saber de qual
      // rede é, e inventar "instagram.com/fulano" seria fabricar informação.
      redes: (Array.isArray(f.sites) ? f.sites : [])
        .map((x) => String(x || '').trim())
        .filter(Boolean)
        .map((bruto) => {
          const semProtocolo = bruto.replace(/^https?:\/\//i, '').trim();
          const ehArroba = semProtocolo.startsWith('@');
          const temDominio = /^[\w.-]+\.[a-z]{2,}(\/|$)/i.test(semProtocolo);
          return {
            texto: semProtocolo,
            url: (!ehArroba && temDominio) ? `https://${semProtocolo}` : null,
          };
        }),

      // PATRIMÔNIO. `st_DIVULGA_BENS` é respeitado: hoje vem true nos 14, mas a flag existe
      // para o caso de o TSE restringir a divulgação, e ignorá-la seria publicar contra a fonte.
      //
      // `totalDeBens` vem do TSE; NÃO recalculamos somando os itens. Se a soma divergir do
      // total (arredondamento, bem sem valor), o número exibido continua sendo o oficial.
      divulgaBens: f.st_DIVULGA_BENS !== false,
      totalDeBens: typeof f.totalDeBens === 'number' ? f.totalDeBens : null,
      bens: (Array.isArray(f.bens) ? f.bens : []).map((b) => ({
        descricao: b.descricao || null,
        tipo: b.descricaoDeTipoDeBem || null,
        valor: typeof b.valor === 'number' ? b.valor : null,
      })),

      vices: (Array.isArray(f.vices) ? f.vices : []).map((v) => ({
        sq: v.sq_CANDIDATO ? String(v.sq_CANDIDATO) : null,
        nome: v.nm_URNA || v.nm_CANDIDATO || null,
        apto: typeof v.candidatoApto === 'boolean' ? v.candidatoApto : null,
      })),
    };

    cache.set(sq, { em: agora, dados });
    res.setHeader('X-Cache', 'miss');
    return res.status(200).json(dados);
  } catch (e) {
    const motivoTecnico = porQueFalhou(e);
    console.error('ficha-tse:', motivoTecnico);
    if (emCache) { res.setHeader('X-Cache', 'stale'); return res.status(200).json({ ...emCache.dados, degradado: true, motivoTecnico }); }
    // Indisponível não pode virar caixa de erro na tela: sem dados, a seção não é desenhada.
    return res.status(200).json({ indisponivel: true, situacao: null, motivos: [], vices: [], motivoTecnico });
  }
}
