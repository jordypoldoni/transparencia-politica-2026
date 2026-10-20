// Card de cobrança (18/10/2026, B6; ideia I3, forma 1): um FATO oficial + fonte + data + uma pergunta.
//
// REGRAS (D-003, revista na D-057 em 20/10/2026):
// - O FATO é só dado oficial já exibido no perfil (um voto registrado ou o gasto do ano) e a fonte vai junto.
// - A PERGUNTA é padrão (a mesma para todos os parlamentares), mas o cidadão pode trocar por uma pergunta
//   ou mensagem dele, com salvaguardas: até 140 caracteres, sem ofensa, sem acusação, sem endereço de
//   internet, e-mail ou telefone. No card ela vem rotulada "PERGUNTA DE UM CIDADÃO", separada do fato.
// - Não acusa e não conclui: o card pede que o parlamentar explique.
// Peça pura, sem rede nem tela. O desenho do card (canvas) fica em cartaoCobranca.js. Por isso tem teste.

import { dataBr } from './datas.js';
import { reais } from './bancadaEstado.js';

export const PERGUNTA_VOTO = 'Pode explicar o voto?';
export const PERGUNTA_GASTO = 'Pode detalhar como a verba foi usada?';
export const AVISO_PADRAO = 'Pergunta-padrão: a mesma para todos os parlamentares.';
export const AVISO_CIDADAO = 'Pergunta escrita por um cidadão. Os dados acima vêm de fonte oficial.';
export const LIMITE_PERGUNTA = 140;
export const MINIMO_PERGUNTA = 8;

const norm = (s) => String(s || '').normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();

// Corta no fim de uma frase, ou numa palavra, sem passar de n caracteres.
const corta = (s, n) => {
  const x = String(s || '').replace(/\s+/g, ' ').trim();
  if (x.length <= n) return x;
  const base = x.slice(0, n - 1);
  const ponto = Math.max(base.lastIndexOf('. '), base.lastIndexOf('; '));
  if (ponto > n * 0.55) return `${base.slice(0, ponto + 1)}`;
  const espaco = base.lastIndexOf(' ');
  return `${(espaco > n * 0.6 ? base.slice(0, espaco) : base).trimEnd()}…`;
};

// Ofensas e acusações que o card não carrega. É uma barreira prática, não perfeita: o objetivo é que o
// card com a marca do Lume e a fonte oficial não vire veículo de xingamento ou de acusação sem prova.
const BLOQUEADAS = [
  'ladrao', 'ladroes', 'ladra', 'roubou', 'roubando', 'roubo', 'rouba', 'roubar', 'corrupto', 'corrupta', 'corrupcao',
  'vagabundo', 'vagabunda', 'safado', 'safada', 'bandido', 'bandida', 'canalha', 'lixo', 'picareta', 'pilantra',
  'estelionatario', 'criminoso', 'criminosa', 'genocida', 'vergonha', 'nojento', 'nojenta', 'idiota', 'burro', 'burra',
  'imbecil', 'cretino', 'cretina', 'merda', 'porra', 'caralho', 'puta', 'puto', 'fdp', 'desgraca', 'desgracado',
  'covarde', 'mentiroso', 'mentirosa', 'mentira', 'traidor', 'traidora', 'traiu', 'parasita', 'verme', 'miseravel',
  'otario', 'otaria', 'babaca', 'palhaco', 'palhaca', 'inutil', 'sem vergonha', 'filho da', 'vai se', 'morra', 'morrer',
  'matar', 'mate', 'culpado', 'culpada', 'absurdo',
];

// Devolve { ok, texto } quando serve, ou { ok: false, motivo } com a frase que o cidadão vê.
export function validarPergunta(bruto) {
  const texto = String(bruto || '').replace(/\s+/g, ' ').trim();
  if (texto.length < MINIMO_PERGUNTA) return { ok: false, motivo: `Escreva pelo menos ${MINIMO_PERGUNTA} caracteres.` };
  if (texto.length > LIMITE_PERGUNTA) return { ok: false, motivo: `Use no máximo ${LIMITE_PERGUNTA} caracteres.` };
  const n = norm(texto);
  if (/https?:|www\.|\.com\b|\.br\b|\.net\b|\.org\b|\.gov\b|\bbit\.ly/.test(n)) return { ok: false, motivo: 'Não coloque endereços de internet no texto.' };
  if (/@|\S+\s?\(?arroba\)?\s?\S+\.\S+/.test(n)) return { ok: false, motivo: 'Não coloque e-mail nem perfil de rede social no texto.' };
  if (/\d[\d .()-]{7,}\d/.test(n)) return { ok: false, motivo: 'Não coloque telefone nem números de documento no texto.' };
  const palavras = n.replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ');
  const casada = BLOQUEADAS.some((w) => new RegExp(`(^| )${w}( |$)`).test(palavras));
  if (casada) return { ok: false, motivo: 'O texto tem uma ofensa ou uma acusação. Reescreva como uma pergunta sobre o fato mostrado.' };
  const letras = texto.replace(/[^A-Za-zÀ-ÿ]/g, '');
  if (letras.length > 20 && letras === letras.toUpperCase()) return { ok: false, motivo: 'Evite escrever tudo em maiúsculas.' };
  return { ok: true, texto };
}

