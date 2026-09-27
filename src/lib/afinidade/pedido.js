// Validação do pedido das duas rotas da afinidade (parlamentares e candidatos): estado válido e
// ao menos uma resposta "a favor" ou "contra". Perguntas desconhecidas são descartadas.
import { perguntaPorId } from '../perguntasAfinidade.js';

const UFS = new Set('AC AL AP AM BA CE DF ES GO MA MT MS MG PA PB PR PE PI RJ RN RS RO RR SC SP SE TO'.split(' '));

export function lerPedido(body) {
  const uf = String(body?.uf || '').toUpperCase();
  const respostas = {};
  for (const [id, r] of Object.entries(body?.respostas || {})) {
    if (perguntaPorId(id) && ['a_favor', 'contra', 'sem_opiniao'].includes(r)) respostas[id] = r;
  }
  if (!UFS.has(uf)) return { erro: 'estado inválido' };
  if (!Object.values(respostas).some((r) => r !== 'sem_opiniao')) return { erro: 'responda ao menos uma pergunta com a favor ou contra' };
  return { uf, respostas };
}
