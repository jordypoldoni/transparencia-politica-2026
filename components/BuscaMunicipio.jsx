import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { t } from '../src/estilo/tokens';

// Busca assíncrona de município (autocomplete) → navega para /ente/[cod].
// Compartilhada entre a home e a página de Gastos públicos.
export default function BuscaMunicipio() {
  const router = useRouter();
  const [q, setQ] = useState('');
  const [itens, setItens] = useState([]);
  const [aberto, setAberto] = useState(false);
  useEffect(() => {
    const termo = q.trim();
    if (termo.length < 2) { setItens([]); return; }
    const id = setTimeout(async () => {
      try {
        const r = await fetch(`/api/buscar-ente?q=${encodeURIComponent(termo)}`);
        const data = await r.json();
        setItens(Array.isArray(data) ? data.filter((e) => e.esfera === 'M') : []);
        setAberto(true);
      } catch { setItens([]); }
    }, 250);
    return () => clearTimeout(id);
  }, [q]);
  return (
    <div style={{ position: 'relative' }}>
      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Digite o município…" aria-label="Buscar município"
        style={{ width: '100%', padding: '12px 14px', borderRadius: t.raio.pill, border: `1px solid ${t.cor.linha}`, fontSize: '0.95rem', fontFamily: t.fonte.corpo, boxSizing: 'border-box' }} />
      {aberto && itens.length > 0 && (
        <ul style={{ position: 'absolute', zIndex: 30, left: 0, right: 0, marginTop: '6px', listStyle: 'none', padding: '6px', background: '#fff', borderRadius: t.raio.md, boxShadow: t.sombra.media, maxHeight: '260px', overflowY: 'auto' }}>
          {itens.map((e) => (
            <li key={e.cod_ibge}>
              <button type="button" onClick={() => router.push(`/ente/${e.cod_ibge}`)}
                style={{ width: '100%', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', padding: '9px 12px', borderRadius: t.raio.sm, fontSize: '0.9rem', fontFamily: t.fonte.corpo }}>
                {e.ente} <span style={{ color: t.cor.cinza }}>· {e.uf}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
