// De que casa e este parlamentar, e onde mora o perfil dele.
//
// Fonte UNICA dessa decisao. Antes de 12/09/2026 a logica vivia solta dentro do
// PerfilPolitico.jsx, e foi assim que nasceu o bug de 10/09 (todo estadual creditado a
// ALESP, inclusive os 55 do RS). Duas copias da mesma regra viram duas regras diferentes.
//
// Discriminador: fonte_api guarda a URL/sigla da origem ('alesp', 'alergs', a pagina da
// camara, a pagina do senado). casa_legislativa e cargo_atual entram como rede de seguranca
// porque o coletor_senadores.js grava cargo_atual='Senador(a)' mas nao grava casa_legislativa.

export function casaDoPerfil(perfil) {
  const p = perfil || {};
  const fonteApi = String(p.fonte_api || '').toLowerCase();
  // Duas grafias porque circulam duas formas do mesmo objeto: a linha crua de
  // agentes_politicos (casa_legislativa / cargo_atual) e a versao ja mapeada pelo
  // servico_api / view radar_gastos (casa: 'Camara' | 'Senado' | 'Assembleia (SP)').
  const casaCampo = String(p.casa_legislativa || p.casa || '').toLowerCase();
  const cargo = String(p.cargo_atual || p.cargo || '').toLowerCase();

  // 'Assembleia (SP)' / 'Assembleia (RS)' sao os rotulos que o servico_api e a view
  // radar_gastos usam; nesses objetos nao ha fonte_api para consultar.
  const ehAlesp = fonteApi.includes('alesp') || casaCampo === 'assembleia (sp)';
  const ehAlergs = fonteApi.includes('alergs') || casaCampo === 'assembleia (rs)';
  const ehSenado = fonteApi.includes('senado') || casaCampo.includes('senado') || cargo.startsWith('senador');
  const ehEstadual = !ehSenado && (casaCampo === 'estadual' || casaCampo.startsWith('assembleia') || ehAlesp || ehAlergs);

  // A sigla oficial da assembleia gaucha e ALRS (tambem grafada AL-RS); "ALERGS" e forma
  // corrente mas incorreta. No credito vai por extenso: "AL-RS" nao diz nada ao leitor comum,
  // e a regra do site e nao pressupor conhecimento. ALESP fica na sigla porque e reconhecida.
  const fonteNome = ehAlergs ? 'Assembleia Legislativa do RS'
    : ehAlesp ? 'ALESP'
    : ehEstadual ? 'Assembleia Legislativa'
    : ehSenado ? 'Senado Federal'
    : 'Câmara dos Deputados';
  // Versao com preposicao, para frases do tipo "cadastro oficial da ...".
  const fonteNomeCom = ehSenado ? `do ${fonteNome}` : `da ${fonteNome}`;

  // Usado so quando cargo_atual esta vazio no banco.
  const cargoPadrao = ehSenado ? 'Senador(a)'
    : ehEstadual ? 'Deputado(a) Estadual'
    : 'Deputado(a) Federal';

  // A ALRS publica APENAS o agregado mensal por categoria: nao ha nota fiscal nem fornecedor.
  const temNotaFiscal = !ehAlergs;

  // Rota canonica do perfil. Senador em /deputado/ e erro factual na porta de entrada do
  // Google, que e a URL. Estadual continua em /deputado/ porque ele e, de fato, deputado.
  const rota = ehSenado ? 'senador' : 'deputado';

  return { fonteApi, ehAlesp, ehAlergs, ehSenado, ehEstadual, fonteNome, fonteNomeCom, cargoPadrao, temNotaFiscal, rota };
}

// Link para o perfil, ja na rota certa da casa. Use SEMPRE isto em vez de escrever
// `/deputado/${slug}` na mao.
export function hrefPerfil(perfil) {
  if (!perfil || !perfil.slug) return '#';
  return `/${casaDoPerfil(perfil).rota}/${perfil.slug}`;
}

// ---------------------------------------------------------------------------
// De que casa e esta VOTACAO. (19/09/2026)
//
// Mesmo principio do casaDoPerfil acima, e pelo mesmo motivo: a regra mora aqui, uma vez so.
//
// O discriminador e o PREFIXO do votacao_id_externa, escrito pelo coletor de cada casa:
//   'SF-6918'        -> Senado          (coletor_votos_senado.js)
//   'ALERGS-2023-...'-> Assembleia (RS) (coletor_votos_alergs.js)
//   '2122125-115'    -> Camara          (coletor_votos.js, id da propria API)
//
// NAO existe coluna `casa` em `votacoes`, e isso e deliberado: coluna nova precisaria ser
// preenchida por tres coletores, e coletor que esquece grava nulo, que vira casa errada em
// silencio. E o padrao que ja produziu os 89 senadores e o descarte mudo de votos. O prefixo
// esta sempre no dado, entao a casa e sempre derivavel.
// `preposicao` existe porque o artigo varia por casa e montar na mao produz "no plenario de
// Camara". Mesmo motivo do `nomeCom` em assembleias.js.
export const CASAS_VOTACAO = [
  { chave: 'camara', nome: 'Câmara dos Deputados', curto: 'Câmara', ambito: 'Federal', preposicao: 'da' },
  { chave: 'senado', nome: 'Senado Federal', curto: 'Senado', ambito: 'Federal', preposicao: 'do' },
  { chave: 'rs', nome: 'Assembleia Legislativa do RS', curto: 'Assembleia do RS', ambito: 'Estadual', preposicao: 'da' },
];

export const casaVotacaoPorChave = (chave) => CASAS_VOTACAO.find((c) => c.chave === chave) || null;

export function casaDaVotacao(v) {
  const id = String((v && (v.votacao_id_externa || v.chave)) || '');
  if (id.startsWith('SF-')) return casaVotacaoPorChave('senado');
  if (id.startsWith('ALERGS-')) return casaVotacaoPorChave('rs');
  return casaVotacaoPorChave('camara');
}

export const hrefVotacoesDaCasa = (chave) => `/votacoes/${chave}`;
