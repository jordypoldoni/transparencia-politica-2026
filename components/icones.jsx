import { t } from '../src/estilo/tokens';

// Ícones SVG reutilizáveis (herdam a cor via currentColor).
export function Lupa({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
      <circle cx="11" cy="11" r="7" /><line x1="21" y1="21" x2="16.5" y2="16.5" />
    </svg>
  );
}

export function Pino({ size = 15 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 21s-7-6.3-7-11a7 7 0 0 1 14 0c0 4.7-7 11-7 11z" /><circle cx="12" cy="10" r="2.5" />
    </svg>
  );
}

// SETA DE ABRIR/FECHAR (12/10/2026, pedido do Jordy): chevron fino de pontas arredondadas,
// dourado padrao do site (t.cor.ouro), com sombra pequena logo abaixo. Substitui os triangulos
// de texto (▲ ▼ ▾) que existiam em todo o site.
// A sombra fica num invólucro que NAO gira: se ficasse no svg, ao abrir (giro de 180 graus) a
// sombra passaria para cima da seta.
export function Seta({ aberta = false, size = 16, cor }) {
  return (
    <span aria-hidden="true" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, lineHeight: 0, filter: 'drop-shadow(0 1.5px 1px rgba(26, 22, 70, 0.30))' }}>
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={cor || t.cor.ouro} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"
        style={{ transition: 'transform .18s ease', transform: aberta ? 'rotate(180deg)' : 'none' }}>
        <polyline points="6 9 12 15 18 9" />
      </svg>
    </span>
  );
}
