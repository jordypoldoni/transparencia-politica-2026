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
