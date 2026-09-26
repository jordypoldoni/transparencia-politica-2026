import { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { t } from '../src/estilo/tokens';
import { entrarComGoogle, entrarComEmail, sessaoAtual, perfilDisponivel } from '../src/lib/perfilUsuario';

// ENTRAR (26/09/2026). Duas portas: Google (um clique) e link no e-mail (sem senha). Nenhuma
// senha passa pelo site. A conta é OPCIONAL: o site inteiro funciona sem ela, e esta página
// diz isso antes de pedir qualquer coisa.
//
// Depois de entrar, a pessoa cai em /perfil, onde decide (consentimento) se as respostas e os
// favoritos deste navegador vão para o perfil.
const caixa = { background: t.cor.papelCartao, borderRadius: t.raio.lg, padding: 'clamp(22px,4vw,32px)', boxShadow: t.sombra.media };
const botao = (claro = false, desligado = false) => ({
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '10px', width: '100%',
  padding: '12px 20px', fontSize: '0.95rem', fontWeight: 700, fontFamily: t.fonte.corpo, border: 'none',
  borderRadius: t.raio.pill, cursor: desligado ? 'not-allowed' : 'pointer', opacity: desligado ? 0.5 : 1,
  background: claro ? '#fff' : t.cor.verde, color: claro ? t.cor.tinta : t.cor.ouro,
  boxShadow: desligado ? 'none' : t.sombra.botao, transition: 'box-shadow .15s, transform .15s',
});
// BOTÃO DO GOOGLE (26/09/2026). O branco sumia dentro do cartão branco: a única diferença era
// a sombra. Agora segue o tema escuro oficial do "Sign in with Google" (fundo #131314, texto
// #E3E3E3, o G colorido sem alteração), que destaca no cartão claro e é reconhecível na hora.
// Contraste do texto: 14,9:1. Sem contorno de 1px, pela regra de botões do site.
const botaoGoogle = (desligado = false) => ({
  ...botao(false, desligado), background: '#131314', color: '#E3E3E3', fontWeight: 600,
});
const LogoGoogle = () => (
  <svg width="20" height="20" viewBox="0 0 48 48" aria-hidden="true" focusable="false" style={{ flexShrink: 0 }}>
    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
    <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
  </svg>
);
const realce = (e, ligar) => {
  if (e.currentTarget.disabled) return;
  e.currentTarget.style.boxShadow = ligar ? t.sombra.botaoHover : t.sombra.botao;
  e.currentTarget.style.transform = ligar ? 'translateY(-1px)' : 'none';
};

export default function Entrar() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [enviado, setEnviado] = useState(false);
  const [erro, setErro] = useState('');
  const [ocupado, setOcupado] = useState(false);
  const [focoEmail, setFocoEmail] = useState(false);

  // Quem já está logado não precisa desta página.
  useEffect(() => { sessaoAtual().then((s) => { if (s) router.replace('/perfil'); }).catch(() => {}); }, [router]);

  const destino = () => `${window.location.origin}/perfil`;
  const google = async () => {
    setErro(''); setOcupado(true);
    try { await entrarComGoogle(destino()); } catch (e) { setErro('Não foi possível abrir o login do Google. Tente de novo.'); setOcupado(false); }
  };
  const porEmail = async (e) => {
    e.preventDefault();
    setErro('');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) { setErro('Confira o e-mail digitado.'); return; }
    setOcupado(true);
    try { await entrarComEmail(email.trim(), destino()); setEnviado(true); }
    catch (err) { setErro(/rate|limit/i.test(err?.message || '') ? 'Muitos pedidos de link agora. Espere alguns minutos e tente de novo, ou entre com o Google.' : 'Não foi possível enviar o link. Tente de novo.'); }
    finally { setOcupado(false); }
  };

  return (
    <div className="pagina">
      <Head><title>Entrar | Lume Cidadão</title><meta name="robots" content="noindex" /></Head>
      {/* HIERARQUIA (26/09/2026). Antes era uma coluna só: título, texto, um bloco creme e o cartão
          de login, tudo com peso parecido, e a ação ficava no fim. Agora são três papéis:
          1) o que é (título e uma frase), 2) a ação (o cartão, única superfície elevada da tela),
          3) a explicação (por que não tem senha), texto simples, sem caixa competindo com o cartão.
          No computador: explicação à esquerda, cartão à direita. No celular: título, cartão e
          depois a explicação. Grade em _app.js (.entrar-grade). */}
      <div className="entrar-grade">
        <div className="entrar-texto">
          <p style={{ margin: '0 0 8px', fontSize: '0.78rem', fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase', color: t.cor.ouroTexto }}>Sua conta</p>
          <h1 style={{ fontFamily: t.fonte.titulo, fontWeight: 600, fontSize: 'clamp(2rem,4.5vw,2.8rem)', lineHeight: 1.1, margin: '0 0 14px' }}>Entrar no Lume</h1>
          <p style={{ color: t.cor.tinta, fontSize: '1.05rem', lineHeight: 1.6, margin: 0, maxWidth: '44ch' }}>
            Você não precisa de conta para usar o site. A conta serve só para levar suas respostas e seus favoritos para
            outros aparelhos.
          </p>
        </div>

        <div className="entrar-acao">
          {!perfilDisponivel ? (
            <div style={caixa}><p style={{ margin: 0 }}>O login está indisponível no momento.</p></div>
          ) : enviado ? (
            <div style={caixa}>
              <p style={{ margin: '0 0 8px', fontWeight: 700 }}>Link enviado</p>
              <p style={{ margin: 0, color: t.cor.cinza, lineHeight: 1.6 }}>
                Mandamos um link para <strong style={{ color: t.cor.tinta }}>{email}</strong>. Abra o e-mail neste aparelho e toque
                no link para entrar. Se não chegar em alguns minutos, olhe a caixa de spam.
              </p>
            </div>
          ) : (
            <div style={caixa}>
              <p style={{ margin: '0 0 16px', fontWeight: 800, fontSize: '1.05rem', color: t.cor.tinta }}>Escolha como entrar</p>
              <button type="button" onClick={google} disabled={ocupado} style={botaoGoogle(ocupado)}
                onMouseOver={(e) => realce(e, true)} onMouseOut={(e) => realce(e, false)}>
                <LogoGoogle />
                Continuar com o Google
              </button>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', margin: '20px 0', color: t.cor.cinza, fontSize: '0.84rem' }}>
                <span style={{ flex: 1, height: '1px', background: t.cor.papelQuente2 }} />ou<span style={{ flex: 1, height: '1px', background: t.cor.papelQuente2 }} />
              </div>
              <form onSubmit={porEmail}>
                <label htmlFor="email" style={{ display: 'block', fontWeight: 700, fontSize: '0.9rem', marginBottom: '8px' }}>Receber um link de acesso por e-mail</label>
                {/* CAMPO DE E-MAIL ACESSÍVEL (26/09/2026). O fundo creme sobre o cartão branco dava 1,08:1:
                    o campo não aparecia. Nenhum fundo claro chega a 3:1 contra o branco (WCAG 1.4.11), então
                    o limite do campo é um anel (sombra interna, sem borda) na cor dourada do site, pedido do
                    Jordy: FINO em repouso, #CC7A22 (3,29:1, o âmbar mais claro que ainda passa 3:1), e
                    GROSSO no foco, #FF8A00 com halo. Fonte de 16px: abaixo disso o iPhone dá zoom ao tocar. */}
                <input id="email" type="email" inputMode="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="seu@email.com"
                  className="campo-email" aria-describedby={erro ? 'erro-entrar' : undefined} aria-invalid={erro ? true : undefined}
                  onFocus={() => setFocoEmail(true)} onBlur={() => setFocoEmail(false)}
                  style={{ width: '100%', minHeight: '48px', padding: '12px 20px', borderRadius: t.raio.pill, border: 'none', outline: 'none',
                    background: '#FFFFFF', fontSize: '1rem', fontFamily: t.fonte.corpo, color: t.cor.tinta, marginBottom: '14px',
                    boxShadow: focoEmail ? `inset 0 0 0 2.5px ${t.cor.ouro}, ${t.sombra.anelFoco}` : 'inset 0 0 0 1px #CC7A22, inset 0 1px 3px rgba(25,28,32,0.06)',
                    transition: 'box-shadow .15s' }} />
                <button type="submit" disabled={ocupado} style={botao(false, ocupado)}
                  onMouseOver={(e) => realce(e, true)} onMouseOut={(e) => realce(e, false)}>
                  {ocupado ? 'Enviando…' : 'Enviar link'}
                </button>
              </form>
            </div>
          )}
          {erro && <p id="erro-entrar" role="alert" style={{ color: t.cor.alertaTexto, margin: '12px 4px 0', fontWeight: 600 }}>{erro}</p>}
          <p style={{ color: t.cor.cinza, fontSize: '0.84rem', lineHeight: 1.6, margin: '14px 4px 0' }}>
            Ao entrar, nada é guardado no seu perfil sem você autorizar na página seguinte. Veja{' '}
            <Link href="/privacidade" style={{ color: t.cor.ouroTexto, fontWeight: 700 }}>o que guardamos e como apagar</Link>.
          </p>
        </div>

        {/* SEM SENHA, E DIZENDO POR QUÊ. A falta de senha assusta quem não sabe o motivo. */}
        <div className="entrar-porque">
          <h2 style={{ fontFamily: t.fonte.corpo, fontSize: '1rem', fontWeight: 800, margin: '0 0 6px', color: t.cor.tinta }}>Por que não tem senha?</h2>
          <p style={{ margin: 0, fontSize: '0.92rem', lineHeight: 1.65, color: t.cor.cinza, maxWidth: '52ch' }}>
            Porque senha é o que mais vaza. Entrando com o Google, quem protege a sua conta é o próprio Google, com a
            verificação em duas etapas se você usar. Entrando pelo e-mail, mandamos um link que vale uma vez só: só quem abre
            a sua caixa de entrada consegue entrar. Em nenhum dos dois casos o Lume guarda senha sua.
          </p>
        </div>
      </div>
    </div>
  );
}
