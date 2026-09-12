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
];
export const assembleiaDe = (casa) => ASSEMBLEIAS.find((a) => a.casa === casa) || null;

export const assembleiaPorUf = (uf) => ASSEMBLEIAS.find((a) => a.uf === String(uf || '').toUpperCase()) || null;

// Endereco de cada lista. Desde 12/09/2026 cada aba e uma rota de verdade: antes as tres
// telas (federais, SP, RS) dividiam a URL /deputados, entao nao dava para mandar o link dos
// estaduais do RS para ninguem, recarregar voltava para federais, e o Google so enxergava a
// aba federal - as outras duas nao existiam para ele.
export function caminhoDaCasa(casa) {
  if (casa === 'Senado') return '/senadores';
  const a = assembleiaDe(casa);
  return a ? `/deputados/${a.uf.toLowerCase()}` : '/deputados';
}
