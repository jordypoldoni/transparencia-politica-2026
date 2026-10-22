import { t } from '../src/estilo/tokens';
import Segmentado from './Segmentado';
import { MINUTOS_TOTAIS, VELOCIDADES, horaDoMinuto } from '../src/lib/replayApuracao';

// LINHA DO TEMPO DO REPLAY (22/10/2026, D-074): hora grande, botão de reproduzir (pílula índigo com texto âmbar, com sombra, sem contorno),
// barra de tempo e escolha de velocidade (segmented control, opções excludentes). Só desenha; o relógio mora na página.
export default function ReplayLinhaDoTempo({ minuto, tocando, fim, velocidade, resumo, recebendo, aoAlternar, aoMudarMinuto, aoMudarVelocidade }) {
  const m = Math.floor(minuto);
  const num = (x) => Number(x || 0).toLocaleString('pt-BR');
  return (
    <div className="rt">
      <div className="rt-info">
        <div className="rt-bloco rt-principal">
          <div className="rt-grande">
            <strong className="rt-hora" aria-live="off">{horaDoMinuto(m)}</strong>
            {resumo && resumo.total > 0 && (
              <>
                <span className="rt-sep" aria-hidden="true">·</span>
                <strong className="rt-pct">{resumo.pct.toFixed(1).replace('.', ',')}%</strong>
                <span className="rt-rot">das urnas recebidas <span className="rt-qtd">({num(resumo.recebidas)} de {num(resumo.total)} urnas)</span></span>
              </>
            )}
          </div>
          <span className="rt-sub">horário de Brasília, 4 de outubro de 2026</span>
        </div>
        {recebendo && resumo && resumo.total > 0 && (
          <p className="rt-bloco rt-recebendo">
            {recebendo.length === 0 ? 'Nenhum estado recebendo urnas nos últimos 5 minutos.' : <>Recebendo agora (últimos 5 min): <b>{recebendo.length} {recebendo.length === 1 ? 'estado' : 'estados'}:</b><span>{recebendo.join(', ')}</span></>}
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
        .rt-ctl { order: 2; display: flex; align-items: center; gap: 14px; flex: 1 1 520px; min-width: 0; max-width: 700px; margin-left: auto; }
        .rt-play { flex: none; min-height: 40px; padding: 10px 22px; border: none; border-radius: ${t.raio.pill}; background: ${t.cor.verde}; color: ${t.cor.ouro}; font: 700 0.95rem ${t.fonte.corpo}; cursor: pointer; box-shadow: ${t.sombra.botao}; transition: box-shadow 0.15s; }
        .rt-play:hover { box-shadow: ${t.sombra.botaoHover}; }
        .rt-play:focus-visible { outline: none; box-shadow: ${t.sombra.botao}, ${t.sombra.anelFoco}; }
        .rt-barra { flex: 1; min-width: 120px; height: 28px; accent-color: ${t.cor.verde}; cursor: pointer; }
        .rt-barra:focus-visible { outline: none; box-shadow: ${t.sombra.anelFoco}; border-radius: ${t.raio.pill}; }
        @media (pointer: coarse) { .rt-play { min-height: 44px; } .rt-barra { height: 40px; } }
      `}</style>
    </div>
  );
}
