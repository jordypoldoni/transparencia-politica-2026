import { useState, useEffect, useRef } from 'react';
import Head from 'next/head';
import { t } from '../src/estilo/tokens';
import ReplayMapa from '../components/ReplayMapa';
import ReplayLinhaDoTempo from '../components/ReplayLinhaDoTempo';
import ReplayAviso from '../components/ReplayAviso';
import { VELOCIDADES, VELOCIDADE_PADRAO, MINUTOS_TOTAIS, limitarMinuto, avancar } from '../src/lib/replayApuracao';

// PÁGINA DE PRÉVIA (22/10/2026, D-073 e D-074): replay animado da apuração do 1º turno de 2026. ESQUELETO: ainda sem dados (mapa neutro,
// relógio e controles funcionando). Fica fora do menu e do sitemap e leva noindex. Só vive na ramificação previa/apuracao-animada.
// Não altera nenhuma página nem a API da apuração real.

const CSS = `
  .rp { max-width: ${t.larguraMax}; margin: 0 auto; padding: 24px 16px 56px; display: flex; flex-direction: column; gap: 20px; }
  .rp h1 { margin: 0; font: 700 clamp(1.5rem, 4vw, 2.1rem) ${t.fonte.titulo}; color: ${t.cor.verde}; }
  .rp-intro { margin: 0; color: ${t.cor.cinza}; line-height: 1.55; max-width: 62ch; }
  .rp-previa { align-self: flex-start; margin: 0; padding: 6px 14px; border-radius: ${t.raio.pill}; background: ${t.cor.alertaBg}; color: ${t.cor.alertaTexto}; font-size: 0.82rem; font-weight: 700; }
  .rp-cartao { background: ${t.cor.papelCartao}; border-radius: ${t.raio.md}; box-shadow: ${t.sombra.media}; padding: 20px; display: flex; flex-direction: column; gap: 18px; }
  .rp-votos { margin: 0; padding: 14px 16px; background: ${t.cor.papelQuente}; border-radius: ${t.raio.sm}; color: ${t.cor.cinza}; font-size: 0.9rem; line-height: 1.5; }
`;

export default function ApuracaoReplay() {
  const [minuto, setMinuto] = useState(0);
  const [tocando, setTocando] = useState(false);
  const [velocidade, setVelocidade] = useState(VELOCIDADE_PADRAO);
  const ultimo = useRef(null);
  const relogio = useRef(0); // minuto atual, lido pelo laço de animação sem depender do ciclo do React
  const fim = minuto >= MINUTOS_TOTAIS;

  // Relógio do replay: avança só enquanto está tocando, por requestAnimationFrame, e para sozinho no fim.
  useEffect(() => {
    if (!tocando) { ultimo.current = null; return undefined; }
    const minPorSeg = (VELOCIDADES.find((v) => v.chave === velocidade) || VELOCIDADES[1]).minPorSeg;
    let quadro;
    const passo = (agora) => {
      if (ultimo.current == null) ultimo.current = agora;
      const dt = agora - ultimo.current;
      ultimo.current = agora;
      const r = avancar(relogio.current, dt, minPorSeg);
      relogio.current = r.minuto;
      setMinuto(r.minuto);
      if (r.fim) setTocando(false); else quadro = requestAnimationFrame(passo);
    };
    quadro = requestAnimationFrame(passo);
    return () => cancelAnimationFrame(quadro);
  }, [tocando, velocidade]);

  const irPara = (m) => { const v = limitarMinuto(m); relogio.current = v; setMinuto(v); };
  const alternar = () => {
    if (tocando) { setTocando(false); return; }
    if (fim) irPara(0);
    setTocando(true);
  };

  return (
    <>
      <Head>
        <title>Replay da apuração (prévia) | Lume Cidadão</title>
        <meta name="robots" content="noindex, nofollow" />
      </Head>
      <main className="rp">
        <p className="rp-previa">Prévia em construção: esta página não faz parte do site público</p>
        <h1>Replay da apuração do 1º turno de 2026</h1>
        <p className="rp-intro">Veja em que ordem as urnas chegaram ao TSE na noite de 4 de outubro, estado por estado.</p>
        <section className="rp-cartao" aria-label="Replay">
          <ReplayMapa fracao={{}} />
          <ReplayLinhaDoTempo minuto={minuto} tocando={tocando} fim={fim} velocidade={velocidade}
            aoAlternar={alternar} aoMudarMinuto={irPara} aoMudarVelocidade={setVelocidade} />
        </section>
        <p className="rp-votos">A contagem de votos dos candidatos, em ordem fixa por número de urna, entra no próximo passo.</p>
        <ReplayAviso />
      </main>
      <style jsx global>{CSS}</style>
    </>
  );
}
