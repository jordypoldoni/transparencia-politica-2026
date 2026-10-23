import { useEffect, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { t } from '../../src/estilo/tokens';
import { Seta } from '../../components/icones';
import PlanoDoisEixos from '../../components/PlanoDoisEixos';
import { FRASES, OPCOES, FAIXAS, resultado, posicao } from '../../src/lib/joguinhoIdeologia';

// Joguinho (23/10/2026). Uma frase por vez, 5 respostas, resultado em dois eixos (economia e
// costumes) mais a visão geral. Resultado salvo SÓ neste aparelho (localStorage, com try/catch):
// opinião política é dado sensível (LGPD), nada é enviado ao servidor. Salvar no perfil será
// uma etapa própria, com consentimento. Brincadeira educativa: não é pesquisa nem diagnóstico.
const CHAVE = 'lume_joguinho_v1';
const CORES = ['#2C4A82', '#4F6FA5', '#6E6B66', '#B4553A', '#7A1F1F']; // mesma ordem de FAIXAS (esquerda -> direita)

const cartao = { background: t.cor.papelCartao, borderRadius: t.raio.md, padding: '22px', boxShadow: t.sombra.sutil, marginBottom: '16px' };
const botao = { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px', padding: '10px 18px', fontSize: '0.9rem', fontWeight: 700, fontFamily: t.fonte.corpo, borderRadius: t.raio.pill, textDecoration: 'none', border: 'none', cursor: 'pointer', background: '#fff', color: t.cor.tinta, boxShadow: t.sombra.botao };
const botaoPrimario = { ...botao, background: t.cor.verde, color: t.cor.ouro };
const p = { margin: '0 0 10px', fontSize: '0.97rem', lineHeight: 1.6 };

function lerSalvo() {
  try {
    const bruto = window.localStorage.getItem(CHAVE);
    if (!bruto) return null;
    const o = JSON.parse(bruto);
    return o && typeof o === 'object' && o.respostas ? o : null;
  } catch { return null; }
}
function gravar(respostas) {
  try { window.localStorage.setItem(CHAVE, JSON.stringify({ respostas, em: new Date().toISOString() })); } catch { /* sem armazenamento: o resultado só não fica guardado */ }
}
function apagar() {
  try { window.localStorage.removeItem(CHAVE); } catch { /* idem */ }
}

function Regua({ titulo, nota, media }) {
  const pos = posicao(media);
  return (
    <div style={{ marginBottom: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '10px', marginBottom: '8px' }}>
        <h3 style={{ fontFamily: t.fonte.titulo, fontWeight: 600, fontSize: '1.1rem', margin: 0 }}>{titulo}</h3>
        <span style={{ fontWeight: 700, fontSize: '0.9rem', color: t.cor.ouroTexto }}>{nota}</span>
      </div>
      <div role="img" aria-label={`${titulo}: ${nota}`} style={{ position: 'relative', paddingTop: '10px' }}>
        <div style={{ display: 'flex', height: '14px', borderRadius: '8px', overflow: 'hidden' }}>
          {CORES.map((c) => <div key={c} style={{ flex: 1, background: c }} />)}
        </div>
        <div aria-hidden="true" style={{ position: 'absolute', top: 0, left: `${pos}%`, transform: 'translateX(-50%)', width: 0, height: 0 }}>
          <div style={{ width: 18, height: 34, background: t.cor.ouro, borderRadius: 9, transform: 'translateX(-50%)', boxShadow: '0 2px 6px rgba(26,22,70,0.35)', border: '3px solid #fff' }} />
        </div>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: t.cor.cinza, marginTop: '8px' }}>
        <span>Esquerda</span><span>Centro</span><span>Direita</span>
      </div>
    </div>
  );
}

