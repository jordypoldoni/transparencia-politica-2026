import { t } from '../src/estilo/tokens';
import { MAPA_BRASIL } from '../src/lib/mapaBrasilGeo';
import { REGIOES, ORDEM_REGIOES } from '../src/lib/mapaRegioes';
import { listaE } from '../src/lib/replayApuracao';

// MAPA DO REPLAY (22/10/2026, D-074). Só desenha: recebe `fracao` ({ UF: 0 a 1 } = parte das seções do estado que já chegaram ao TSE
// no horário escolhido). A cor marca a REGIÃO (D-026, nunca partido); o estado enche de baixo para cima conforme as urnas chegam. Estado sem urna recebida
// fica cinza. MS, RN, SE e TO não têm linha do tempo (arquivo do TSE incompleto) e ficam hachurados.
// Usa só a geometria de src/lib/mapaBrasilGeo.js; não depende do mapa da apuração real.
// TAMANHO: a altura da janela decide (--rm-h) e a largura livre limita; a caixa do SVG tem sempre a proporção do desenho, então o mapa
// cresce de verdade com o espaço (sem sobra em cima e embaixo). No computador a legenda fica ao lado, em coluna, e não rouba altura.
const SEM_DADOS = '#D9D6CE';
// Cores só desta página: o Sul usa rosa/tijolo (o roxo do mapa geral ficava parecido com o azul do Sudeste). Região segue marcando a cor, nunca partido (D-026).
const COR = { N: REGIOES.N.cor, NE: REGIOES.NE.cor, CO: REGIOES.CO.cor, SE: REGIOES.SE.cor, S: '#C0506A' };
const PEQUENOS = new Set(['RN', 'PB', 'AL', 'SE', 'ES', 'RJ', 'DF']); // pequenos demais para a sigla dentro
const PROPORCAO = MAPA_BRASIL.largura / MAPA_BRASIL.altura;

