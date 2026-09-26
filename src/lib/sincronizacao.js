// SINCRONIZAÇÃO ENTRE APARELHOS (26/09/2026).
//
// O problema que o Jordy achou: respondeu e favoritou no celular, entrou com a mesma conta no
// computador e não via nada. Duas causas:
//   1) nada DESCIA do perfil para o navegador, fora os favoritos, e só na página /perfil;
//   2) o questionário e a lista de favoritos leem só o navegador.
// Agora esta função roda em QUALQUER página (Layout.jsx): ao abrir o site, ao entrar na conta e
// ao voltar para a aba depois de um tempo. Com sessão E autorização em dia, junta respostas e
// favoritos nos dois sentidos. Sem autorização não faz nada: aí o dado existe só no aparelho,
// por escolha da pessoa, e o menu da conta avisa isso.
import { sessaoAtual, consentimentoEmDia, sincronizarRespostas } from './perfilUsuario';
import { sincronizarFavoritos } from './favoritos';

let emAndamento = null;
let ultima = 0;
const INTERVALO_MIN_MS = 60 * 1000;

export function sincronizarTudo({ forcar = false } = {}) {
  if (emAndamento) return emAndamento;
  if (!forcar && Date.now() - ultima < INTERVALO_MIN_MS) return Promise.resolve(null);
  emAndamento = (async () => {
    try {
      const s = await sessaoAtual().catch(() => null);
      if (!s) return null;
      if (!(await consentimentoEmDia().catch(() => false))) return { semAutorizacao: true };
      const [respostas, favoritos] = await Promise.all([
        sincronizarRespostas().catch(() => ({ subiram: 0, desceram: 0 })),
        sincronizarFavoritos().catch(() => ({ subiram: 0, desceram: 0 })),
      ]);
      ultima = Date.now();
      return { respostas, favoritos };
    } finally {
      emAndamento = null;
    }
  })();
  return emAndamento;
}
