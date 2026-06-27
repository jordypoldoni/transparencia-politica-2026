import { useState } from 'react';
import { t } from '../src/estilo/tokens';

// Explicações curtas de termos que o cidadão comum não conhece.
const DEFS = [
  { rx: /absten/i, def: 'O parlamentar estava presente, mas decidiu não votar nem a favor nem contra.' },
  { rx: /obstru/i, def: 'Manobra (em geral da oposição) para atrasar ou esvaziar a votação. Na prática, não conta como voto a favor nem contra.' },
  { rx: /artigo 17/i, def: 'O presidente da sessão normalmente só vota em caso de empate (Art. 17 do Regimento).' },
];

export default function Termo({ children, style }) {
  const [v, setV] = useState(false);
  const def = DEFS.find((d) => d.rx.test(String(children)))?.def;
  if (!def) return <>{children}</>;
  return (
    <span
      onMouseEnter={() => setV(true)} onMouseLeave={() => setV(false)}
      onFocus={() => setV(true)} onBlur={() => setV(false)} tabIndex={0}
      style={{ position: 'relative', borderBottom: '1px dotted currentColor', cursor: 'help', ...style }}
    >
      {children}
      {v && (
        <span role="tooltip" style={{
          position: 'absolute', bottom: '140%', left: '50%', transform: 'translateX(-50%)',
          width: '220px', maxWidth: '70vw', background: t.cor.tinta, color: '#fff',
          fontSize: '0.78rem', fontWeight: 400, lineHeight: 1.45, padding: '10px 12px',
          borderRadius: '8px', zIndex: 60, boxShadow: '0 8px 24px rgba(0,0,0,0.25)',
          textTransform: 'none', letterSpacing: 'normal', textAlign: 'left', pointerEvents: 'none',
        }}>{def}</span>
      )}
    </span>
  );
}
