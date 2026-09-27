import { useState } from 'react';
import { t } from '../src/estilo/tokens';

// COMPARTILHAR (27/09/2026). No celular abre a folha de compartilhamento do próprio aparelho
// (WhatsApp, Instagram, e-mail...), que é onde a pessoa já compartilha tudo. Onde não existe (a
// maioria dos computadores), copia o link e avisa. Se nem copiar der, mostra o link num campo
// para copiar à mão: o botão nunca "não faz nada".
// `url` pode ser função: a cola pessoal monta o link na hora do clique, com as escolhas daquele
// momento.
export default function BotaoCompartilhar({ url, titulo, texto, rotulo = 'Compartilhar', claro = false, desligado = false }) {
  const [aviso, setAviso] = useState('');
  const [manual, setManual] = useState('');

  const clicar = async () => {
    const link = typeof url === 'function' ? url() : url;
    if (!link) return;
    setAviso(''); setManual('');
    if (navigator.share) {
      try { await navigator.share({ title: titulo, text: texto, url: link }); return; }
      catch (e) { if (e?.name === 'AbortError') return; /* sem share de verdade: cai para copiar */ }
    }
    try {
      await navigator.clipboard.writeText(link);
      setAviso('Link copiado. Cole no WhatsApp ou onde quiser.');
      setTimeout(() => setAviso(''), 5000);
    } catch (e) {
      setManual(link);
    }
  };

  const realce = (e, ligar) => {
    if (e.currentTarget.disabled) return;
    e.currentTarget.style.boxShadow = ligar ? t.sombra.botaoHover : t.sombra.botao;
    e.currentTarget.style.transform = ligar ? 'translateY(-1px)' : 'none';
  };
  return (
    <div style={{ display: 'inline-flex', flexDirection: 'column', gap: '6px', maxWidth: '100%' }}>
      <button type="button" className="botao-compacto" onClick={clicar} disabled={desligado} onMouseOver={(e) => realce(e, true)} onMouseOut={(e) => realce(e, false)}
        style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '9px 18px', fontSize: '0.9rem', fontWeight: 700,
          fontFamily: t.fonte.corpo, border: 'none', borderRadius: t.raio.pill, cursor: desligado ? 'not-allowed' : 'pointer',
          opacity: desligado ? 0.5 : 1, background: claro ? '#fff' : t.cor.verde, color: claro ? t.cor.tinta : t.cor.ouro,
          boxShadow: desligado ? 'none' : t.sombra.botao, transition: 'box-shadow .15s, transform .15s', whiteSpace: 'nowrap' }}>
        <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" />
          <line x1="8.6" y1="13.5" x2="15.4" y2="17.5" /><line x1="15.4" y1="6.5" x2="8.6" y2="10.5" />
        </svg>
        {rotulo}
      </button>
      <span role="status" aria-live="polite" style={{ fontSize: '0.8rem', color: t.cor.tinta, minHeight: aviso ? 'auto' : 0 }}>{aviso}</span>
      {manual && (
        <label style={{ fontSize: '0.8rem', color: t.cor.tinta }}>
          Copie o link:
          <input readOnly value={manual} onFocus={(e) => e.target.select()}
            style={{ display: 'block', width: '100%', marginTop: '4px', padding: '8px 12px', fontSize: '16px', borderRadius: t.raio.sm, border: 'none', boxShadow: 'inset 0 0 0 1px #CC7A22' }} />
        </label>
      )}
    </div>
  );
}
