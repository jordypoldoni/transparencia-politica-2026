import { t } from '../src/estilo/tokens';
import { dataBr } from '../src/lib/datas';

// Secao "Como atualizamos os dados" (T10 / D-036), dentro da pagina Entenda.
// Datas sao INFORMACAO, nao botao: texto simples, sem fundo e sem capsula (Diretrizes de Design,
// regra de 17/10/2026). O alinhamento por largura de tela mora no CSS global (_app.js), nunca aqui.
const cartao = { background: t.cor.papelCartao, borderRadius: t.raio.md, padding: '20px 22px', boxShadow: t.sombra.sutil };
const rotulo = { margin: '0 0 4px', fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', color: t.cor.ouroTexto };

export default function AtualizacaoDados({ grupos }) {
  return (
    <section id="atualizacao" style={{ scrollMarginTop: '90px' }}>
      <h2 style={{ fontFamily: t.fonte.titulo, fontWeight: 600, fontSize: '1.6rem', margin: '0 0 8px' }}>Como atualizamos os dados</h2>
      <p style={{ color: t.cor.cinza, fontSize: '1rem', maxWidth: '720px', margin: '0 0 18px', lineHeight: 1.6 }}>
        Cada fonte oficial publica no seu ritmo. Aqui você vê quando fomos buscar e até quando o dado vai.
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(280px, 100%), 1fr))', gap: '14px', marginBottom: '20px' }}>
        <div style={cartao}>
          <p style={rotulo}>Coletado em</p>
          <p style={{ margin: 0, fontSize: '0.95rem', lineHeight: 1.6, color: t.cor.tinta }}>
            O dia em que nosso robô foi até a fonte e conferiu. É como olhar a caixa de correio: ir hoje não faz chegar carta nova.
          </p>
        </div>
        <div style={cartao}>
          <p style={rotulo}>Dados até</p>
          <p style={{ margin: 0, fontSize: '0.95rem', lineHeight: 1.6, color: t.cor.tinta }}>
            O último dia ou mês que a própria fonte já publicou. É a data que diz se o número está completo.
          </p>
        </div>
      </div>

      <div style={{ ...cartao, padding: '6px 22px 14px', marginBottom: '16px' }}>
        {grupos.map((g) => (
          <div key={g.titulo}>
            <h3 style={{ margin: '16px 0 6px', fontSize: '0.8rem', fontWeight: 700, color: t.cor.ouroTexto }}>{g.titulo}</h3>
            <div className="atu-cab"><span>Fonte</span><span>Frequência</span><span>Coletado em</span><span>Dados até</span></div>
            {g.itens.map((i) => (
              <div key={i.nome} className="atu-linha">
                <span className="atu-fonte">{i.nome}</span>
                <span className="atu-freq"><span className="atu-rot">Frequência</span>{i.frequencia}</span>
                <span className="atu-data"><span className="atu-rot">Coletado em</span>
                  {i.coletadoEm ? <strong>{dataBr(i.coletadoEm)}</strong> : <span style={{ color: t.cor.cinza }}>sem registro ainda</span>}
                </span>
                <span className="atu-data"><span className="atu-rot">Dados até</span>
                  {i.dadosAte ? <strong>{i.dadosAte}</strong> : <span style={{ color: t.cor.cinza }}>{i.coletadoEm ? 'no dia da coleta' : '-'}</span>}
                </span>
              </div>
            ))}
          </div>
        ))}
        <p style={{ margin: '14px 0 0', fontSize: '0.85rem', lineHeight: 1.55, color: t.cor.cinza }}>
          Quando uma fonte ainda não publicou o mês mais recente, mostramos a data do último dado dela, e não escondemos. O horário de cada coleta é um pedido ao GitHub, que às vezes atrasa algumas horas.
        </p>
      </div>
    </section>
  );
}
