import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { t } from '../src/estilo/tokens';
import { sessaoAtual, aoMudarSessao, sair } from '../src/lib/perfilUsuario';

// ENTRAR / CONTA no cabeçalho, AO LADO DO LOGO (pedido do Jordy, 26/09/2026). No celular o logo
// perde o texto "Lume Cidadão" e fica só o símbolo, para caber este botão ao lado dele.
//
// Sem sessão: pílula "Entrar" no botão padrão do site (índigo com texto âmbar).
// Com sessão: pílula com a inicial num círculo âmbar e o NOME E SOBRENOME (26/09/2026, pedido
// do Jordy: só a letra ficava estranho). O nome vem da conta Google (primeiro e último nome, para
// "Jordy Pedro Oldoni" virar "Jordy Oldoni"). Quem entrou pelo link do e-mail não tem nome
// guardado: aparece "Sua conta". A pílula abre Seu perfil, Seus favoritos e Sair.
// Mesmo padrão de disclosure do menu (botão que revela links, não role="menu").
const pilulaEntrar = {
  display: 'inline-flex', alignItems: 'center', padding: '7px 16px', fontSize: '0.84rem', fontWeight: 700,
  fontFamily: t.fonte.corpo, borderRadius: t.raio.pill, background: t.cor.verde, color: t.cor.ouro,
  textDecoration: 'none', boxShadow: t.sombra.botao, whiteSpace: 'nowrap', transition: 'box-shadow .15s, transform .15s',
};
const realce = (e, ligar) => {
  e.currentTarget.style.boxShadow = ligar ? t.sombra.botaoHover : t.sombra.botao;
  e.currentTarget.style.transform = ligar ? 'translateY(-1px)' : 'none';
};

export default function BotaoConta() {
  const [sessao, setSessao] = useState(null);
  const [aberto, setAberto] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    let vivo = true;
    sessaoAtual().then((s) => { if (vivo) setSessao(s); }).catch(() => {});
    const parar = aoMudarSessao((s) => { if (vivo) setSessao(s); });
    return () => { vivo = false; parar(); };
  }, []);

  useEffect(() => {
    if (!aberto) return;
    const fora = (e) => { if (ref.current && !ref.current.contains(e.target)) setAberto(false); };
    const esc = (e) => { if (e.key === 'Escape') setAberto(false); };
    document.addEventListener('mousedown', fora);
    document.addEventListener('keydown', esc);
    return () => { document.removeEventListener('mousedown', fora); document.removeEventListener('keydown', esc); };
  }, [aberto]);

  if (!sessao) {
    return (
      <Link href="/entrar" style={pilulaEntrar} onMouseOver={(e) => realce(e, true)} onMouseOut={(e) => realce(e, false)}>Entrar</Link>
    );
  }

  const email = sessao.user?.email || '';
  const meta = sessao.user?.user_metadata || {};
  const partes = String(meta.full_name || meta.name || '').trim().split(/\s+/).filter(Boolean);
  const nomeCurto = partes.length > 1 ? `${partes[0]} ${partes[partes.length - 1]}` : (partes[0] || '');
  const inicial = (nomeCurto || email || '?').charAt(0).toUpperCase();
  const item = { display: 'block', padding: '10px 12px', borderRadius: t.raio.sm, textDecoration: 'none', color: t.cor.tinta, fontSize: '0.9rem', fontWeight: 700, background: 'transparent', border: 'none', width: '100%', textAlign: 'left', cursor: 'pointer', fontFamily: t.fonte.corpo };
  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button type="button" aria-expanded={aberto} aria-haspopup="true" aria-label={`Sua conta: ${nomeCurto || email}`} onClick={() => setAberto((a) => !a)}
        onMouseOver={(e) => realce(e, true)} onMouseOut={(e) => realce(e, false)}
        style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', height: '36px', padding: '0 14px 0 4px', borderRadius: t.raio.pill, border: 'none', cursor: 'pointer', background: t.cor.verde, color: t.cor.ouro, fontWeight: 700, fontFamily: t.fonte.corpo, fontSize: '0.86rem', boxShadow: t.sombra.botao, transition: 'box-shadow .15s, transform .15s', minWidth: 0 }}>
        <span aria-hidden="true" style={{ flexShrink: 0, width: '28px', height: '28px', borderRadius: '50%', background: t.cor.ouro, color: t.cor.verde, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '0.85rem' }}>{inicial}</span>
        <span className="conta-nome" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '170px' }}>{nomeCurto || 'Sua conta'}</span>
      </button>
      {aberto && (
        <div style={{ position: 'absolute', top: '100%', left: 0, paddingTop: '6px', zIndex: 60 }}>
          <div style={{ minWidth: '230px', background: t.cor.papelCartao, borderRadius: t.raio.md, boxShadow: t.sombra.media, padding: '6px' }}>
            <p style={{ margin: 0, padding: '8px 12px 6px', fontSize: '0.76rem', color: t.cor.cinza, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{email}</p>
            {[['/perfil', 'Seu perfil'], ['/favoritos', 'Seus favoritos']].map(([href, rotulo]) => (
              <Link key={href} href={href} onClick={() => setAberto(false)} style={item}
                onMouseOver={(e) => { e.currentTarget.style.background = t.cor.papelQuente; }} onMouseOut={(e) => { e.currentTarget.style.background = 'transparent'; }}>{rotulo}</Link>
            ))}
            <button type="button" style={item} onClick={async () => { setAberto(false); await sair(); }}
              onMouseOver={(e) => { e.currentTarget.style.background = t.cor.papelQuente; }} onMouseOut={(e) => { e.currentTarget.style.background = 'transparent'; }}>Sair</button>
          </div>
        </div>
      )}
    </div>
  );
}
