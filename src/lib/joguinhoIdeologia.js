// Joguinho "Para onde suas respostas apontam?" (23/10/2026).
// NÃO é pesquisa nem o método do Datafolha: é uma brincadeira educativa com 12 frases, 6 de
// economia e 6 de costumes (os dois eixos que o Datafolha e o gráfico de Nolan usam). Cada eixo
// tem 3 frases que "puxam" para cada lado, para que concordar com tudo dê centro (evita o viés
// de concordar por reflexo). O resultado fica SÓ no aparelho da pessoa (opinião política é dado
// sensível na LGPD); salvar no perfil exige etapa própria, com consentimento.
// Regra do Jordy: nada de travessão nos textos do site.

// lado: 'direita' = concordar empurra para a direita do eixo; 'esquerda' = empurra para a esquerda.
export const FRASES = [
  { id: 'e1', eixo: 'economia', lado: 'esquerda', texto: 'O governo deve garantir serviços públicos gratuitos, mesmo que isso exija pagar mais impostos.' },
  { id: 'c1', eixo: 'costumes', lado: 'direita', texto: 'Adolescentes que cometem crimes graves devem ser punidos com as mesmas regras dos adultos.' },
  { id: 'e2', eixo: 'economia', lado: 'direita', texto: 'Empresas estatais tendem a funcionar melhor quando passam para a iniciativa privada.' },
  { id: 'c2', eixo: 'costumes', lado: 'esquerda', texto: 'A homossexualidade deve ser aceita por toda a sociedade.' },
  { id: 'e3', eixo: 'economia', lado: 'esquerda', texto: 'Quem ganha muito deve pagar proporcionalmente mais imposto do que quem ganha pouco.' },
  { id: 'c3', eixo: 'costumes', lado: 'direita', texto: 'Valores religiosos deveriam orientar mais as leis do país.' },
  { id: 'e4', eixo: 'economia', lado: 'direita', texto: 'Regras trabalhistas mais flexíveis ajudam a gerar mais empregos.' },
  { id: 'c4', eixo: 'costumes', lado: 'esquerda', texto: 'O uso de maconha deveria ser descriminalizado.' },
  { id: 'e5', eixo: 'economia', lado: 'esquerda', texto: 'Programas de transferência de renda, como o Bolsa Família, devem ser ampliados.' },
  { id: 'c5', eixo: 'costumes', lado: 'direita', texto: 'Os cidadãos deveriam ter mais facilidade para comprar armas de fogo.' },
  { id: 'e6', eixo: 'economia', lado: 'direita', texto: 'O Estado atrapalha mais do que ajuda quando interfere na economia.' },
  { id: 'c6', eixo: 'costumes', lado: 'esquerda', texto: 'A mulher deve poder decidir sobre interromper a gravidez até certo prazo da gestação.' },
];

// Respostas: valor de -2 (discordo muito) a +2 (concordo muito).
export const OPCOES = [
  { valor: -2, rotulo: 'Discordo muito' },
  { valor: -1, rotulo: 'Discordo' },
  { valor: 0, rotulo: 'Depende' },
  { valor: 1, rotulo: 'Concordo' },
  { valor: 2, rotulo: 'Concordo muito' },
];

export const FAIXAS = ['Esquerda', 'Centro-esquerda', 'Centro', 'Centro-direita', 'Direita'];

// Média de um eixo (-2 = esquerda, +2 = direita). Concordar com frase "de esquerda" vale negativo.
export function mediaEixo(respostas, eixo) {
  const f = FRASES.filter((x) => x.eixo === eixo);
  const respondidas = f.filter((x) => Number.isFinite(respostas[x.id]));
  if (respondidas.length === 0) return 0;
  const soma = respondidas.reduce((s, x) => s + (x.lado === 'direita' ? 1 : -1) * respostas[x.id], 0);
  return soma / respondidas.length;
}

// Faixa a partir da média: cortes simétricos em torno de zero.
export function faixaDaMedia(m) {
  if (m <= -1.2) return 0;
  if (m <= -0.4) return 1;
  if (m < 0.4) return 2;
  if (m < 1.2) return 3;
  return 4;
}

export function resultado(respostas) {
  const economia = mediaEixo(respostas, 'economia');
  const costumes = mediaEixo(respostas, 'costumes');
  const geral = (economia + costumes) / 2;
  return {
    economia, costumes, geral,
    faixaEconomia: faixaDaMedia(economia),
    faixaCostumes: faixaDaMedia(costumes),
    faixaGeral: faixaDaMedia(geral),
  };
}

// Posição 0..100 para o marcador (0 = esquerda, 100 = direita).
export const posicao = (m) => Math.round(((Math.max(-2, Math.min(2, m)) + 2) / 4) * 100);