const quem = (perfil) => `${perfil.nome_urna} (${[perfil.partido_atual, perfil.uf_sede].filter(Boolean).join('-')})`;
const partidoUf = (perfil) => [perfil.partido_atual, perfil.uf_sede].filter(Boolean).join(' · ');

// Resolve a pergunta: a do cidadão (se válida e diferente da padrão) ou a padrão.
function resolvePergunta(pergunta, padrao) {
  const p = String(pergunta || '').replace(/\s+/g, ' ').trim();
  if (!p || norm(p) === norm(padrao)) return { pergunta: padrao, personalizada: false };
  const v = validarPergunta(p);
  return v.ok ? { pergunta: v.texto, personalizada: true } : { pergunta: padrao, personalizada: false };
}

const identidade = (perfil) => ({ nome: perfil.nome_urna, cargo: perfil.cargo_atual || '', partidoUf: partidoUf(perfil), slug: perfil.slug || 'politico' });

// voto: { voto_tipo, data_voto }; titulo: resumo em linguagem comum (ou ementa) da matéria votada.
// materia: "PL 4921/2026"; etapa: "Urgência"; resultado: "Aprovado no plenário" (os três são opcionais).
export function montarCobrancaVoto({ perfil, voto, titulo, fonteNome, pergunta, materia, etapa, resultado }) {
  if (!perfil || !voto || !voto.voto_tipo) return null;
  const data = dataBr(voto.data_voto);
  const resumo = corta(titulo, 230) || 'Votação nominal';
  const rotuloMateria = [materia, etapa].filter(Boolean).join(' · ');
  const fonte = `Fonte: ${fonteNome}`;
  const p = resolvePergunta(pergunta, PERGUNTA_VOTO);
  const onde = rotuloMateria ? `${rotuloMateria}: ` : '';
  const sufixo = p.personalizada ? `Pergunta de um cidadão: "${p.pergunta}"` : p.pergunta;
  return {
    tipo: 'voto',
    ...identidade(perfil),
    rotulo: `VOTO REGISTRADO${data ? ` · ${data}` : ''}`,
    quem: quem(perfil),
    fato: `${perfil.nome_urna} votou ${voto.voto_tipo}`,
    votoTipo: voto.voto_tipo,
    resultado: resultado || '',
    materia: rotuloMateria,
    contexto: resumo,
    data,
    pergunta: p.pergunta,
    personalizada: p.personalizada,
    fonte,
    aviso: p.personalizada ? AVISO_CIDADAO : AVISO_PADRAO,
    texto: `${quem(perfil)} votou ${voto.voto_tipo}${data ? ` em ${data}` : ''}${resultado ? ` (${resultado.toLowerCase()})` : ''}. ${onde}${resumo} ${sufixo} ${fonte}.`,
  };
}

// gasto: { ano, total, media, pctTeto, teto, notas } (pctTeto/teto podem ser null onde o Lume não tem o teto).
export function montarCobrancaGasto({ perfil, ano, total, media, pctTeto, teto, notas, fonteNome, pergunta }) {
  if (!perfil || !(Number(total) > 0)) return null;
  const partes = [`Média de ${reais(media)} por mês`];
  if (pctTeto != null) partes.push(`${pctTeto}% do teto mensal${teto ? ` do estado (${reais(teto)})` : ''}`);
  const fonte = `Fonte: ${fonteNome}`;
  const p = resolvePergunta(pergunta, PERGUNTA_GASTO);
  const sufixo = p.personalizada ? `Pergunta de um cidadão: "${p.pergunta}"` : p.pergunta;
  return {
    tipo: 'gasto',
    ...identidade(perfil),
    rotulo: `VERBA PÚBLICA DE MANDATO · ${ano}`,
    quem: quem(perfil),
    fato: `${perfil.nome_urna} usou ${reais(total)}`,
    destaque: reais(total),
    notas: Number(notas) > 0 ? `em ${notas} ${Number(notas) === 1 ? 'nota fiscal' : 'notas fiscais'}` : '',
    contexto: `${partes.join(', ')}.`,
    rotuloContexto: pctTeto != null ? 'EM COMPARAÇÃO COM O TETO' : 'MÉDIA MENSAL',
    data: String(ano),
    pergunta: p.pergunta,
    personalizada: p.personalizada,
    fonte,
    aviso: p.personalizada ? AVISO_CIDADAO : AVISO_PADRAO,
    texto: `${quem(perfil)} usou ${reais(total)} da verba de mandato em ${ano} (${partes.join(', ')}). ${sufixo} ${fonte}.`,
  };
}
