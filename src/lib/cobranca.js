// Card de cobrança (18/10/2026, B6; ideia I3, forma 1): um FATO oficial + fonte + data + uma pergunta-padrão.
//
// REGRAS (D-003, neutralidade):
// - A pergunta é a MESMA para todos os parlamentares. Sem texto livre do usuário, sem adjetivo, sem juízo.
// - O fato é só dado oficial já exibido no perfil (um voto registrado ou o gasto do ano) e a fonte vai junto.
// - Não acusa e não conclui: pede que o parlamentar explique.
// Peça pura, sem rede nem tela. O desenho do card (canvas) fica no componente. Por isso tem teste.

import { dataBr } from './datas.js';
import { reais } from './bancadaEstado.js';

export const PERGUNTA_VOTO = 'Pode explicar o voto?';
export const PERGUNTA_GASTO = 'Pode detalhar como a verba foi usada?';
export const AVISO_PADRAO = 'Pergunta-padrão: a mesma para todos os parlamentares.';

const corta = (s, n) => {
  const x = String(s || '').replace(/\s+/g, ' ').trim();
  return x.length > n ? `${x.slice(0, n - 1).trimEnd()}…` : x;
};

const quem = (perfil) => `${perfil.nome_urna} (${[perfil.partido_atual, perfil.uf_sede].filter(Boolean).join('-')})`;

// voto: { voto_tipo, data_voto }; titulo: resumo ou ementa da matéria votada.
export function montarCobrancaVoto({ perfil, voto, titulo, fonteNome }) {
  if (!perfil || !voto || !voto.voto_tipo) return null;
  const data = dataBr(voto.data_voto);
  const contexto = corta(titulo, 170) || 'Votação nominal';
  const fato = `${perfil.nome_urna} votou ${voto.voto_tipo}`;
  const fonte = `Fonte: ${fonteNome}`;
  return {
    tipo: 'voto',
    rotulo: 'VOTO REGISTRADO',
    quem: quem(perfil),
    fato,
    contexto,
    data,
    pergunta: PERGUNTA_VOTO,
    fonte,
    aviso: AVISO_PADRAO,
    texto: `${quem(perfil)} votou ${voto.voto_tipo}${data ? ` em ${data}` : ''}, na votação: ${contexto} ${PERGUNTA_VOTO} ${fonte}.`,
  };
}

// gasto: { ano, total, media, pctTeto } (pctTeto pode ser null onde o Lume não tem o teto).
export function montarCobrancaGasto({ perfil, ano, total, media, pctTeto, fonteNome }) {
  if (!perfil || !(Number(total) > 0)) return null;
  const partes = [`Média de ${reais(media)} por mês`];
  if (pctTeto != null) partes.push(`${pctTeto}% do teto mensal`);
  const fonte = `Fonte: ${fonteNome}`;
  return {
    tipo: 'gasto',
    rotulo: `GASTO DA VERBA DE MANDATO EM ${ano}`,
    quem: quem(perfil),
    fato: `${perfil.nome_urna} usou ${reais(total)}`,
    contexto: `${partes.join(', ')}.`,
    data: String(ano),
    pergunta: PERGUNTA_GASTO,
    fonte,
    aviso: AVISO_PADRAO,
    texto: `${quem(perfil)} usou ${reais(total)} da verba de mandato em ${ano} (${partes.join(', ')}). ${PERGUNTA_GASTO} ${fonte}.`,
  };
}
