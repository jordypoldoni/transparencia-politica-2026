import { useState } from 'react';
import { t } from '../src/estilo/tokens';

// Seção "Documentos e redes" da ficha do presidenciável. (16/09/2026)
//
// DOCUMENTOS: os PDFs que o candidato entregou ao TSE no registro (diploma, certidões,
// proposta de governo). Levam para fora do site de propósito: é documento oficial, e o
// lugar canônico dele é a fonte.
//
// REDES: aqui NÃO transformamos arroba em link. A fonte devolve "https://@fulano", que é um
// handle com protocolo colado na frente, e não diz de qual rede é. Montar "instagram.com/fulano"
// seria fabricar um endereço que o candidato não declarou. Arroba vira texto; só domínio de
// verdade vira link. Um link morto num site de transparência custa mais que um texto sem link.
//
// RECOLHIDA POR PADRÃO (17/09/2026). O que motivou: na ficha do Lula esta seção rende 85
// documentos e 62 redes — uma parede de uns oito mil pixels que empurrava para fora da tela
// tudo que vinha depois, inclusive o link para o vice da chapa. O volume varia demais entre
// candidatos (de 6 itens a 147) para ficar aberto sempre. O cabeçalho mostra a contagem, então
// quem não abrir ainda sabe o que tem ali: a informação de que existem 85 documentos é, ela
// mesma, um dado. Aberta, a lista longa ganha rolagem própria em vez de esticar a página.
//
// CELULAR (25/09/2026). Na ficha do Cabo Daciolo a seção aberta alargava a PÁGINA inteira: os
// nomes dos PDFs estavam em uma linha só (nowrap), e item de grade não encolhe abaixo do próprio
// conteúdo, então a coluna crescia até caber o nome. Pior que o corte: o navegador reduzia o
// zoom da página toda. Agora a coluna é minmax(0, 1fr) e o nome QUEBRA LINHA em vez de cortar
// com reticências, porque o que importa ("Certidão TRF1 Criminal") fica no fim do nome e era
// justamente o que sumia. Endereço longo de rede sem espaço (facebook.com/people/...) também quebra.
export default function DocumentosERedes({ ficha }) {
  const [aberta, setAberta] = useState(false);

  const f = ficha || {};
  const docs = Array.isArray(f.documentos) ? f.documentos : [];
  const redes = Array.isArray(f.redes) ? f.redes : [];
  if (docs.length === 0 && redes.length === 0) return null;

  const rotulo = { margin: 0, fontSize: '0.7rem', fontWeight: 800, letterSpacing: '0.05em', textTransform: 'uppercase', color: t.cor.cinza };

  // Contagem no cabeçalho: com a seção fechada, é isso que diz o que está guardado.
  const partes = [];
  if (docs.length) partes.push(`${docs.length} ${docs.length === 1 ? 'documento' : 'documentos'}`);
  if (redes.length) partes.push(`${redes.length} ${redes.length === 1 ? 'endereço' : 'endereços'}`);
  const resumo = partes.join(' · ');

  // A partir de ~12 itens a lista vira rolagem própria, para não esticar a página de novo.
  const listaRolavel = docs.length > 12
    ? { maxHeight: '340px', overflowY: 'auto', paddingRight: '6px' }
    : {};

  return (
    <section style={{ background: t.cor.papelCartao, borderRadius: t.raio.md, padding: '18px 20px', marginBottom: '24px', boxShadow: t.sombra.sutil }}>
      <button
        type="button"
        onClick={() => setAberta((v) => !v)}
        aria-expanded={aberta}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px',
          width: '100%', background: 'none', border: 'none', padding: 0, margin: 0,
          textAlign: 'left', cursor: 'pointer', color: 'inherit', font: 'inherit',
        }}
      >
        <span style={{ minWidth: 0 }}>
          <span style={{ display: 'block', fontFamily: t.fonte.titulo, fontWeight: 600, fontSize: '1.15rem' }}>Documentos e redes</span>
          {resumo && <span style={{ display: 'block', marginTop: '3px', fontSize: '0.82rem', color: t.cor.cinza }}>{resumo}</span>}
        </span>
        <span style={{ flexShrink: 0, display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', fontWeight: 700, color: t.cor.ouroTexto }}>
          {aberta ? 'Recolher' : 'Ver'}
          <span aria-hidden="true" style={{ display: 'inline-block', transform: aberta ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }}>▾</span>
        </span>
      </button>

      {aberta && (
        <div style={{ marginTop: '16px' }}>
          {docs.length > 0 && (
            <div style={{ marginBottom: redes.length ? '18px' : 0 }}>
              <p style={rotulo}>Entregues ao TSE no registro</p>
              <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr)', gap: '6px', marginTop: '8px', ...listaRolavel }}>
                {docs.map((doc, i) => (
                  <a key={i} href={doc.url} target="_blank" rel="noopener noreferrer"
                    style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', minWidth: 0, background: t.cor.papelQuente, borderRadius: t.raio.sm, padding: '10px 14px', textDecoration: 'none', color: t.cor.tinta, fontSize: '0.88rem', lineHeight: 1.4 }}>
                    <span aria-hidden="true" style={{ flexShrink: 0, paddingTop: '2px', fontSize: '0.72rem', fontWeight: 800, color: t.cor.ouroTexto, textTransform: 'uppercase' }}>{doc.tipo || 'doc'}</span>
                    <span style={{ minWidth: 0, overflowWrap: 'anywhere' }}>{doc.nome}</span>
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
                    style={{ maxWidth: '100%', overflowWrap: 'anywhere', fontSize: '0.84rem', fontWeight: 600, padding: '6px 12px', borderRadius: t.raio.pill, background: t.cor.papelQuente, color: t.cor.ouroTexto, textDecoration: 'none' }}>
                    {r.texto}
                  </a>
                ) : (
                  <span key={i} style={{ maxWidth: '100%', overflowWrap: 'anywhere', fontSize: '0.84rem', fontWeight: 600, padding: '6px 12px', borderRadius: t.raio.pill, background: t.cor.papelQuente, color: t.cor.tinta }}>
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
        </div>
      )}
    </section>
  );
}
