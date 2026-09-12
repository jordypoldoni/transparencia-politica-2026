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
