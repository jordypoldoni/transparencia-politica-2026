// Tradução de votações por REGRA (sem IA): status + explicação do tipo, em linguagem cidadã.

export function humanizarVotacao(v) {
  const txt = v.descricao_votacao || '';
  const m = txt.match(/sim:\s*(\d+)[^]*?n[ãa]o:\s*(\d+)/i);
  const sim = m ? parseInt(m[1], 10) : null;
  const nao = m ? parseInt(m[2], 10) : null;
  const mAbs = txt.match(/absten[çc][ãa]o:\s*(\d+)/i);
  const abs = mAbs ? parseInt(mAbs[1], 10) : null;
  let status = v.aprovacao === 1 ? 'Aprovado' : v.aprovacao === 0 ? 'Rejeitado'
    : (sim != null && nao != null ? (sim > nao ? 'Aprovado' : 'Rejeitado') : null);
  const limpo = txt
    .replace(/\bsim:\s*\d+[^]*$/i, '')
    .replace(/\([^)]*\)/g, '')
    .replace(/\s+/g, ' ').trim().replace(/[.;]\s*$/, '');
  return { status, sim, nao, abs, limpo };
}

// Explica o TIPO da votação SEMPRE nomeando o termo primeiro (pra quem "não conhece o azul").
// Retorna { termo, texto }: o termo é "o que é isso"; o texto é a explicação.
export function explicarTipo(descricao) {
  const d = (descricao || '').toLowerCase();
  if (d.includes('requerimento de urg') || d.includes('urgência') || d.includes('urgencia'))
    return { termo: 'Requerimento de Urgência', texto: 'é um pedido para votar uma proposta com prioridade, à frente das demais na ordem normal. Observação: aprovar a urgência ainda não aprova a proposta — apenas acelera a votação dela.' };
  if (d.includes('emenda à constitui') || d.includes('emenda a constitui') || /\bpec\b/.test(d))
    return { termo: 'PEC — Proposta de Emenda à Constituição', texto: 'é uma proposta para mudar a Constituição, a lei máxima do país. Exige apoio reforçado (3/5 dos deputados) e votação em dois turnos.' };
  if (d.includes('medida provis') || /\bmpv?\b/.test(d))
    return { termo: 'MP — Medida Provisória', texto: 'é uma lei urgente editada pelo presidente, que já vale na hora, mas precisa do aval do Congresso para continuar valendo.' };
  if (d.includes('lei complementar') || /\bplp\b/.test(d))
    return { termo: 'PLP — Projeto de Lei Complementar', texto: 'regula temas que a própria Constituição manda detalhar. Exige maioria absoluta (metade de todos os deputados + 1) para passar.' };
  if (d.includes('reda') && d.includes('final'))
    return { termo: 'Redação Final', texto: 'é a votação do texto final já acordado, antes de a proposta seguir para a próxima etapa.' };
  if (d.includes('substitutivo'))
    return { termo: 'Substitutivo', texto: 'é uma versão alternativa do projeto, que substitui o texto original em discussão.' };
  if (d.includes('preferência') || d.includes('preferencia'))
    return { termo: 'Requerimento de Preferência', texto: 'é um pedido para decidir qual versão ou emenda será votada primeiro.' };
  if (d.includes('destaque') || d.includes('mantido o texto') || d.includes('mantida') || /\bdtq\b/.test(d))
    return { termo: 'Destaque', texto: 'é uma votação para manter ou retirar um trecho específico do texto principal.' };
  if (d.includes('recurso'))
    return { termo: 'Recurso', texto: 'é um pedido para o plenário revisar uma decisão tomada anteriormente.' };
  if (d.includes('veto'))
    return { termo: 'Veto', texto: 'é a decisão sobre manter ou derrubar um veto do presidente a uma lei.' };
  if (d.includes('projeto de lei') || /\bpl\b/.test(d))
    return { termo: 'PL — Projeto de Lei', texto: 'é uma proposta para criar ou mudar uma lei comum do país.' };
  return { termo: 'Decisão em plenário', texto: 'é uma decisão tomada no plenário da Câmara. Veja abaixo o que foi votado e quem votou.' };
}

