import { t } from '../src/estilo/tokens';
import { Seta } from './icones';

// Paginacao do site, fonte UNICA (28/09/2026). Existia escrita duas vezes, em /deputados e em
// /candidatos-2026, com arranjos diferentes.
//
// 21/10/2026 (pedido do Jordy): tudo numa linha so e sem fundo. Os botoes viram texto dourado com seta
// (ouroTexto, que tem contraste legivel no fundo claro), e "Mostrando X a Y de Z" fica a esquerda, na
// mesma linha, com Anterior, a pagina e Proxima centralizados (grade 1fr auto 1fr). No celular nao ha
// espaco para os dois: o "Mostrando" desce para baixo, centralizado (CSS .paginacao-linha em _app.js).
// `detalhe` (opcional) e o texto "mostrando X a Y de Z".
export default function Paginacao({ pagina, total, aoMudar, detalhe = null, margem = '28px 0 0' }) {
  if (!total || total <= 1) return null;
  const totalTexto = total.toLocaleString('pt-BR');
  const semAnterior = pagina <= 1;
  const semProxima = pagina >= total;
  return (
    <nav aria-label="Paginação" style={{ margin: margem }}>
      <div className="paginacao-linha">
        {detalhe ? <p className="paginacao-detalhe" style={{ color: t.cor.cinza }}>{detalhe}</p> : <span />}
        <div className="paginacao">
          <button type="button" className="paginacao-botao" disabled={semAnterior} onClick={() => aoMudar(pagina - 1)}>
            <Seta direcao="esquerda" size={16} cor={t.cor.ouroTexto} />Anterior
          </button>
          <span className="paginacao-info" aria-live="polite" style={{ color: t.cor.cinza }}>
            <span className="pg-rotulo">Página </span>
            <strong style={{ color: t.cor.tinta, fontWeight: 700 }}>{pagina} de {totalTexto}</strong>
          </span>
          <button type="button" className="paginacao-botao" disabled={semProxima} onClick={() => aoMudar(pagina + 1)}>
            Próxima<Seta direcao="direita" size={16} cor={t.cor.ouroTexto} />
          </button>
        </div>
        <span />
      </div>
    </nav>
  );
}
