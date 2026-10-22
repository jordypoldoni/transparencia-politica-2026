import { useState, useEffect, useRef, useMemo } from 'react';
import Head from 'next/head';
import { t } from '../src/estilo/tokens';
import ReplayMapa from '../components/ReplayMapa';
import ReplayLinhaDoTempo from '../components/ReplayLinhaDoTempo';
import ReplayAviso from '../components/ReplayAviso';
import { VELOCIDADES, VELOCIDADE_PADRAO, MINUTOS_TOTAIS, limitarMinuto, avancar, fracoes, urnasRecebidas } from '../src/lib/replayApuracao';

// PÁGINA DE PRÉVIA (22/10/2026, D-073 e D-074): replay animado da apuração do 1º turno de 2026. Já pinta o mapa com as seções recebidas
// por estado a cada minuto (public/replay/1t-2026-secoes.json); a contagem de votos entra no passo seguinte. Fica fora do menu e do sitemap
// e leva noindex. Só vive na ramificação previa/apuracao-animada.
// Não altera nenhuma página nem a API da apuração real.
// LAYOUT (22/10, pedido do Jordy): tudo que importa cabe na primeira tela do computador, sem rolar. A altura da tela decide o tamanho do mapa
// (src do mapa), a legenda mora ao lado dele e à direita ficam relógio, controles, espaço dos candidatos e avisos, sem encolher o texto.
// No celular as partes empilham na mesma ordem.

const CSS = `
  .rp { max-width: 1240px; margin: 0 auto; padding: 14px 20px 32px; display: flex; flex-direction: column; gap: 12px; }
  .rp-cab { display: flex; flex-wrap: wrap; align-items: center; gap: 4px 14px; }
  .rp h1 { margin: 0; font: 700 clamp(1.3rem, 3vw, 1.7rem) ${t.fonte.titulo}; color: ${t.cor.verde}; }
  .rp-previa { margin: 0; padding: 4px 12px; border-radius: ${t.raio.pill}; background: ${t.cor.alertaBg}; color: ${t.cor.alertaTexto}; font-size: 0.75rem; font-weight: 700; }
  .rp-intro { flex-basis: 100%; margin: 0; color: ${t.cor.cinza}; font-size: 0.9rem; line-height: 1.4; }
  .rp-cartao { background: ${t.cor.papelCartao}; border-radius: ${t.raio.md}; box-shadow: ${t.sombra.media}; padding: 18px 20px; display: grid; grid-template-columns: 1fr; gap: 18px; }
  .rp-lado { display: flex; flex-direction: column; gap: 14px; min-width: 0; }
  .rp-votos { margin: 0; flex: 1; min-height: 64px; padding: 14px 16px; background: ${t.cor.papelQuente}; border-radius: ${t.raio.sm}; color: ${t.cor.cinza}; font-size: 0.92rem; line-height: 1.5; }
  .rp-votos strong { display: block; margin-bottom: 2px; color: ${t.cor.tinta}; font-size: 1rem; }
  .rp-erro { margin: 0; font-size: 0.9rem; color: ${t.cor.alertaTexto}; }
  @media (min-width: 900px) {
    .rp-cartao { grid-template-columns: minmax(0, 1.12fr) minmax(360px, 1fr); gap: 28px; align-items: stretch; }
  }
`;

export default function ApuracaoReplay() {
  const [minuto, setMinuto] = useState(0);
  const [tocando, setTocando] = useState(false);
  const [velocidade, setVelocidade] = useState(VELOCIDADE_PADRAO);
  const [dados, setDados] = useState(null);
  const [erroDados, setErroDados] = useState(false);
  const ultimo = useRef(null);
  const relogio = useRef(0); // minuto atual, lido pelo laço de animação sem depender do ciclo do React
  const fim = minuto >= MINUTOS_TOTAIS;

  // Dados do 1º turno (arquivo estático, ~78 KB): carregados uma vez; sem eles o mapa fica neutro e a página avisa.
  useEffect(() => {
    const ctl = new AbortController();
    fetch('/replay/1t-2026-secoes.json', { signal: ctl.signal })
      .then((r) => { if (!r.ok) throw new Error(String(r.status)); return r.json(); })
      .then(setDados)
      .catch((e) => { if (e.name !== 'AbortError') setErroDados(true); });
    return () => ctl.abort();
  }, []);

  const mi = Math.floor(minuto);
  const fracao = useMemo(() => fracoes(dados, mi), [dados, mi]);
  const resumo = useMemo(() => urnasRecebidas(dados, mi), [dados, mi]);

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
        <header className="rp-cab">
          <h1>Replay da apuração do 1º turno de 2026</h1>
          <p className="rp-previa">Prévia em construção: fora do site público</p>
          <p className="rp-intro">Veja em que ordem as urnas chegaram ao TSE na noite de 4 de outubro, estado por estado.</p>
        </header>
        <section className="rp-cartao" aria-label="Replay">
          <ReplayMapa fracao={fracao} />
          <div className="rp-lado">
            <ReplayLinhaDoTempo minuto={minuto} tocando={tocando} fim={fim} velocidade={velocidade} resumo={dados ? resumo : null}
              aoAlternar={alternar} aoMudarMinuto={irPara} aoMudarVelocidade={setVelocidade} />
            {erroDados && <p className="rp-erro" role="status">Não foi possível carregar os dados do replay. Tente recarregar a página.</p>}
            <p className="rp-votos"><strong>Votos dos candidatos</strong>Entram no próximo passo, em ordem fixa por número de urna.</p>
            <ReplayAviso />
          </div>
        </section>
      </main>
      <style jsx global>{CSS}</style>
    </>
  );
}