// ===== Agrupamento por matéria (uma proposição = várias votações no processo) =====

const TIPOS_MATERIA = new Set(['PL', 'PLP', 'PEC', 'MPV', 'PDL', 'PLV', 'PLN', 'PDC', 'PDS', 'PLC', 'PLS']);
const ehMateria = (p) => !!p && TIPOS_MATERIA.has(String(p.siglaTipo || '').toUpperCase());

function tituloProp(p) {
  if (!p || !p.siglaTipo || p.numero == null) return null;
  const ano = p.ano && p.ano > 0 ? `/${p.ano}` : '';
  return `${String(p.siglaTipo).toUpperCase()} ${p.numero}${ano}`;
}

const EXTENSO = {
  'projeto de lei complementar': 'PLP', 'projeto de lei': 'PL',
  'proposta de emenda à constituição': 'PEC', 'proposta de emenda a constituicao': 'PEC',
  'medida provisória': 'MPV', 'medida provisoria': 'MPV', 'projeto de decreto legislativo': 'PDL',
};

// Extrai "PL 5490/2025" de texto livre (descrição da votação ou ementa de um requerimento).
export function materiaDeTexto(s) {
  const t = String(s || '');
  let m = t.match(/\b(PLP|PLV|PLC|PLN|PDC|PDS|PDL|PEC|MPV|MP|PL)\s*n?[ºo]?\s*([\d.]+)\s*\/\s*(\d{4})/i);
  if (m) { let sig = m[1].toUpperCase(); if (sig === 'MP') sig = 'MPV'; return `${sig} ${m[2].replace(/\./g, '')}/${m[3]}`; }
  m = t.match(/(projeto de lei complementar|projeto de lei|proposta de emenda à constituição|proposta de emenda a constituicao|medida provisória|medida provisoria|projeto de decreto legislativo)\s+n[ºo]?\s*([\d.]+),?\s*de\s*(\d{4})/i);
  if (m) { const sig = EXTENSO[m[1].toLowerCase()]; if (sig) return `${sig} ${m[2].replace(/\./g, '')}/${m[3]}`; }
  return null;
}

// Resolve a matéria (chave de agrupamento) do detalhe de uma votação da API da Câmara.
// Ordem: proposição afetada → matéria entre os objetos possíveis → parse do texto. Best-effort.
export function resolverMateria(det) {
  const afetadas = det.proposicoesAfetadas || [];
  const afetada = afetadas.find(ehMateria) || afetadas[0];
  if (afetada) return { id: String(afetada.id), sigla: afetada.siglaTipo || null, titulo: tituloProp(afetada), ementa: afetada.ementa || null };
  const objMat = (det.objetosPossiveis || []).find(ehMateria);
  if (objMat) return { id: String(objMat.id), sigla: objMat.siglaTipo || null, titulo: tituloProp(objMat), ementa: objMat.ementa || null };
  const textos = [det.descricao, ...(det.objetosPossiveis || []).map((o) => o && o.ementa)].filter(Boolean).join('  ');
  const titulo = materiaDeTexto(textos);
  if (titulo) return { id: null, sigla: titulo.split(' ')[0], titulo, ementa: null };
  return null;
}