export default function Joguinho() {
  const [pronto, setPronto] = useState(false);
  const [indice, setIndice] = useState(-1); // -1 = tela inicial; FRASES.length = resultado
  const [respostas, setRespostas] = useState({});

  useEffect(() => {
    const s = lerSalvo();
    if (s) { setRespostas(s.respostas); setIndice(FRASES.length); }
    setPronto(true);
  }, []);

  const responder = (valor) => {
    const novas = { ...respostas, [FRASES[indice].id]: valor };
    setRespostas(novas);
    if (indice + 1 >= FRASES.length) { gravar(novas); setIndice(FRASES.length); } else { setIndice(indice + 1); }
  };
  const recomecar = () => { setRespostas({}); setIndice(0); };
  const apagarResultado = () => { apagar(); setRespostas({}); setIndice(-1); };

  const r = resultado(respostas);
  const ativa = indice >= 0 && indice < FRASES.length ? FRASES[indice] : null;

  return (
    <>
      <Head>
        <title>Joguinho: para onde suas respostas apontam? | Lume</title>
        <meta name="description" content="Doze frases, dois eixos (economia e costumes) e um resultado só seu. Uma brincadeira para descobrir para onde suas respostas apontam, sem rótulo de partido." />
        <link rel="canonical" href="https://www.lumecidadao.com.br/entenda/joguinho" />
      </Head>

      <div className="pagina" style={{ maxWidth: '720px' }}>
        <nav aria-label="Você está em" style={{ fontSize: '0.85rem', marginBottom: '12px' }}>
          <Link href="/entenda" style={{ color: t.cor.ouroTexto, fontWeight: 700, textDecoration: 'none' }}>Entenda</Link>
          <span style={{ color: t.cor.cinza }}> / Joguinho</span>
        </nav>

        {!pronto ? null : indice === -1 ? (
          <>
            <h1 style={{ fontFamily: t.fonte.titulo, fontWeight: 600, fontSize: 'clamp(1.8rem,4.5vw,2.6rem)', lineHeight: 1.15, margin: '0 0 12px' }}>Para onde suas respostas apontam?</h1>
            <p style={{ color: t.cor.cinza, fontSize: '1.05rem', margin: '0 0 18px' }}>Doze frases, uma de cada vez. Você diz o quanto concorda e vê o resultado em dois eixos: economia e costumes.</p>
            <div style={cartao}>
              <p style={p}><strong>Antes de começar:</strong></p>
              <p style={p}>Não existe resposta certa, e a ordem das frases mistura os dois lados de propósito. Seu resultado pode cair em lugares diferentes em cada eixo, e isso é comum.</p>
              <p style={{ ...p, color: t.cor.cinza, fontSize: '0.9rem' }}>É uma brincadeira educativa, não uma pesquisa nem o método do Datafolha. Suas respostas ficam só neste aparelho: o Lume não recebe nem guarda nada.</p>
              <button type="button" onClick={() => setIndice(0)} style={botaoPrimario}>Começar<Seta direcao="direita" size={14} emTexto /></button>
            </div>
          </>
        ) : ativa ? (
          <>
            <div role="progressbar" aria-valuemin={0} aria-valuemax={FRASES.length} aria-valuenow={indice} aria-label="Progresso" style={{ height: '8px', background: t.cor.papelQuente2, borderRadius: '8px', overflow: 'hidden', marginBottom: '8px' }}>
              <div style={{ width: `${(indice / FRASES.length) * 100}%`, height: '100%', background: t.cor.ouro, transition: 'width .2s ease' }} />
            </div>
            <p style={{ fontSize: '0.85rem', color: t.cor.cinza, margin: '0 0 18px' }}>Frase {indice + 1} de {FRASES.length}</p>
            <div style={cartao} aria-live="polite">
              <p style={{ fontSize: '0.78rem', fontWeight: 700, color: t.cor.alertaTexto, margin: '0 0 8px' }}>O quanto você concorda?</p>
              <h2 style={{ fontFamily: t.fonte.titulo, fontWeight: 600, fontSize: 'clamp(1.25rem,3.6vw,1.6rem)', lineHeight: 1.35, margin: '0 0 20px' }}>{ativa.texto}</h2>
              <div style={{ display: 'grid', gap: '10px' }}>
                {OPCOES.map((o) => (
                  <button key={o.valor} type="button" onClick={() => responder(o.valor)} style={{ ...botao, width: '100%', justifyContent: 'flex-start', padding: '12px 18px', background: respostas[ativa.id] === o.valor ? t.cor.papelQuente2 : '#fff' }}>{o.rotulo}</button>
                ))}
              </div>
            </div>
            <div>
              {indice > 0 && <button type="button" onClick={() => setIndice(indice - 1)} style={botao}><Seta direcao="esquerda" size={14} emTexto />Voltar</button>}
            </div>
          </>
        ) : (
          <>
            <h1 style={{ fontFamily: t.fonte.titulo, fontWeight: 600, fontSize: 'clamp(1.8rem,4.5vw,2.6rem)', lineHeight: 1.15, margin: '0 0 12px' }}>Suas respostas apontam para: {FAIXAS[r.faixaGeral].toLowerCase()}</h1>
            <p style={{ color: t.cor.cinza, fontSize: '1rem', margin: '0 0 18px' }}>Visão geral das 12 frases, somando os dois eixos. Olhe também cada eixo: eles podem apontar para lados diferentes.</p>
            <div style={cartao}>
              <Regua titulo="Visão geral" nota={FAIXAS[r.faixaGeral]} media={r.geral} />
              <Regua titulo="Economia" nota={FAIXAS[r.faixaEconomia]} media={r.economia} />
              <Regua titulo="Costumes" nota={FAIXAS[r.faixaCostumes]} media={r.costumes} />
              <h3 style={{ fontFamily: t.fonte.titulo, fontWeight: 600, fontSize: '1.1rem', margin: '4px 0 8px' }}>Seu ponto no plano</h3>
              <PlanoDoisEixos economia={r.economia} costumes={r.costumes} legenda="O ponto cruza suas respostas de economia (horizontal) e de costumes (vertical)." />
              {r.faixaEconomia !== r.faixaCostumes && (
                <p style={{ ...p, background: t.cor.alertaBg, borderRadius: t.raio.sm, padding: '12px 14px' }}>
                  Nos seus resultados, economia e costumes caíram em faixas diferentes ({FAIXAS[r.faixaEconomia].toLowerCase()} e {FAIXAS[r.faixaCostumes].toLowerCase()}). Uma linha única de esquerda a direita não mostra isso, e é um dos motivos de existirem modelos com dois eixos.
                </p>
              )}
              <p style={{ ...p, color: t.cor.cinza, fontSize: '0.88rem' }}>
                Como foi calculado: cada resposta vai de -2 a +2, com o sinal invertido nas frases de esquerda. Cada eixo é a média das suas 6 respostas, e a visão geral é a média dos dois eixos. É uma brincadeira educativa: 12 frases não substituem uma pesquisa, e a posição de cada um pode mudar com o tema e com a época.
              </p>
            </div>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '16px' }}>
              <button type="button" onClick={recomecar} style={botaoPrimario}>Jogar de novo</button>
              <Link href="/entenda/esquerda-e-direita" style={botao}>Ver os dados dos brasileiros<Seta direcao="direita" size={14} emTexto /></Link>
              <button type="button" onClick={apagarResultado} style={botao}>Apagar meu resultado deste aparelho</button>
            </div>
          </>
        )}
      </div>
    </>
  );
}
