import { useEffect, useRef, useState } from 'react';
import { t } from '../src/estilo/tokens';
import { desenharImagem, canvasParaArquivo, FORMATOS, URL_JOGO } from '../src/lib/joguinhoImagem';

// Compartilhar o resultado do joguinho (23/10/2026): imagem em post ou story, fundo escuro ou
// claro, e o usuário escolhe o que mostrar (por padrão só a visão geral). A imagem é desenhada
// no navegador dele e não passa pelo servidor. Opinião política é dado sensível (LGPD): só sai
// do aparelho se ele mesmo compartilhar ou baixar.
const ITENS = [['geral', 'Visão geral'], ['economia', 'Economia'], ['costumes', 'Costumes'], ['plano', 'Plano de dois eixos']];

function Escolha({ valor, atual, onEscolher, children }) {
  const on = valor === atual;
  return (
    <button type="button" aria-pressed={on} onClick={() => onEscolher(valor)} style={{ padding: '9px 16px', fontSize: '0.88rem', fontWeight: 700, fontFamily: t.fonte.corpo, borderRadius: t.raio.pill, border: 'none', cursor: 'pointer', background: on ? t.cor.verde : '#fff', color: on ? t.cor.ouro : t.cor.tinta, boxShadow: on ? t.sombra.botao : t.sombra.clicavel }}>{children}</button>
  );
}
const rotulo = { fontSize: '0.78rem', fontWeight: 700, color: t.cor.alertaTexto, margin: '0 0 8px' };

export default function CompartilharJoguinho({ r, cartao, botao, botaoPrimario }) {
  const canvas = useRef(null);
  const [formato, setFormato] = useState('post');
  const [tema, setTema] = useState('escuro');
  const [mostrar, setMostrar] = useState({ geral: true, economia: false, costumes: false, plano: false });
  const [aviso, setAviso] = useState('');
  const [podeCompartilhar, setPodeCompartilhar] = useState(false);

  useEffect(() => {
    try { setPodeCompartilhar(typeof navigator !== 'undefined' && !!navigator.canShare && navigator.canShare({ files: [new File([''], 'a.png', { type: 'image/png' })] })); } catch { setPodeCompartilhar(false); }
  }, []);
  useEffect(() => {
    let vivo = true;
    desenharImagem(canvas.current, { formato, tema, mostrar, r }).catch(() => { if (vivo) setAviso('Não deu para montar a imagem neste navegador.'); });
    return () => { vivo = false; };
  }, [formato, tema, mostrar, r]);

  const nome = `lume-joguinho-${formato}.png`;
  const baixar = async () => {
    setAviso('');
    const arq = await canvasParaArquivo(canvas.current, nome);
    if (!arq) { setAviso('Não deu para gerar o arquivo.'); return; }
    const url = URL.createObjectURL(arq);
    const a = document.createElement('a'); a.href = url; a.download = nome; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  };
  const compartilhar = async () => {
    setAviso('');
    const arq = await canvasParaArquivo(canvas.current, nome);
    if (!arq) { setAviso('Não deu para gerar o arquivo.'); return; }
    try { await navigator.share({ files: [arq], text: `Meu resultado no joguinho do Lume. Jogue também: ${URL_JOGO}` }); }
    catch (e) { if (e && e.name !== 'AbortError') setAviso('Não deu para abrir o compartilhamento. Use "Baixar imagem".'); }
  };
  const alterna = (k) => setMostrar((m) => ({ ...m, [k]: !m[k] }));
  const F = FORMATOS[formato];

  return (
    <div style={cartao}>
      <h3 style={{ fontFamily: t.fonte.titulo, fontWeight: 600, fontSize: '1.1rem', margin: '0 0 4px' }}>Compartilhe seu resultado</h3>
      <p style={{ color: t.cor.cinza, fontSize: '0.9rem', margin: '0 0 16px' }}>Monte uma imagem para postar no Instagram ou no Facebook. Você escolhe o que aparece, e ela é criada no seu aparelho.</p>
      <p style={rotulo}>Formato</p>
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'center', marginBottom: '14px' }}>
        <Escolha valor="post" atual={formato} onEscolher={setFormato}>Post</Escolha>
        <Escolha valor="story" atual={formato} onEscolher={setFormato}>Story</Escolha>
      </div>
      <p style={rotulo}>Fundo</p>
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'center', marginBottom: '14px' }}>
        <Escolha valor="escuro" atual={tema} onEscolher={setTema}>Escuro</Escolha>
        <Escolha valor="claro" atual={tema} onEscolher={setTema}>Claro</Escolha>
      </div>
      <p style={rotulo}>O que mostrar na imagem</p>
      <div style={{ display: 'flex', gap: '8px 18px', flexWrap: 'wrap', justifyContent: 'center', marginBottom: '18px' }}>
        {ITENS.map(([k, nomeItem]) => (
          <label key={k} style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', fontSize: '0.92rem', cursor: 'pointer' }}>
            <input type="checkbox" checked={!!mostrar[k]} onChange={() => alterna(k)} style={{ width: 18, height: 18, accentColor: t.cor.verde }} />{nomeItem}
          </label>
        ))}
      </div>
      <canvas ref={canvas} role="img" aria-label="Prévia da imagem de compartilhamento" style={{ display: 'block', margin: '0 auto 16px', width: '100%', maxWidth: formato === 'story' ? '300px' : '380px', height: 'auto', aspectRatio: `${F.w} / ${F.h}`, borderRadius: t.raio.sm, boxShadow: t.sombra.media }} />
      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', justifyContent: 'center' }}>
        {podeCompartilhar && <button type="button" onClick={compartilhar} style={botaoPrimario}>Compartilhar</button>}
        <button type="button" onClick={baixar} style={podeCompartilhar ? botao : botaoPrimario}>Baixar imagem</button>
      </div>
      {aviso && <p role="status" style={{ textAlign: 'center', color: t.cor.alertaTexto, fontSize: '0.88rem', margin: '12px 0 0' }}>{aviso}</p>}
    </div>
  );
}
