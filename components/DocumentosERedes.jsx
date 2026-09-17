import { useState, useEffect } from 'react';
import { t } from '../src/estilo/tokens';

// Seção "Documentos e redes" da ficha do presidenciável. (16/09/2026)
//
// DOCUMENTOS: os PDFs que o candidato entregou ao TSE no registro (diploma, certidões,
// proposta de governo). São 6 por candidato nos 14. Levam para fora do site de propósito: é
// documento oficial, e o lugar canônico dele é a fonte.
//
// REDES: aqui NÃO transformamos arroba em link. A fonte devolve "https://@fulano", que é um
// handle com protocolo colado na frente, e não diz de qual rede é. Montar "instagram.com/fulano"
// seria fabricar um endereço que o candidato não declarou. Arroba vira texto; só domínio de
// verdade vira link. Um link morto num site de transparência custa mais que um texto sem link.
export default function DocumentosERedes({ sqCandidato }) {
  const [d, setD] = useState(null);

  useEffect(() => {
    if (!sqCandidato) return;
    let vivo = true;
    fetch(`/api/ficha-tse?sq=${encodeURIComponent(sqCandidato)}`)
      .then((r) => r.json())
      .then((x) => { if (vivo) setD(x); })
      .catch(() => { });
    return () => { vivo = false; };
  }, [sqCandidato]);

  if (!d || d.indisponivel) return null;
  const docs = Array.isArray(d.documentos) ? d.documentos : [];
  const redes = Array.isArray(d.redes) ? d.redes : [];
  if (docs.length === 0 && redes.length === 0) return null;

  const rotulo = { margin: 0, fontSize: '0.7rem', fontWeight: 800, letterSpacing: '0.05em', textTransform: 'uppercase', color: t.cor.cinza };

  return (
    <section style={{ background: t.cor.papelCartao, borderRadius: t.raio.md, padding: '18px 20px', marginBottom: '24px', boxShadow: t.sombra.sutil }}>
      <h2 style={{ fontFamily: t.fonte.titulo, fontWeight: 600, fontSize: '1.15rem', margin: '0 0 14px' }}>Documentos e redes</h2>

      {docs.length > 0 && (
        <div style={{ marginBottom: redes.length ? '18px' : 0 }}>
          <p style={rotulo}>Entregues ao TSE no registro</p>
          <div style={{ display: 'grid', gap: '6px', marginTop: '8px' }}>
            {docs.map((doc, i) => (
              <a key={i} href={doc.url} target="_blank" rel="noopener noreferrer"
                style={{ display: 'flex', alignItems: 'center', gap: '10px', background: t.cor.papelQuente, borderRadius: t.raio.sm, padding: '10px 14px', textDecoration: 'none', color: t.cor.tinta, fontSize: '0.88rem', lineHeight: 1.4 }}>
                <span aria-hidden="true" style={{ fontSize: '0.72rem', fontWeight: 800, color: t.cor.ouroTexto, textTransform: 'uppercase' }}>{doc.tipo || 'doc'}</span>
                <span style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis' }}>{doc.nome}</span>
              </a>
            ))}
          </div>
        </div>
      )}

      {redes.length > 0 && (
        <div>
          <p style={rotulo}>Redes declaradas pelo candidato</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '8px' }}>
            {redes.map((r, i) => r.url ? (
              <a key={i} href={r.url} target="_blank" rel="noopener noreferrer"
                style={{ fontSize: '0.84rem', fontWeight: 600, padding: '6px 12px', borderRadius: t.raio.pill, background: t.cor.papelQuente, color: t.cor.ouroTexto, textDecoration: 'none' }}>
                {r.texto}
              </a>
            ) : (
              <span key={i} style={{ fontSize: '0.84rem', fontWeight: 600, padding: '6px 12px', borderRadius: t.raio.pill, background: t.cor.papelQuente, color: t.cor.tinta }}>
                {r.texto}
              </span>
            ))}
          </div>
          {redes.some((r) => !r.url) && (
            <p style={{ margin: '8px 0 0', fontSize: '0.76rem', lineHeight: 1.5, color: t.cor.cinza }}>
              O TSE publica alguns perfis apenas como nome de usuário, sem dizer a qual rede pertencem. Esses aparecem como texto, sem link.
            </p>
          )}
        </div>
      )}
    </section>
  );
}