export default function ReplayMapa({ fracao = {}, recebendo = [], estimadas = [], selecionada = null, aoEscolher }) {
  // Ordem de desenho: o estado escolhido por último (contorno inteiro à vista), antes dele os que estão recebendo urnas.
  const peso = (uf) => (uf === selecionada ? 2 : recebendo.includes(uf) ? 1 : 0);
  const tecla = (uf) => (ev) => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); aoEscolher && aoEscolher(uf); } };
  return (
    <figure className="rm">
      <div className="rm-box">
      <svg viewBox={MAPA_BRASIL.viewBox} className="rm-svg" role="img"
        aria-label="Mapa do Brasil com os 27 estados. O preenchimento de cada estado mostra quanto das urnas já chegou ao TSE no horário escolhido.">
        <defs>
          {/* Hachura por cima dos estados com horário ESTIMADO (votos finais oficiais, ritmo de chegada estimado). */}
          <pattern id="rm-estimado" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <rect width="2" height="7" fill="#FFFFFF" fillOpacity="0.55" />
          </pattern>
          {/* Preenchimento: o estado enche de baixo para cima na proporção das urnas recebidas (igual em todos os estados; não tem sentido geográfico). */}
          {MAPA_BRASIL.estados.map((geo) => {
            const f = Math.min(1, Math.max(0, Number(fracao[geo.uf]) || 0));
            const cor = COR[geo.regiao];
            return (
              <linearGradient key={geo.uf} id={`rm-g-${geo.uf}`} x1="0" y1="1" x2="0" y2="0">
                <stop offset={f} stopColor={cor} />
                <stop offset={f} stopColor={SEM_DADOS} />
              </linearGradient>
            );
          })}
        </defs>
        {[...MAPA_BRASIL.estados].sort((a, b) => peso(a.uf) - peso(b.uf)).map((geo) => {
          const f = Math.min(1, Math.max(0, Number(fracao[geo.uf]) || 0));
          const fill = f > 0 ? `url(#rm-g-${geo.uf})` : SEM_DADOS;
          return (
            <g key={geo.uf}>
              <path d={geo.d} className={`rm-uf${recebendo.includes(geo.uf) ? ' rm-vivo' : ''}${geo.uf === selecionada ? ' rm-sel' : ''}`} style={{ fill }}
            role="button" tabIndex={0} aria-pressed={geo.uf === selecionada} aria-label={`${geo.nome}: ver os votos deste estado`}
            onClick={() => aoEscolher && aoEscolher(geo.uf)} onKeyDown={tecla(geo.uf)} />
              {estimadas.includes(geo.uf) && <path d={geo.d} fill="url(#rm-estimado)" stroke="none" pointerEvents="none" />}
            </g>
          );
        })}
        {MAPA_BRASIL.estados.filter((g) => !PEQUENOS.has(g.uf)).map((geo) => (
          <text key={geo.uf} x={geo.cx} y={geo.cy} className="rm-sigla" textAnchor="middle" dominantBaseline="central">{geo.uf}</text>
        ))}
      </svg>
      </div>
      <figcaption className="rm-leg">
        {ORDEM_REGIOES.map((k) => (
          <span key={k} className="rm-item"><i style={{ background: COR[k] }} />{REGIOES[k].nome}</span>
        ))}
        <span className="rm-item"><i style={{ background: SEM_DADOS }} />Nenhuma urna recebida</span>
        <span className="rm-item"><i className="rm-nivel" />Preenchimento: urnas recebidas</span>
        <span className="rm-item"><i className="rm-pulso" />Contorno pulsando: recebendo urnas</span>
        {estimadas.length > 0 && <span className="rm-item"><i className="rm-hach" />Horário estimado: {listaE(estimadas)}</span>}
      </figcaption>
      <style jsx global>{`
        .rm { --rm-h: clamp(300px, calc(100vh - 305px), 700px); margin: 0; display: flex; flex-direction: column; align-items: center; gap: 12px; }
        .rm-box { flex: 0 1 auto; width: min(100%, calc(var(--rm-h) * ${PROPORCAO.toFixed(4)})); aspect-ratio: ${MAPA_BRASIL.largura} / ${MAPA_BRASIL.altura}; }
        .rm-svg { display: block; width: 100%; height: 100%; }
        .rm-uf { stroke: ${t.cor.papelCartao}; stroke-width: 1; }
        .rm-uf { cursor: pointer; outline: none; }
        .rm-uf:hover { stroke: ${t.cor.tinta}; stroke-width: 1.8; }
        .rm-uf:focus-visible { outline: none; stroke: ${t.cor.tinta}; stroke-width: 2.6; }
        .rm-uf.rm-sel, .rm-uf.rm-sel:hover { stroke: ${t.cor.tinta}; stroke-width: 3; animation: none; stroke-opacity: 1; }
        .rm-vivo { stroke: ${t.cor.tinta}; stroke-width: 2.2; animation: rm-pulso 1.6s ease-in-out infinite; }
        @keyframes rm-pulso { 0%, 100% { stroke-opacity: 0.25; } 50% { stroke-opacity: 1; } }
        @media (prefers-reduced-motion: reduce) { .rm-vivo { animation: none; stroke-opacity: 0.8; } }
        .rm-sigla { font: 700 11px ${t.fonte.corpo}; fill: ${t.cor.tinta}; pointer-events: none; paint-order: stroke; stroke: rgba(255,255,255,0.75); stroke-width: 2.5px; }
        .rm-leg { display: flex; flex-wrap: wrap; gap: 6px 16px; justify-content: center; font-size: 0.85rem; color: ${t.cor.cinza}; }
        .rm-item { display: inline-flex; align-items: center; gap: 8px; }
        .rm-item i { display: inline-block; width: 12px; height: 12px; border-radius: 3px; flex: none; }
        .rm-pulso { background: transparent; box-shadow: inset 0 0 0 2px ${t.cor.tinta}; }
        .rm-hach { background: repeating-linear-gradient(45deg, #8B8F98 0 2px, #D9D6CE 2px 5px); }
        .rm-nivel { background: linear-gradient(0deg, #6B7280 55%, ${'#D9D6CE'} 55%); }
        /* Computador: a legenda vai para o lado do mapa, em coluna. O grupo (legenda + mapa) fica centralizado na coluna. */
        /* Computador: a altura da linha é a da coluna da direita (votos); o mapa ocupa TODO o espaço da célula (largura e altura) e o desenho
           se ajusta a ele sem deformar. A legenda fica em coluna ao lado, centralizada na altura. */
        @media (min-width: 900px) {
          .rm { flex-direction: row; align-items: stretch; justify-content: center; gap: 22px; }
          .rm-box { order: 2; flex: 1 1 0; min-width: 0; width: auto; aspect-ratio: auto; position: relative; min-height: 380px; }
          .rm-svg { position: absolute; inset: 0; }
          .rm-leg { order: 1; flex: none; width: 210px; flex-direction: column; flex-wrap: nowrap; align-items: flex-start; justify-content: center; gap: 8px; line-height: 1.3; }
        }
      `}</style>
    </figure>
  );
}
