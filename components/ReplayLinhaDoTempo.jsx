import { t } from '../src/estilo/tokens';
import Segmentado from './Segmentado';
import { MINUTOS_TOTAIS, VELOCIDADES, horaDoMinuto, listaE, pctUrnas } from '../src/lib/replayApuracao';

// LINHA DO TEMPO DO REPLAY (22/10/2026, D-074): hora grande, botão de reproduzir (pílula índigo com texto âmbar, com sombra, sem contorno),
// barra de tempo e escolha de velocidade (segmented control, opções excludentes). Só desenha; o relógio mora na página.
export default function ReplayLinhaDoTempo({ minuto, tocando, fim, velocidade, resumo, recebendo, estimadas = [], aoAlternar, aoMudarMinuto, aoMudarVelocidade }) {
  const m = Math.floor(minuto);
  // "00:59 (dia seguinte)" vira "00:59" grande e a data certa (5 de outubro) na linha de baixo: a faixa não quebra depois da meia-noite.
  const horaCurta = horaDoMinuto(m).replace(/ \(.*\)$/, '');
  const diaSeguinte = horaCurta !== horaDoMinuto(m);
  const num = (x) => Number(x || 0).toLocaleString('pt-BR');
  return (
    <div className="rt">
      <div className="rt-info">
        <div className="rt-bloco rt-principal">
          <div className="rt-grande">
            <strong className="rt-hora" aria-live="off">{horaCurta}</strong>
            {resumo && resumo.total > 0 && (
              <>
                <span className="rt-sep" aria-hidden="true">·</span>
                <strong className="rt-pct">{pctUrnas(resumo.recebidas / resumo.total)}%</strong>
                <span className="rt-rot">das urnas recebidas <span className="rt-qtd">({num(resumo.recebidas)} de {num(resumo.total)} urnas)</span></span>
              </>
            )}
          </div>
          <span className="rt-sub">horário de Brasília, {diaSeguinte ? '5' : '4'} de outubro de 2026{estimadas.length > 0 ? ` · ${listaE(estimadas)} com horário estimado` : ''}</span>
        </div>
        {recebendo && resumo && resumo.total > 0 && (
          <p className="rt-bloco rt-recebendo">
            {recebendo.length === 0 ? 'Nenhum estado recebendo urnas nos últimos 5 minutos.' : (() => {
              const ufs = recebendo.filter((u) => u !== 'ZZ'); // ZZ = urnas do exterior (não é estado)
              const lista = recebendo.includes('ZZ') ? [...ufs, 'Exterior'] : ufs;
              return <>Recebendo agora (últimos 5 min): <b>{ufs.length} {ufs.length === 1 ? 'estado' : 'estados'}{recebendo.includes('ZZ') ? ' e o exterior' : ''}:</b><span>{lista.join(', ')}</span></>;
            })()}
          </p>
        )}
      </div>
      <div className="rt-ctl">
        <button type="button" className="rt-play" onClick={aoAlternar}>{tocando ? 'Pausar' : fim ? 'Rever do início' : 'Reproduzir'}</button>
        <input type="range" className="rt-barra" min={0} max={MINUTOS_TOTAIS} step={1} value={m}
          aria-label="Horário da apuração" aria-valuetext={horaDoMinuto(m)}
          onChange={(ev) => aoMudarMinuto(Number(ev.target.value))} />
        <Segmentado aria="Velocidade do replay" className="seg-compacto"
          itens={VELOCIDADES.map((v) => ({ chave: v.chave, rotulo: v.rotulo, ativo: v.chave === velocidade, aoClicar: () => aoMudarVelocidade(v.chave) }))} />
      </div>
      <style jsx global>{`
        /* Faixa em largura total acima do mapa: informações à esquerda (lado a lado), controles à direita; quebra em duas linhas quando falta largura. */
        .rt { display: flex; flex-wrap: wrap; align-items: center; gap: 8px 32px; }
        .rt-info { display: contents; }
        .rt-bloco { margin: 0; display: flex; flex-direction: column; gap: 2px; min-width: 0; }
        .rt-hora { font: 700 2.2rem/1.1 ${t.fonte.titulo}; color: ${t.cor.verde}; font-variant-numeric: tabular-nums; }
        .rt-pct { font: 700 2.2rem/1.1 ${t.fonte.titulo}; color: ${t.cor.tinta}; font-variant-numeric: tabular-nums; }
        .rt-grande { display: flex; flex-wrap: wrap; align-items: baseline; gap: 0 12px; }
        .rt-sep { font: 700 2.2rem/1.1 ${t.fonte.titulo}; color: ${t.cor.cinza}; }
        .rt-rot { font-size: 0.95rem; color: ${t.cor.tinta}; }
        .rt-qtd { color: ${t.cor.cinza}; white-space: nowrap; }
        .rt-sub { font-size: 0.82rem; color: ${t.cor.cinza}; }
        .rt-recebendo span { font-size: 0.85rem; color: ${t.cor.cinza}; }
        .rt-recebendo { order: 3; flex: 1 1 100%; flex-direction: row; flex-wrap: wrap; gap: 0 6px; font-size: 0.85rem; line-height: 1.4; color: ${t.cor.cinza}; }
        .rt-recebendo b { color: ${t.cor.tinta}; }
        .rt-ctl { order: 2; display: flex; flex-wrap: wrap; align-items: center; gap: 10px 14px; flex: 1 1 520px; min-width: 0; max-width: 700px; margin-left: auto; }
        .rt-play { flex: none; min-height: 40px; padding: 10px 22px; border: none; border-radius: ${t.raio.pill}; background: ${t.cor.verde}; color: ${t.cor.ouro}; font: 700 0.95rem ${t.fonte.corpo}; cursor: pointer; box-shadow: ${t.sombra.botao}; transition: box-shadow 0.15s; }
        .rt-play:hover { box-shadow: ${t.sombra.botaoHover}; }
        .rt-play:focus-visible { outline: none; box-shadow: ${t.sombra.botao}, ${t.sombra.anelFoco}; }
        .rt-barra { flex: 1 1 120px; min-width: 120px; height: 28px; accent-color: ${t.cor.verde}; cursor: pointer; }
        .rt-barra:focus-visible { outline: none; box-shadow: ${t.sombra.anelFoco}; border-radius: ${t.raio.pill}; }
        /* Celular: botão e barra na primeira linha; a velocidade ocupa a linha de baixo, em largura total. */
        @media (max-width: 600px) {
          .rt { gap: 6px; }
          .rt-ctl { flex: 1 1 100%; max-width: none; margin-left: 0; }
          .rt-ctl .segmentado { flex: 1 1 100%; display: flex; flex-wrap: nowrap; }
          .rt-ctl .seg-op { flex: 1; text-align: center; padding: 8px 4px; }
          .rt-hora, .rt-pct, .rt-sep { font-size: 1.9rem; }
          .rt-grande { gap: 0 8px; }
        }
        @media (pointer: coarse) { .rt-play { min-height: 44px; } .rt-barra { height: 40px; } }
      `}</style>
    </div>
  );
}
