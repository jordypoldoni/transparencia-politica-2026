import { useEffect, useRef, useState } from 'react';
import { t } from '../src/estilo/tokens';
import Giro from './Giro';
import { validarPergunta, LIMITE_PERGUNTA } from '../src/lib/cobranca';

// Janela onde o cidadão escreve a pergunta do card de cobrança (20/10/2026, item 5; decisão D-057).
// Vem preenchida com a pergunta-padrão: quem não quer escrever é só tocar em "Gerar card".
// `montar(pergunta)` devolve o card (cobranca.js) para aquele voto ou gasto; `aoGerar(card)` desenha e entrega.
export default function JanelaCobranca({ montar, aoFechar, aoGerar, nome }) {
  const [texto, setTexto] = useState('');
  const [erro, setErro] = useState('');
  const [gerando, setGerando] = useState(false);
  const campo = useRef(null);
  const base = montar ? montar() : null;

  useEffect(() => {
    if (!montar) return undefined;
    setTexto(montar().pergunta); setErro(''); setGerando(false);
    const id = setTimeout(() => { campo.current && campo.current.focus(); campo.current && campo.current.select(); }, 50);
    const tecla = (e) => { if (e.key === 'Escape') aoFechar(); };
    document.addEventListener('keydown', tecla);
    const antes = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { clearTimeout(id); document.removeEventListener('keydown', tecla); document.body.style.overflow = antes; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [montar]);

  if (!montar || !base) return null;

  const gerar = async () => {
    const v = validarPergunta(texto);
    if (!v.ok) { setErro(v.motivo); campo.current && campo.current.focus(); return; }
    setErro(''); setGerando(true);
    try { await aoGerar(montar(v.texto)); aoFechar(); } catch (e) { setErro('Não foi possível gerar o card agora. Tente de novo.'); setGerando(false); }
  };

  const resto = LIMITE_PERGUNTA - texto.length;
  return (
    <div onMouseDown={(e) => { if (e.target === e.currentTarget && !gerando) aoFechar(); }}
      style={{ position: 'fixed', inset: 0, zIndex: 120, background: 'rgba(25,28,32,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
      <div role="dialog" aria-modal="true" aria-labelledby="titulo-cobranca"
        style={{ width: '100%', maxWidth: '480px', maxHeight: '100%', overflowY: 'auto', background: '#fff', borderRadius: t.raio.lg, padding: '22px', boxShadow: t.sombra.media }}>
        <h2 id="titulo-cobranca" style={{ margin: '0 0 6px', fontFamily: t.fonte.titulo, fontWeight: 600, fontSize: '1.3rem', color: t.cor.tinta }}>Cobrar {nome}</h2>
        <p style={{ margin: '0 0 14px', fontSize: '0.88rem', lineHeight: 1.5, color: t.cor.cinza }}>
          O card leva o fato oficial ({base.fato}) e a pergunta abaixo. Você pode trocar pela sua.
        </p>
        <label htmlFor="pergunta-cobranca" style={{ display: 'block', margin: '0 0 6px', fontSize: '0.82rem', fontWeight: 700, color: t.cor.tinta }}>Sua pergunta ou mensagem</label>
        <textarea id="pergunta-cobranca" ref={campo} value={texto} rows={3} maxLength={LIMITE_PERGUNTA + 40}
          onChange={(e) => { setTexto(e.target.value); if (erro) setErro(''); }}
          aria-invalid={!!erro} aria-describedby="ajuda-cobranca"
          style={{ width: '100%', resize: 'vertical', border: 'none', outline: 'none', borderRadius: '14px', padding: '12px 14px', fontFamily: t.fonte.corpo, fontSize: '1rem', lineHeight: 1.45, color: t.cor.tinta, background: '#fff',
            boxShadow: erro ? `inset 0 0 0 2px ${t.cor.nao}` : `inset 0 0 0 1px #CC7A22` }}
          onFocus={(e) => { if (!erro) e.target.style.boxShadow = `inset 0 0 0 2.5px ${t.cor.ouro}, ${t.sombra.anelFoco}`; }}
          onBlur={(e) => { e.target.style.boxShadow = erro ? `inset 0 0 0 2px ${t.cor.nao}` : 'inset 0 0 0 1px #CC7A22'; }} />
        <div id="ajuda-cobranca" style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', margin: '6px 0 0', fontSize: '0.78rem', color: t.cor.cinza }}>
          <span>Sem ofensas, acusações, links ou telefones. O card marca como pergunta de um cidadão.</span>
          <span style={{ flexShrink: 0, fontWeight: 700, color: resto < 0 ? t.cor.nao : t.cor.cinza }}>{resto}</span>
        </div>
        {erro && <p role="alert" style={{ margin: '10px 0 0', fontSize: '0.86rem', fontWeight: 600, color: t.cor.nao }}>{erro}</p>}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '18px', marginTop: '18px' }}>
          <button type="button" onClick={aoFechar} disabled={gerando} className="acao-texto"
            style={{ background: 'none', border: 'none', padding: 0, fontFamily: t.fonte.corpo, fontSize: '0.9rem', fontWeight: 700, color: t.cor.ouroTexto, textDecoration: 'underline', cursor: 'pointer' }}>Cancelar</button>
          <button type="button" onClick={gerar} disabled={gerando}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', border: 'none', background: t.cor.verde, color: t.cor.ouro, fontFamily: t.fonte.corpo, fontSize: '0.9rem', fontWeight: 700, padding: '10px 22px', borderRadius: t.raio.pill, boxShadow: t.sombra.botao, cursor: gerando ? 'default' : 'pointer', opacity: gerando ? 0.85 : 1 }}>
            {gerando && <Giro tamanho={16} />}{gerando ? 'Gerando…' : 'Gerar card'}
          </button>
        </div>
      </div>
    </div>
  );
}
