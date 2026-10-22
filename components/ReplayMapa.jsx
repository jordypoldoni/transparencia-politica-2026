import { t } from '../src/estilo/tokens';
import { MAPA_BRASIL } from '../src/lib/mapaBrasilGeo';
import { REGIOES, ORDEM_REGIOES } from '../src/lib/mapaRegioes';
import { UFS_SEM_DETALHE } from '../src/lib/replayApuracao';

// MAPA DO REPLAY (22/10/2026, D-074). Só desenha: recebe `fracao` ({ UF: 0 a 1 } = parte das seções do estado que já chegaram ao TSE
// no horário escolhido). A cor marca a REGIÃO (D-026, nunca partido); a intensidade marca quanto já chegou. Estado sem urna recebida
// fica cinza. MS, RN, SE e TO não têm linha do tempo (arquivo do TSE incompleto) e ficam hachurados.
// Usa só a geometria de src/lib/mapaBrasilGeo.js; não depende do mapa da apuração real.
// TAMANHO: a altura da janela decide (--rm-h) e a largura livre limita; a caixa do SVG tem sempre a proporção do desenho, então o mapa
// cresce de verdade com o espaço (sem sobra em cima e embaixo). No computador a legenda fica ao lado, em coluna, e não rouba altura.
const SEM_DADOS = '#D9D6CE';
const PEQUENOS = new Set(['RN', 'PB', 'AL', 'SE', 'ES', 'RJ', 'DF']); // pequenos demais para a sigla dentro
const PROPORCAO = MAPA_BRASIL.largura / MAPA_BRASIL.altura;

export default function ReplayMapa({ fracao = {} }) {
  return (
    <figure className="rm">
      <svg viewBox={MAPA_BRASIL.viewBox} className="rm-svg" role="img"
        aria-label="Mapa do Brasil com os 27 estados. A intensidade da cor mostra quanto das urnas de cada estado já chegou ao TSE no horário escolhido.">
        <defs>
          <pattern id="rm-hachura" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <rect width="8" height="8" fill="#ECE9E2" />
            <rect width="3" height="8" fill="#C9C5BA" />
          </pattern>
        </defs>
        {MAPA_BRASIL.estados.map((geo) => {
          const semDetalhe = UFS_SEM_DETALHE.includes(geo.uf);
          const f = Math.min(1, Math.max(0, Number(fracao[geo.uf]) || 0));
          const style = semDetalhe
            ? { fill: 'url(#rm-hachura)' }
            : f > 0 ? { fill: REGIOES[geo.regiao].cor, fillOpacity: 0.28 + 0.72 * f } : { fill: SEM_DADOS };
          return <path key={geo.uf} d={geo.d} className="rm-uf" style={style} />;
        })}
        {MAPA_BRASIL.estados.filter((g) => !PEQUENOS.has(g.uf)).map((geo) => (
          <text key={geo.uf} x={geo.cx} y={geo.cy} className="rm-sigla" textAnchor="middle" dominantBaseline="central">{geo.uf}</text>
        ))}
      </svg>
      <figcaption className="rm-leg">
        {ORDEM_REGIOES.map((k) => (
          <span key={k} className="rm-item"><i style={{ background: REGIOES[k].cor }} />{REGIOES[k].nome}</span>
        ))}
        <span className="rm-item"><i style={{ background: SEM_DADOS }} />Nenhuma urna recebida</span>
        <span className="rm-item"><i className="rm-grad" />Mais forte: mais urnas recebidas</span>
        <span className="rm-item"><i className="rm-hach" />Sem horário: {UFS_SEM_DETALHE.join(', ')}</span>
      </figcaption>
      <style jsx global>{`
        .rm { --rm-h: clamp(300px, calc(100vh - 215px), 700px); margin: 0; display: flex; flex-direction: column; align-items: center; gap: 12px; }
        .rm-svg { display: block; flex: 0 1 auto; width: min(100%, calc(var(--rm-h) * ${PROPORCAO.toFixed(4)})); aspect-ratio: ${MAPA_BRASIL.largura} / ${MAPA_BRASIL.altura}; height: auto; }
        .rm-uf { stroke: ${t.cor.papelCartao}; stroke-width: 1; transition: fill-opacity 0.25s linear, fill 0.25s linear; }
        .rm-sigla { font: 700 11px ${t.fonte.corpo}; fill: ${t.cor.tinta}; pointer-events: none; paint-order: stroke; stroke: rgba(255,255,255,0.75); stroke-width: 2.5px; }
        .rm-leg { display: flex; flex-wrap: wrap; gap: 6px 16px; justify-content: center; font-size: 0.85rem; color: ${t.cor.cinza}; }
        .rm-item { display: inline-flex; align-items: center; gap: 8px; }
        .rm-item i { display: inline-block; width: 12px; height: 12px; border-radius: 3px; flex: none; }
        .rm-hach { background: repeating-linear-gradient(45deg, #ECE9E2 0 3px, #C9C5BA 3px 5px); }
        .rm-grad { background: linear-gradient(90deg, rgba(91,111,168,0.28), rgba(91,111,168,1)); width: 22px !important; }
        /* Computador: a legenda vai para o lado do mapa, em coluna. O grupo (legenda + mapa) fica centralizado na coluna. */
        @media (min-width: 900px) {
          .rm { flex-direction: row; align-items: flex-end; justify-content: center; gap: 22px; }
          .rm-svg { order: 2; width: min(calc(100% - 232px), calc(var(--rm-h) * ${PROPORCAO.toFixed(4)})); }
          .rm-leg { order: 1; flex: none; width: 210px; flex-direction: column; flex-wrap: nowrap; align-items: flex-start; justify-content: flex-end; gap: 8px; padding-bottom: 6px; line-height: 1.3; }
        }
        @media (prefers-reduced-motion: reduce) { .rm-uf { transition: none; } }
      `}</style>
    </figure>
  );
}
