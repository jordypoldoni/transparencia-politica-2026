import { useState, useEffect } from 'react';
import { t } from '../src/estilo/tokens';

const brl = (v) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);

// Seção "Patrimônio declarado" da ficha do presidenciável. (16/09/2026)
//
// DESENHO: total na frente, lista item a item atrás de um clique, fonte no rodapé. É a
// "divulgação progressiva" das Diretrizes de Design (resumo → detalhe → fonte), e resolve a
// tensão real deste dado: o total informa, e a lista completa numa tela aberta transforma
// patrimônio em espetáculo antes de o leitor decidir que quer esse nível de detalhe.
//
// O QUE ESTE NÚMERO É, E O QUE NÃO É - por isso a ressalva fica na tela, não só aqui:
// é a declaração do PRÓPRIO candidato ao TSE no registro da candidatura, pelo valor de
// aquisição ou declarado, não uma avaliação de mercado nem uma auditoria. Omitir isso faria a
// tela sugerir uma precisão que o dado não tem.
//
// NÃO COMPARAMOS com os outros candidatos aqui. Dizer "o maior patrimônio entre os 14" seria
// o site escolhendo o que é notável, e a régua é fato mais fonte, sem julgamento. Quem quiser
// comparar tem os 14 na lista.
export default function PatrimonioDeclarado({ sqCandidato }) {
  const [d, setD] = useState(null);
  const [aberto, setAberto] = useState(false);

  useEffect(() => {
    if (!sqCandidato) return;
    let vivo = true;
    fetch(`/api/ficha-tse?sq=${encodeURIComponent(sqCandidato)}`)
      .then((r) => r.json())
      .then((x) => { if (vivo) setD(x); })
      .catch(() => { });
    return () => { vivo = false; };
  }, [sqCandidato]);

  if (!d || d.indisponivel || d.divulgaBens === false) return null;
  if (d.totalDeBens === null || d.totalDeBens === undefined) return null;

  const itens = Array.isArray(d.bens) ? d.bens : [];
  const zerado = !d.totalDeBens;
  const data = d.consultadoEm ? new Date(d.consultadoEm).toLocaleDateString('pt-BR') : null;

  return (
    <section style={{ background: t.cor.papelCartao, borderRadius: t.raio.md, padding: '18px 20px', marginBottom: '24px', boxShadow: t.sombra.sutil }}>
      <h2 style={{ fontFamily: t.fonte.titulo, fontWeight: 600, fontSize: '1.15rem', margin: '0 0 12px' }}>Patrimônio declarado</h2>

      {/* Zero é informação, não ausência de dado: quem declarou nada precisa aparecer como
          tendo declarado nada, senão a seção some e parece que o dado faltou. */}
      {zerado ? (
        <p style={{ margin: '0 0 12px', fontSize: '0.95rem', lineHeight: 1.55, color: t.cor.tinta }}>
          Declarou <strong style={{ fontWeight: 700 }}>não possuir bens</strong> no registro da candidatura.
        </p>
      ) : (
        <>
          <p style={{ margin: 0, fontFamily: t.fonte.titulo, fontWeight: 600, fontSize: 'clamp(1.5rem,4vw,2rem)', lineHeight: 1.15, color: t.cor.tinta }}>
            {brl(d.totalDeBens)}
          </p>
          <p style={{ margin: '4px 0 14px', fontSize: '0.85rem', color: t.cor.cinza }}>
            {itens.length > 0 ? `${itens.length} ${itens.length === 1 ? 'bem declarado' : 'bens declarados'}` : 'total declarado ao TSE'}
          </p>
        </>
      )}

      {itens.length > 0 && (
        <>
          <button
            onClick={() => setAberto((v) => !v)}
            aria-expanded={aberto}
            onMouseOver={(e) => { e.currentTarget.style.boxShadow = t.sombra.hover; }}
            onMouseOut={(e) => { e.currentTarget.style.boxShadow = t.sombra.clicavel; }}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '8px', minHeight: '44px',
              padding: '10px 20px', borderRadius: t.raio.pill, border: 'none', cursor: 'pointer',
              fontFamily: t.fonte.corpo, fontSize: '0.88rem', fontWeight: 700,
              background: t.cor.verde, color: t.cor.ouro, boxShadow: t.sombra.clicavel,
              transition: 'box-shadow .15s ease',
            }}>
            {aberto ? 'Ocultar a lista' : `Ver os ${itens.length} bens declarados`}
            <span aria-hidden="true" style={{ fontSize: '0.7rem' }}>{aberto ? '▲' : '▼'}</span>
          </button>

          {aberto && (
            <div style={{ marginTop: '14px', display: 'grid', gap: '8px' }}>
              {itens.map((b, i) => (
                <div key={i} style={{ background: t.cor.papelQuente, borderRadius: t.raio.sm, padding: '12px 14px', display: 'flex', justifyContent: 'space-between', gap: '14px', flexWrap: 'wrap' }}>
                  <div style={{ minWidth: 0, flex: '1 1 260px' }}>
                    <p style={{ margin: 0, fontSize: '0.9rem', fontWeight: 600, lineHeight: 1.4, color: t.cor.tinta }}>{b.descricao || '(sem descrição)'}</p>
                    {b.tipo && <p style={{ margin: '2px 0 0', fontSize: '0.78rem', color: t.cor.cinza, lineHeight: 1.4 }}>{b.tipo}</p>}
                  </div>
                  <p style={{ margin: 0, fontSize: '0.92rem', fontWeight: 700, whiteSpace: 'nowrap', color: t.cor.tinta }}>{brl(b.valor)}</p>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      <p style={{ margin: '14px 0 0', fontSize: '0.76rem', lineHeight: 1.5, color: t.cor.cinza }}>
        Declaração do próprio candidato ao TSE no registro da candidatura, pelo valor de aquisição ou declarado. Não é avaliação de mercado nem auditoria.
        {data ? ` Consultado ao vivo em ${data}.` : ''}
        {d.fonteUrl && (
          <>
            {' '}
            <a href={d.fonteUrl} target="_blank" rel="noopener noreferrer" style={{ color: t.cor.ouroTexto, fontWeight: 700 }}>ver no DivulgaCandContas</a>
          </>
        )}
      </p>
    </section>
  );
}
