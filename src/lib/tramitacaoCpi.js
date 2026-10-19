// Resumo da tramitacao de um pedido de CPI (19/10/2026). Funcao pura, testada em
// tests/tramitacaoCpi.test.mjs.
//
// POR QUE RESUMIR: a Camara registra cada requerimento de inclusao ou retirada de assinatura como
// uma movimentacao (RCP 1/2026: 15 das 20). Listar tudo enterra o que importa; os pedidos de 2023
// tem 200 a 630 movimentacoes. Regra, so contagem e texto da propria fonte, sem interpretar:
//  - tipo de movimentacao com ate 3 registros: cada um aparece, com o despacho oficial e a sua data;
//  - tipo com mais de 3 registros: UMA linha "N <nome no plural>", do primeiro ao ultimo dia.
// A lista completa fica na pagina do pedido; aqui so o resumo.

const MAX_ITENS = 8;
const MAX_TEXTO = 300;

// Nome do tipo (cod_tipo da Camara) no singular e no plural, para a linha agrupada.
// Tipo desconhecido cai no texto generico com o nome oficial, nunca some.
const ROTULOS = {
  '194': ['requerimento apresentado', 'requerimentos apresentados'],
  '195': ['requerimento aprovado', 'requerimentos aprovados'],
  '100': ['documento apresentado', 'documentos apresentados'],
  '1042': ['relatório de conferência de assinaturas', 'relatórios de conferência de assinaturas'],
  '611': ['documento publicado', 'documentos publicados'],
  '203': ['notificação de despacho', 'notificações de despacho'],
  '1005': ['notificação', 'notificações'],
  '110': ['distribuição', 'distribuições'],
  '605': ['despacho publicado', 'despachos publicados'],
  '431': ['declaração de voto em separado', 'declarações de voto em separado'],
};

// O despacho de apresentacao cita a ementa entre aspas ("..., que \"Requer a criacao de...\""). Quando a
// citacao e so a ementa do proprio pedido (que a tela ja mostra no cartao), ela sai do texto; citacao
// diferente (ex.: o assunto de um oficio) fica. Nada e reescrito: so se tira o trecho repetido.
const norm = (v) => String(v || '').toLowerCase().replace(/\s+/g, ' ').replace(/[.\s]+$/, '').trim();
export function semEmentaRepetida(despacho, ementa) {
  const m = /^(.*?),?\s+que\s+"([^"]+)"\.?\s*$/s.exec(String(despacho || '').trim());
  if (!m) return despacho;
  const citado = norm(m[2]);
  if (citado.length < 20 || !norm(ementa).includes(citado)) return despacho;
  return `${m[1].replace(/[ ,;:.]+$/, '')}.`;
}

const dia = (dh) => String(dh || '').slice(0, 10);

function cortar(texto, max = MAX_TEXTO) {
  const t = String(texto || '').replace(/\s+/g, ' ').trim();
  if (t.length <= max) return t;
  const corte = t.slice(0, max);
  const espaco = corte.lastIndexOf(' ');
  return `${(espaco > max * 0.6 ? corte.slice(0, espaco) : corte).replace(/[ ,;:.]+$/, '')}…`;
}

function textoAgrupado(n, tipo, cod) {
  const r = ROTULOS[String(cod)];
  if (r) return `${n} ${n === 1 ? r[0] : r[1]}`;
  return `${n} movimentações do tipo "${tipo || 'não informado'}"`;
}

// movs: [{ ordem, data_hora, tipo, cod_tipo, despacho }] de UM pedido.
export function resumirTramitacao(movs, { max = MAX_ITENS, ementa = '' } = {}) {
  const lista = [...(movs || [])].sort((a, b) => a.ordem - b.ordem);
  const grupos = new Map();
  for (const m of lista) {
    const chave = m.cod_tipo || m.tipo || '?';
    if (!grupos.has(chave)) grupos.set(chave, []);
    grupos.get(chave).push(m);
  }
  const entradas = [];
  for (const g of grupos.values()) {
    if (g.length <= 3) {
      for (const m of g) {
        entradas.push({ ordem: m.ordem, inicio: dia(m.data_hora), fim: dia(m.data_hora), n: 1, texto: cortar(semEmentaRepetida(m.despacho, ementa) || m.tipo) });
      }
    } else {
      entradas.push({
        ordem: g[0].ordem, inicio: dia(g[0].data_hora), fim: dia(g[g.length - 1].data_hora), n: g.length,
        texto: textoAgrupado(g.length, g[0].tipo, g[0].cod_tipo),
      });
    }
  }
  entradas.sort((a, b) => (a.inicio < b.inicio ? -1 : a.inicio > b.inicio ? 1 : a.ordem - b.ordem));
  const itens = entradas.slice(0, max).map(({ ordem, ...resto }) => resto);
  const mostrados = itens.reduce((s, x) => s + x.n, 0);
  return { total: lista.length, itens, restantes: lista.length - mostrados };
}
