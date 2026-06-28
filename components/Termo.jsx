import { useState, useRef } from 'react';
import { t } from '../src/estilo/tokens';

// Explicações curtas de termos que o cidadão comum não conhece.
const DEFS = [
  { rx: /absten/i, def: 'O parlamentar estava presente, mas decidiu não votar nem a favor nem contra.' },
  { rx: /obstru/i, def: 'Manobra (em geral da oposição) para atrasar ou esvaziar a votação. Na prática, não conta como voto a favor nem contra.' },
  { rx: /artigo 17/i, def: 'O presidente da sessão normalmente só vota em caso de empate (Art. 17 do Regimento).' },
];

export default function Termo({ children, style }) {
  const [v, setV] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const ref = useRef(null);
  const def = DEFS.find((d) => d.rx.test(String(children)))?.def;
  if (!def) return <>{children}</>;

  const mostrar = () => {
    if (ref.current) {
      const r = ref.current.getBoundingClientRect();
      const TIP_W = 220;
      const idealLeft = r.left + r.width / 2 - TIP_W / 2;
      // Clamp para não sair da viewport (8px de margem em cada lado)
      const left = Math.max(8, Math.min(window.innerWidth - TIP_W - 8, idealLeft));
      setPos({ top: r.top - 8, left });
    }
    setV(true);
  };

  return (
    <span
      ref={ref}
      onMouseEnter={mostrar}
      onMouseLeave={() => setV(false)}
      onFocus={mostrar}
      onBlur={() => setV(false)}
      tabIndex={0}
      style={{ position: 'relative', borderBottom: '1px dotted currentColor', cursor: 'help', ...style }}
    >
      {children}
      {v && (
        <span role="tooltip" style={{
          position: 'fixed',
          top: `${pos.top}px`,
          left: `${pos.left}px`,
          transform: 'translateY(-100%)',
          width: '220px',
          background: t.cor.tinta, color: '#fff',
          fontSize: '0.78rem', fontWeight: 400, lineHeight: 1.45, padding: '10px 12px',
          borderRadius: '8px', zIndex: 9999, boxShadow: '0 8px 24px rgba(0,0,0,0.25)',
          textTransform: 'none', letterSpacing: 'normal', textAlign: 'left', pointerEvents: 'none',
        }}>{def}</span>
      )}
    </span>
  );
}
