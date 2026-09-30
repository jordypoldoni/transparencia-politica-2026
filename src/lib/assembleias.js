// Uma aba por assembleia. Cada casa publica uma coisa diferente, e a página diz isso na cara do
// usuário em vez de deixar parecer que falta dado por descuido: SP abre gasto de gabinete e NÃO
// divulga voto nominal; o RS abre o voto e não expõe o gasto por deputado no mesmo formato.
// Para entrar com um novo estado, acrescente uma linha aqui (e o mapeamento no servico_api).
// `gastoDetalhado` separa DUAS coisas que parecem uma só: ter o gasto e ter a NOTA.
// SP publica nota a nota, com fornecedor e CNPJ. O RS publica só o total do mês por categoria —
// dá pra dizer quanto e em quê, nunca para quem. A tela precisa falar isso, senão o usuário
// clica esperando a nota e conclui que o site escondeu.
// `nomeCom` carrega a preposição junto com o nome do estado ("de São Paulo", "do Rio Grande
// do Sul"): o artigo varia por estado e montar isso na mão dá "de Rio Grande do Sul".
export const ASSEMBLEIAS = [
  { casa: 'Assembleia (SP)', uf: 'SP', sigla: 'ALESP', nomeCom: 'de São Paulo', gastos: true, gastoDetalhado: true, votos: false },
  { casa: 'Assembleia (RS)', uf: 'RS', sigla: 'AL-RS', nomeCom: 'do Rio Grande do Sul', gastos: true, gastoDetalhado: false, votos: true },
  // MG (30/09/2026): a ALMG publica a verba indenizatória nota a nota, com fornecedor e CNPJ,
  // pela API de dados abertos (coletor_almg.js, anos 2025 e 2026). Os votos ainda não foram
  // levantados: `votosPendentes` faz a tela dizer "ainda não entraram no site", e não "a
  // assembleia não divulga", que seria afirmar sobre a ALMG algo que não conferimos.
  // `verba`: o nome que a própria casa dá ao dinheiro (em MG não é "verba de gabinete").
  { casa: 'Assembleia (MG)', uf: 'MG', sigla: 'ALMG', nomeCom: 'de Minas Gerais', gastos: true, gastoDetalhado: true, votos: false, votosPendentes: true, verba: 'verba indenizatória' },
];
export const verbaDe = (a) => (a && a.verba) || 'verba de gabinete';
export const assembleiaDe = (casa) => ASSEMBLEIAS.find((a) => a.casa === casa) || null;

export const assembleiaPorUf = (uf) => ASSEMBLEIAS.find((a) => a.uf === String(uf || '').toUpperCase()) || null;

// Endereco de cada lista. Desde 12/09/2026 cada aba e uma rota de verdade: antes as tres
// telas (federais, SP, RS) dividiam a URL /deputados, entao nao dava para mandar o link dos
// estaduais do RS para ninguem, recarregar voltava para federais, e o Google so enxergava a
// aba federal - as outras duas nao existiam para ele.
// Desde 29/09/2026 os estaduais sao UMA pagina (/deputados-estaduais), com o ranking do pais e
// o estado escolhido abaixo dele; a lista de uma assembleia e essa pagina com ?uf=.
export function caminhoDaCasa(casa) {
  if (casa === 'Senado') return '/senadores';
  if (casa === 'Estaduais') return '/deputados-estaduais';
  const a = assembleiaDe(casa);
  return a ? `/deputados-estaduais?uf=${a.uf}` : '/deputados';
}
