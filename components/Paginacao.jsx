import { t } from '../src/estilo/tokens';
import { pilulaPagina, realcePagina } from '../src/estilo/botoes';

// Paginacao do site, fonte UNICA (28/09/2026). Existia escrita duas vezes, em /deputados e em
// /candidatos-2026, com arranjos diferentes. No celular a de /candidatos-2026 quebrava:
// "Anterior" e "Pagina 3 de 22" numa linha e "Proxima" sozinho embaixo, porque os dois botoes
// com largura minima de 124px mais o texto passavam da tela (achado do Jordy no iPhone).
//
// Arranjo: Anterior, o indicador de pagina e Proxima, sempre na MESMA linha e juntos no centro.
// No celular (CSS .paginacao em _app.js) os botoes perdem a largura minima e o indicador vira
// duas linhas ("Pagina" pequeno em cima, "3 de 22" embaixo), o que cabe em 320px.
// `detalhe` (opcional) e a linha "mostrando X a Y de Z", que fica embaixo, centralizada.
export default function Paginacao({ pagina, total, aoMudar, detalhe = null, margem = '28px 0 0' }) {
  if (!total || total <= 1) return null;
  const botao = (desativado) => {
    // Largura minima e respiro lateral saem do estilo escrito e vao para o CSS, senao o media
    // query do celular nao consegue mexer neles (estilo no elemento vence o CSS).
    const { minWidth, padding, ...resto } = pilulaPagina(desativado);
    return resto;
  };
  const totalTexto = total.toLocaleString('pt-BR');
  return (
    <nav aria-label="Paginação" style={{ margin: margem }}>
      <div className="paginacao">
        <button type="button" className="paginacao-botao" disabled={pagina <= 1} onClick={() => aoMudar(pagina - 1)}
          style={botao(pagina <= 1)}
          onMouseOver={(e) => realcePagina(e, true)} onMouseOut={(e) => realcePagina(e, false)}>
          Anterior
        </button>
        <span className="paginacao-info" aria-live="polite" style={{ color: t.cor.cinza }}>
          <span className="pg-rotulo">Página </span>
          <strong style={{ color: t.cor.tinta, fontWeight: 700 }}>{pagina} de {totalTexto}</strong>
        </span>
        <button type="button" className="paginacao-botao" disabled={pagina >= total} onClick={() => aoMudar(pagina + 1)}
          style={botao(pagina >= total)}
          onMouseOver={(e) => realcePagina(e, true)} onMouseOut={(e) => realcePagina(e, false)}>
          Próxima
        </button>
      </div>
      {detalhe && (
        <p style={{ margin: '10px 0 0', textAlign: 'center', fontSize: '0.8rem', color: t.cor.cinza }}>{detalhe}</p>
      )}
    </nav>
  );
}