// Papel de uma votação dentro do processo (derivado da descrição) — rótulo da etapa.
export function papelVotacao(descricao) {
  const d = (descricao || '').toLowerCase();
  if (/reda[çc][ãa]o final/.test(d)) return 'Redação final';
  if (/urg[êe]ncia/.test(d)) return 'Urgência';
  if (/retirada de (mat[ée]ria|pauta)/.test(d)) return 'Retirada de pauta';
  if (/adiamento/.test(d)) return 'Adiamento';
  if (/proposta de emenda/.test(d)) return 'Texto principal'; // a PEC em si (não uma emenda avulsa)
  if (/emenda/.test(d)) return 'Emenda';
  if (/destaque|mantido o texto|mantida/.test(d)) return 'Destaque';
  if (/substitutivo/.test(d)) return 'Substitutivo';
  if (/prefer[êe]ncia/.test(d)) return 'Preferência';
  if (/recurso/.test(d)) return 'Recurso';
  if (/veto/.test(d)) return 'Veto';
  if (/projeto de lei|proposta de emenda|medida provis|decreto legislativo/.test(d)) return 'Texto principal';
  if (/requerimento/.test(d)) return 'Requerimento';
  return 'Votação';
}

// Traduz a situação da tramitação (descricaoSituacao da Câmara) para linguagem cidadã.
export function situacaoCidada(situacao) {
  const s = (situacao || '').toLowerCase();
  if (!s) return null;
  if (s.includes('transformad') && s.includes('norma')) return 'Virou lei';
  if (s.includes('vetad') || s.includes('veto')) return 'Vetada';
  if (s.includes('arquivad')) return 'Arquivada';
  if (s.includes('sanç') || s.includes('sanc')) return 'Aguardando sanção';
  if (s.includes('senado')) return 'Enviada ao Senado';
  if (s.includes('câmara dos deputados') || s.includes('camara dos deputados')) return 'Na Câmara dos Deputados';
  if (s.includes('remetida') || s.includes('remessa')) return 'Enviada para revisão';
  if (s.includes('pronta') && s.includes('pauta')) return 'Pronta para votar';
  if (s.includes('devolvid')) return 'Devolvida ao autor';
  if (s.includes('retirad')) return 'Retirada';
  return situacao; // as demais já costumam ser legíveis
}

// Agrupa linhas de `votacoes` por matéria (proposicao_titulo). Órfãs (sem título) viram card próprio.
// Devolve grupos ordenados do mais recente ao mais antigo, com as votações em ordem cronológica.
export function agruparPorMateria(votacoes) {
  const grupos = new Map();
  for (const v of votacoes || []) {
    const tituloV = v.proposicao_titulo && String(v.proposicao_titulo).trim();
    const chave = tituloV || `__solo__${v.votacao_id_externa}`;
    if (!grupos.has(chave)) grupos.set(chave, { chave, titulo: tituloV || null, ementa: null, votacoes: [] });
    const g = grupos.get(chave);
    g.votacoes.push(v);
    if (!g.ementa && v.ementa) g.ementa = v.ementa;
    if (!g.titulo && tituloV) g.titulo = tituloV;
  }
  const lista = [...grupos.values()].map((g) => {
    // Prefere a ementa "real" da matéria (descarta ecos "Votação nominal do..."); pega a mais descritiva.
    const ementas = g.votacoes.map((v) => v.ementa).filter(Boolean);
    const limpas = ementas.filter((e) => !/^vota[çc][ãa]o nominal/i.test(e));
    g.ementa = (limpas.sort((a, b) => b.length - a.length)[0]) || ementas[0] || null;
    // Contexto da matéria (primeiro valor não-nulo entre as votações do grupo).
    const pega = (campo) => { const v = g.votacoes.find((x) => x[campo]); return v ? v[campo] : null; };
    g.keywords = pega('keywords');
    g.situacao = pega('situacao');
    g.regime = pega('regime');
    g.url_inteiro_teor = pega('url_inteiro_teor');
    g.ementa_detalhada = pega('ementa_detalhada');
    g.autor_nome = pega('autor_nome');
    g.proposicao_id = pega('proposicao_id');
    g.votacoes.sort((a, b) => new Date(a.data_voto || 0) - new Date(b.data_voto || 0));
    g.data_recente = g.votacoes.reduce((mx, v) => Math.max(mx, v.data_voto ? new Date(v.data_voto).getTime() : 0), 0);
    g.n = g.votacoes.length;
    return g;
  });
  lista.sort((a, b) => b.data_recente - a.data_recente);
  return lista;
}
