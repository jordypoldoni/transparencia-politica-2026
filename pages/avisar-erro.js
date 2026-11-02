import { useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { t } from '../src/estilo/tokens';
import Giro from '../components/Giro';
import { caminhoSeguro, MIN_DESCRICAO, MAX_DESCRICAO } from '../src/lib/avisoErro';

// AVISAR DE UM ERRO (02/11/2026). Formulário que grava no banco 2 (tabela avisos_erro, pela rota /api/avisar-erro).
// Substitui o e-mail pronto (mailto), que não funcionava sem programa de e-mail configurado.
// Nada de comentário público: o aviso só chega ao Jordy. O e-mail de retorno é opcional.
const rotulo = { display: 'block', margin: '0 0 6px', fontSize: '0.86rem', fontWeight: 700, color: t.cor.tinta };
const campo = (erro) => ({ width: '100%', border: 'none', outline: 'none', borderRadius: '14px', padding: '12px 14px', fontFamily: t.fonte.corpo, fontSize: '1rem', lineHeight: 1.45, color: t.cor.tinta, background: '#fff', boxShadow: erro ? `inset 0 0 0 2px ${t.cor.nao}` : 'inset 0 0 0 1px #CC7A22' });
const foco = (e) => { e.target.style.boxShadow = `inset 0 0 0 2.5px ${t.cor.ouro}, ${t.sombra.anelFoco}`; };
const sai = (e) => { e.target.style.boxShadow = 'inset 0 0 0 1px #CC7A22'; };
const ajuda = { margin: '6px 0 0', fontSize: '0.8rem', color: t.cor.cinza, lineHeight: 1.5 };

export default function AvisarErro() {
  const { query, isReady } = useRouter();
  const q = (k) => (Array.isArray(query[k]) ? query[k][0] : query[k]) || '';
  const paginaDoLink = caminhoSeguro(q('pagina'));
  const assunto = q('assunto').slice(0, 120);
  const detalhe = q('detalhe').slice(0, 120);

  const [descricao, setDescricao] = useState('');
  const [fonte, setFonte] = useState('');
  const [email, setEmail] = useState('');
  const [paginaLivre, setPaginaLivre] = useState('');
  const [site, setSite] = useState(''); // campo escondido: só robô preenche
  const [erro, setErro] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado] = useState(false);

  const pagina = paginaDoLink || caminhoSeguro(paginaLivre);

  const enviar = async (e) => {
    e.preventDefault();
    if (enviando) return;
    setErro(''); setEnviando(true);
    try {
      const r = await fetch('/api/avisar-erro', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pagina, assunto, detalhe, descricao, fonte, email, site }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) { setErro(j.erro || 'Não foi possível enviar agora. Tente de novo.'); setEnviando(false); return; }
      setEnviado(true);
    } catch (_) {
      setErro('Sem conexão agora. Confira a internet e tente de novo.');
    }
    setEnviando(false);
  };

  return (
    <div className="pagina">
      <Head>
        <title>Avisar de um erro | Lume Cidadão</title>
        <meta name="robots" content="noindex" />
      </Head>
      <div className="leitura">
        <span style={{ fontSize: '0.8rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: t.cor.ouroTexto }}>Correções</span>
        <h1 style={{ fontFamily: t.fonte.titulo, fontWeight: 600, fontSize: 'clamp(2rem,5vw,2.8rem)', lineHeight: 1.1, margin: '12px 0 16px' }}>Avisar de um erro</h1>

        {enviado ? (
          <div role="status" style={{ background: t.cor.papelQuente, borderRadius: t.raio.md, padding: '18px 20px', boxShadow: t.sombra.sutil }}>
            <p style={{ margin: '0 0 8px', fontFamily: t.fonte.titulo, fontWeight: 600, fontSize: '1.2rem', color: t.cor.tinta }}>Aviso recebido, obrigado.</p>
            <p style={{ margin: '0 0 14px', color: t.cor.cinza, lineHeight: 1.6 }}>
              Vamos conferir com a fonte oficial. Se o erro for nosso, a correção aparece na página de Correções.
            </p>
            <p style={{ margin: 0 }}>
              {paginaDoLink && <><Link href={paginaDoLink} style={{ color: t.cor.ouroTexto, fontWeight: 700 }}>Voltar para a página</Link>{' · '}</>}
              <Link href="/correcoes" style={{ color: t.cor.ouroTexto, fontWeight: 700 }}>Ver correções</Link>
            </p>
          </div>
        ) : (
          <form onSubmit={enviar} noValidate>
            <p style={{ color: t.cor.cinza, lineHeight: 1.65, margin: '0 0 18px' }}>
              Viu algo diferente do que a fonte oficial mostra? Conte aqui. Só o responsável pelo Lume lê o aviso, e nada vira comentário público.
            </p>

            {paginaDoLink ? (
              <p style={{ margin: '0 0 6px', fontSize: '0.9rem', color: t.cor.cinza, wordBreak: 'break-word' }}>
                <strong style={{ color: t.cor.tinta }}>Página:</strong> lumecidadao.com.br{paginaDoLink}
              </p>
            ) : isReady && (
              <div style={{ margin: '0 0 6px' }}>
                <label htmlFor="aviso-pagina" style={rotulo}>Em qual página do Lume? (opcional)</label>
                <input id="aviso-pagina" type="text" inputMode="url" value={paginaLivre} onChange={(e) => setPaginaLivre(e.target.value)} placeholder="/deputado/nome-do-parlamentar"
                  style={campo(false)} onFocus={foco} onBlur={sai} />
              </div>
            )}
            {assunto && <p style={{ margin: '0 0 6px', fontSize: '0.9rem', color: t.cor.cinza }}><strong style={{ color: t.cor.tinta }}>Assunto:</strong> {assunto}</p>}
            {detalhe && <p style={{ margin: '0 0 6px', fontSize: '0.9rem', color: t.cor.cinza }}><strong style={{ color: t.cor.tinta }}>Dado em dúvida:</strong> {detalhe}</p>}

            <div style={{ margin: '18px 0 0' }}>
              <label htmlFor="aviso-descricao" style={rotulo}>O que está errado?</label>
              <textarea id="aviso-descricao" rows={5} value={descricao} maxLength={MAX_DESCRICAO + 50} required
                onChange={(e) => { setDescricao(e.target.value); if (erro) setErro(''); }} aria-invalid={!!erro} aria-describedby="aviso-ajuda-desc"
                style={{ ...campo(false), resize: 'vertical' }} onFocus={foco} onBlur={sai} />
              <p id="aviso-ajuda-desc" style={ajuda}>Diga o que você viu e o que a fonte oficial mostra. Mínimo de {MIN_DESCRICAO} letras. Não escreva dados pessoais de terceiros.</p>
            </div>

            <div style={{ margin: '18px 0 0' }}>
              <label htmlFor="aviso-fonte" style={rotulo}>Link da fonte oficial (opcional)</label>
              <input id="aviso-fonte" type="url" inputMode="url" value={fonte} onChange={(e) => setFonte(e.target.value)} placeholder="https://"
                style={campo(false)} onFocus={foco} onBlur={sai} />
            </div>

            <div style={{ margin: '18px 0 0' }}>
              <label htmlFor="aviso-email" style={rotulo}>Seu e-mail, se quiser resposta (opcional)</label>
              <input id="aviso-email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)}
                style={campo(false)} onFocus={foco} onBlur={sai} />
              <p style={ajuda}>Usamos só para responder este aviso. Veja em <Link href="/privacidade" style={{ color: t.cor.ouroTexto, fontWeight: 700 }}>Privacidade</Link> como guardamos.</p>
            </div>

            {/* Campo escondido contra robô: pessoas não veem nem preenchem. */}
            <div aria-hidden="true" style={{ position: 'absolute', left: '-9999px', width: '1px', height: '1px', overflow: 'hidden' }}>
              <label htmlFor="aviso-site">Não preencha este campo</label>
              <input id="aviso-site" type="text" tabIndex={-1} autoComplete="off" value={site} onChange={(e) => setSite(e.target.value)} />
            </div>

            {erro && <p role="alert" style={{ margin: '16px 0 0', fontSize: '0.9rem', fontWeight: 600, color: t.cor.nao }}>{erro}</p>}

            <div style={{ marginTop: '22px' }}>
              <button type="submit" disabled={enviando}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', border: 'none', background: t.cor.verde, color: t.cor.ouro, fontFamily: t.fonte.corpo, fontSize: '0.95rem', fontWeight: 700, padding: '12px 26px', borderRadius: t.raio.pill, boxShadow: t.sombra.botao, cursor: enviando ? 'default' : 'pointer', opacity: enviando ? 0.85 : 1 }}>
                {enviando && <Giro tamanho={16} />}{enviando ? 'Enviando…' : 'Enviar aviso'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
