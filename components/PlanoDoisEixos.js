import { t } from '../src/estilo/tokens';
import { posicao } from '../src/lib/joguinhoIdeologia';

// Plano de dois eixos (23/10/2026, ideia do Jordy a partir de um gráfico de vídeo; desenho
// próprio, não reproduz a arte do vídeo). Horizontal: economia, de "mais papel do Estado" a
// "mais papel do mercado" (eixo econômico de Nolan e do Political Compass). Vertical: costumes,
// de "mais liberal" (topo) a "mais conservador" (base), o eixo de comportamento do Datafolha.
// `economia` e `costumes` (opcionais) são médias de -2 a +2 do joguinho: -2 = esquerda, +2 = direita.
// Regra do Jordy: nada de travessão nos textos do site.
const L = 360, A = 300, M = 36; // largura, altura e margem do desenho
const x0 = M, x1 = L - M, y0 = 26, y1 = A - 26;
const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;

export default function PlanoDoisEixos({ economia, costumes, legenda }) {
  const tem = Number.isFinite(economia) && Number.isFinite(costumes);
  const px = x0 + (posicao(tem ? economia : 0) / 100) * (x1 - x0);
  const py = y0 + (posicao(tem ? costumes : 0) / 100) * (y1 - y0);
  const rotulo = tem
    ? 'Plano de dois eixos. Seu ponto: economia mais perto do ' + (economia < -0.4 ? 'papel do Estado' : economia > 0.4 ? 'papel do mercado' : 'meio') + ', costumes mais perto do ' + (costumes < -0.4 ? 'liberal' : costumes > 0.4 ? 'conservador' : 'meio') + '.'
    : 'Plano de dois eixos: economia na horizontal, do papel do Estado ao papel do mercado, e costumes na vertical, do liberal ao conservador.';
  const txt = { fontFamily: t.fonte.corpo, fontSize: 11.5, fontWeight: 700, fill: t.cor.tinta };
  const suave = { fontFamily: t.fonte.corpo, fontSize: 10.5, fill: t.cor.cinza };
  return (
    <figure style={{ margin: '0 0 6px' }}>
      <svg viewBox={`0 0 ${L} ${A}`} role="img" aria-label={rotulo} style={{ width: '100%', maxWidth: '460px', height: 'auto', display: 'block', margin: '0 auto' }}>
        <rect x={x0} y={y0} width={x1 - x0} height={y1 - y0} rx="12" fill={t.cor.papelQuente} />
        <rect x={x0} y={y0} width={(x1 - x0) / 2} height={(y1 - y0) / 2} rx="12" fill={t.cor.papelQuente2} opacity="0.55" />
        <rect x={cx} y={cy} width={(x1 - x0) / 2} height={(y1 - y0) / 2} rx="12" fill={t.cor.papelQuente2} opacity="0.55" />
        <line x1={x0} y1={cy} x2={x1} y2={cy} stroke={t.cor.cinza} strokeWidth="1.5" />
        <line x1={cx} y1={y0} x2={cx} y2={y1} stroke={t.cor.cinza} strokeWidth="1.5" />
        <text x={cx} y={16} textAnchor="middle" style={txt}>Mais liberal</text>
        <text x={cx} y={A - 8} textAnchor="middle" style={txt}>Mais conservador</text>
        <text x={x0 - 4} y={cy - 8} textAnchor="start" style={txt}>Estado</text>
        <text x={x1 + 4} y={cy - 8} textAnchor="end" style={txt}>Mercado</text>
        <text x={cx + 6} y={cy - 6} style={suave}>centro</text>
        {tem && (
          <g>
            <circle cx={px} cy={py} r="11" fill={t.cor.ouro} stroke="#fff" strokeWidth="3" />
            <circle cx={px} cy={py} r="17" fill="none" stroke={t.cor.ouro} strokeWidth="1.5" opacity="0.45" />
          </g>
        )}
      </svg>
      <figcaption style={{ textAlign: 'center', fontSize: '0.8rem', color: t.cor.cinza, marginTop: '6px', lineHeight: 1.5 }}>
        {legenda || 'Na horizontal, a economia: do papel do Estado ao papel do mercado. Na vertical, os costumes: do mais liberal ao mais conservador.'}
      </figcaption>
    </figure>
  );
}
