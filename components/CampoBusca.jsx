import { useState } from 'react';
import { t } from '../src/estilo/tokens';
import { Lupa } from './icones';

// Input de busca padrão do site: pílula, ícone de lupa, linha âmbar quando ativo.
export default function CampoBusca({ valor, aoMudar, placeholder = 'Buscar…', aoLabel = 'Buscar', largura = '100%', semIcone = false }) {
  const [foco, setFoco] = useState(false);
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: '10px', padding: '0 16px', width: largura, minWidth: 0,
      borderRadius: t.raio.pill, background: '#fff',
      boxShadow: foco ? `${t.sombra.clicavel}, ${t.sombra.anelFoco}` : t.sombra.clicavel, transition: 'box-shadow .15s',
    }}>
      {!semIcone && <span aria-hidden style={{ flexShrink: 0, color: foco ? t.cor.ouro : t.cor.cinza, display: 'flex' }}><Lupa /></span>}
      <input
        value={valor} onChange={(e) => aoMudar(e.target.value)} placeholder={placeholder} aria-label={aoLabel}
        onFocus={() => setFoco(true)} onBlur={() => setFoco(false)}
        style={{
          flex: 1, minWidth: 0, padding: '13px 0', border: 'none', outline: 'none',
          fontSize: '1rem', fontFamily: t.fonte.corpo, background: 'transparent', color: t.cor.tinta,
        }} />
    </div>
  );
}
