import { useState } from 'react';
import { t } from '../src/estilo/tokens';

function iniciais(nome) {
  const p = String(nome || '').trim().split(/\s+/).filter(Boolean);
  return ((p[0]?.[0] || '') + (p.length > 1 ? p[p.length - 1][0] : '')).toUpperCase() || '?';
}

// Foto com fallback elegante para iniciais (sem placeholder quebrado).
export default function Avatar({ nome, foto, size = 56, borda }) {
  const [erro, setErro] = useState(false);
  const base = {
    width: size, height: size, borderRadius: '50%', flexShrink: 0, overflow: 'hidden',
    display: 'grid', placeItems: 'center', ...(borda ? { border: borda } : {}),
  };
  if (foto && !erro) {
    return (
      <div style={{ ...base, background: '#ECE9E1' }}>
        <img src={foto} alt={nome} loading="lazy" onError={() => setErro(true)}
          style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top' }} />
      </div>
    );
  }
  return (
    <div style={{ ...base, background: t.cor.verde, color: '#fff', fontFamily: t.fonte.titulo, fontWeight: 700, fontSize: Math.round(size * 0.36) }}>
      {iniciais(nome)}
    </div>
  );
}
