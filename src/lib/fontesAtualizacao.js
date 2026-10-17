// Catalogo das fontes que o site mostra na secao "Como atualizamos os dados" (T10 / D-036).
// A FREQUENCIA e escrita aqui a mao e precisa bater com os workflows de .github/workflows/:
//   coletar.yml        diario 06:17 (Brasilia): votos Camara/Senado, gastos Camara/Senado/SP,
//                      proposicoes, pedidos de CPI; indicacoes do Executivo so na segunda-feira
//   coletar_alergs.yml segunda 07:17 (votos) e dia 8 de cada mes 07:47 (votos e gastos)
//   coletar_fiscal.yml diario 07:41 (fichas do TSE, ate 01/11/2026); siconfi a cada 2 meses
// As DATAS vem da tabela fonte_status (cada coletor grava a sua linha no fim da rodada).
// `fonte` e `escopo` aqui sao os mesmos que o coletor passa a registrarStatus().
// `mes: true` = a fonte publica por mes fechado, entao "dados ate" aparece como mes/ano.
export const GRUPOS = [
  { titulo: 'Gastos', itens: [
    { fonte: 'gastos_camara', nome: 'Câmara dos Deputados (CEAP)', frequencia: 'Todo dia' },
    { fonte: 'gastos_senado', nome: 'Senado Federal (CEAPS)', frequencia: 'Todo dia' },
    { fonte: 'gastos_alesp', escopo: 'SP', nome: 'Assembleia de São Paulo', frequencia: 'Todo dia', mes: true },
    { fonte: 'gastos_alergs', escopo: 'RS', nome: 'Assembleia do Rio Grande do Sul', frequencia: 'Todo dia 8', mes: true },
    { fonte: 'gastos_almg', escopo: 'MG', nome: 'Assembleia de Minas Gerais', frequencia: 'Sem rotina fixa ainda' },
  ] },
  { titulo: 'Votações', itens: [
    { fonte: 'votos_camara', nome: 'Câmara dos Deputados', frequencia: 'Todo dia' },
    { fonte: 'votos_senado', nome: 'Senado Federal', frequencia: 'Todo dia' },
    { fonte: 'votos_alergs', escopo: 'RS', nome: 'Assembleia do Rio Grande do Sul', frequencia: 'Toda segunda' },
  ] },
  { titulo: 'Propostas, CPIs e indicações', itens: [
    { fonte: 'proposicoes', nome: 'Proposições de deputados e senadores', frequencia: 'Todo dia' },
    { fonte: 'pedidos_cpi_camara', nome: 'Pedidos de CPI na Câmara', frequencia: 'Todo dia' },
    { fonte: 'indicacoes_executivo', nome: 'Indicações do Executivo', frequencia: 'Toda segunda' },
  ] },
  { titulo: 'Candidatos 2026', itens: [
    { fonte: 'ficha_presidenciaveis', nome: 'Presidenciáveis (ficha do TSE)', frequencia: 'Todo dia, até 01/11' },
    { fonte: 'candidatos_governador', nome: 'Governadores (ficha do TSE)', frequencia: 'Todo dia, até 01/11' },
    { fonte: 'candidatos_senador', nome: 'Senadores (ficha do TSE)', frequencia: 'Todo dia, até 01/11' },
    { fonte: 'ficha_deputado_federal', nome: 'Deputados federais (ficha do TSE)', frequencia: 'Todo dia, até 01/11' },
  ] },
  { titulo: 'Contas públicas', itens: [
    { fonte: 'fiscal_siconfi', escopo: 'tudo', nome: 'Panorama fiscal (Tesouro Nacional)', frequencia: 'A cada 2 meses' },
  ] },
];

const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

// "2026-07-31" -> "jul/2026" (fonte mensal) ou "31/07/2026". null quando a fonte nao informa.
export function formatarDadosAte(iso, mensal) {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso || '');
  if (!m) return null;
  return mensal ? `${MESES[Number(m[2]) - 1]}/${m[1]}` : `${m[3]}/${m[2]}/${m[1]}`;
}

// Junta o catalogo com as linhas de fonte_status. `linhas` pode ser vazio ou null (banco fora do ar):
// cada item entao sai sem data, e a tela diz "ainda sem registro" em vez de inventar uma.
export function montarGrupos(linhas) {
  const porChave = new Map((linhas || []).map((l) => [`${l.fonte}|${l.escopo || ''}`, l]));
  return GRUPOS.map((g) => ({
    titulo: g.titulo,
    itens: g.itens.map((i) => {
      const l = porChave.get(`${i.fonte}|${i.escopo || ''}`);
      return {
        nome: i.nome, frequencia: i.frequencia,
        coletadoEm: l?.coletado_em || null,
        dadosAte: formatarDadosAte(l?.dados_ate, i.mes),
      };
    }),
  }));
}

// Leitura no servidor (service_role). Nunca derruba a pagina: erro vira lista vazia.
export async function lerFonteStatus() {
  try {
    const { createClient } = await import('@supabase/supabase-js');
    const banco = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
    const { data, error } = await banco.from('fonte_status').select('fonte, escopo, coletado_em, dados_ate');
    if (error) throw error;
    return data || [];
  } catch (e) {
    console.warn('fonte_status indisponivel:', e.message);
    return [];
  }
}
