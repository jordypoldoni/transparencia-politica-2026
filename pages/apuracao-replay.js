import { useState, useEffect, useRef, useMemo } from 'react';
import Head from 'next/head';
import { t } from '../src/estilo/tokens';
import ReplayMapa from '../components/ReplayMapa';
import ReplayCandidatos from '../components/ReplayCandidatos';
import ReplayLinhaDoTempo from '../components/ReplayLinhaDoTempo';
import ReplayAviso from '../components/ReplayAviso';
import { VELOCIDADES, VELOCIDADE_PADRAO, MINUTOS_TOTAIS, limitarMinuto, avancar, fracoes, urnasRecebidas, recebendoAgora, votosNoMinuto, UFS_SEM_DETALHE } from '../src/lib/replayApuracao';

// PÁGINA DE PRÉVIA (22/10/2026, D-073 e D-074): replay animado da apuração do 1º turno de 2026. Já pinta o mapa com as seções recebidas
// por estado a cada minuto (public/replay/1t-2026-secoes.json); a contagem de votos entra no passo seguinte. Fica fora do menu e do sitemap
// e leva noindex. Só vive na ramificação previa/apuracao-animada.
// Não altera nenhuma página nem a API da apuração real.
// LAYOUT (22/10, pedido do Jordy): tudo que importa cabe na primeira tela do computador, sem rolar. A altura da tela decide o tamanho do mapa
// (src do mapa), a legenda mora ao lado dele e à direita ficam relógio, controles, espaço dos candidatos e avisos, sem encolher o texto.
// No celular as partes empilham na mesma ordem.

const CSS = `
  .rp { max-width: 1480px; margin: 0 auto; padding: 14px 20px 32px; display: flex; flex-direction: column; gap: 12px; }
  .rp-cab { display: flex; flex-wrap: wrap; align-items: baseline; gap: 2px 16px; }
  .rp h1 { margin: 0; font: 700 clamp(1.3rem, 3vw, 1.7rem) ${t.fonte.titulo}; color: ${t.cor.verde}; }
    .rp-intro { margin: 0; color: ${t.cor.cinza}; font-size: 0.9rem; line-height: 1.4; }
  .rp-cartao { background: ${t.cor.papelCartao}; border-radius: ${t.raio.md}; box-shadow: ${t.sombra.media}; padding: 16px 20px 18px; display: grid; grid-template-columns: 1fr; gap: 16px; }
  .rp-faixa { grid-column: 1 / -1; }
  .rp-lado { display: flex; flex-direction: column; gap: 14px; min-width: 0; }
  .rp-votos { margin: 0; flex: 1; min-height: 56px; padding: 12px 16px; background: ${t.cor.papelQuente}; border-radius: ${t.raio.sm}; color: ${t.cor.cinza}; font-size: 0.92rem; line-height: 1.5; }
  .rp-votos strong { display: block; margin-bottom: 2px; color: ${t.cor.tinta}; font-size: 1rem; }
  .rp-erro { margin: 0; font-size: 0.9rem; color: ${t.cor.alertaTexto}; }
  @media (min-width: 900px) {
    .rp-cartao { grid-template-columns: minmax(0, 1.5fr) minmax(380px, 1fr); gap: 16px 28px; align-items: stretch; }
  }
`;

export default function ApuracaoReplay() {
  const [minuto, setMinuto] = useState(0);
  const [tocando, setTocando] = useState(false);
  const [velocidade, setVelocidade] = useState(VELOCIDADE_PADRAO);
  const [dados, setDados] = useState(null);
  const [votos, setVotos] = useState(null);
  const [ufSel, setUfSel] = useState(null); // estado escolhido no mapa (detalhe dos votos); null = total do replay
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
    // Votos por candidato (arquivo estático, ~1,1 MB, ~170 KB comprimido): carregado à parte; se falhar, só o painel de votos fica sem dados.
    fetch('/replay/1t-2026-votos.json', { signal: ctl.signal })
      .then((r) => { if (!r.ok) throw new Error(String(r.status)); return r.json(); })
      .then(setVotos)
      .catch((e) => { if (e.name !== 'AbortError') setErroDados(true); });
    return () => ctl.abort();
  }, []);

  const mi = Math.floor(minuto);
  const fracao = useMemo(() => fracoes(dados, mi), [dados, mi]);
  const resumo = useMemo(() => urnasRecebidas(dados, mi), [dados, mi]);
  const recebendo = useMemo(() => recebendoAgora(dados, mi), [dados, mi]);
  const votosAgora = useMemo(() => votosNoMinuto(votos, mi, ufSel), [votos, mi, ufSel]);
  const votosFinal = useMemo(() => votosNoMinuto(votos, MINUTOS_TOTAIS, ufSel), [votos, ufSel]);
  const escolher = (uf) => setUfSel((atual) => (atual === uf ? null : uf));

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
          <p className="rp-intro">Veja em que ordem as urnas chegaram ao TSE na noite de 4 de outubro, estado por estado.</p>
        </header>
        <section className="rp-cartao" aria-label="Replay">
          <div className="rp-faixa">
            <ReplayLinhaDoTempo minuto={minuto} tocando={tocando} fim={fim} velocidade={velocidade} resumo={dados ? resumo : null} recebendo={dados ? recebendo : null}
              aoAlternar={alternar} aoMudarMinuto={irPara} aoMudarVelocidade={setVelocidade} />
          </div>
          <ReplayMapa fracao={fracao} recebendo={recebendo} selecionada={ufSel} aoEscolher={escolher} />
          <div className="rp-lado">
            {erroDados && <p className="rp-erro" role="status">Não foi possível carregar os dados do replay. Tente recarregar a página.</p>}
            <ReplayCandidatos parcial={votos ? votosAgora : null} final={votos ? votosFinal : null} uf={ufSel} fracaoUf={ufSel ? fracao[ufSel] : null} semHorario={ufSel ? UFS_SEM_DETALHE.includes(ufSel) : false} aoVoltar={() => setUfSel(null)} />
            <ReplayAviso />
          </div>
        </section>
      </main>
      <style jsx global>{CSS}</style>
    </>
  );
}
