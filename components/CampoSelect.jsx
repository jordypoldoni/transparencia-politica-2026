import { useState, useRef, useEffect, useMemo } from 'react';
import { t } from '../src/estilo/tokens';

const norm = (s) => String(s || '').normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();

// Combobox de UM campo só: digita direto, a lista aparece embaixo.
// Mesmo visual/comportamento de todos os campos de busca (linha âmbar quando ativo).
export default function CampoSelect({
  opcoes = [], valor = '', aoSelecionar, placeholder = 'Selecione…',
  aoLabel = 'Selecionar', largura = '100%', limite = 999, icone = null,
}) {
  const [aberto, setAberto] = useState(false);
  const [texto, setTexto] = useState('');
  const [ativo, setAtivo] = useState(0);
  const raiz = useRef(null);

  const selecionada = opcoes.find((o) => o.valor === valor) || null;
  const display = aberto ? texto : (selecionada ? selecionada.rotulo : '');

  const filtradas = useMemo(() => {
    const q = norm(texto);
    if (!aberto || !q) return opcoes;
    return opcoes.filter((o) => norm(o.busca || o.rotulo).includes(q));
  }, [opcoes, texto, aberto]);
  const visiveis = filtradas.slice(0, limite);

  useEffect(() => {
    if (!aberto) return;
    const fora = (e) => { if (raiz.current && !raiz.current.contains(e.target)) setAberto(false); };
    document.addEventListener('mousedown', fora);
    return () => document.removeEventListener('mousedown', fora);
  }, [aberto]);
  useEffect(() => { setAtivo(0); }, [texto, aberto]);

  const escolher = (o) => { setTexto(''); setAberto(false); aoSelecionar?.(o.valor); };

  const aoTeclado = (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setAberto(true); setAtivo((i) => Math.min(i + 1, visiveis.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setAtivo((i) => Math.max(i - 1, 0)); }
    else if (e.key === 'Enter') { e.preventDefault(); if (visiveis[ativo]) escolher(visiveis[ativo]); }
    else if (e.key === 'Escape') { setAberto(false); }
  };

  return (
    <div ref={raiz} style={{ position: 'relative', width: largura, minWidth: 0 }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: '10px', padding: '0 16px',
        borderRadius: t.raio.pill, background: '#fff',
        boxShadow: aberto ? `${t.sombra.clicavel}, ${t.sombra.anelFoco}` : t.sombra.clicavel, transition: 'box-shadow .15s',
      }}>
        {icone && <span aria-hidden style={{ flexShrink: 0, color: aberto ? t.cor.ouro : t.cor.cinza, display: 'flex' }}>{icone}</span>}
        <input
          value={display} placeholder={placeholder} aria-label={aoLabel}
          role="combobox" aria-expanded={aberto} aria-autocomplete="list"
          onChange={(e) => { setTexto(e.target.value); setAberto(true); }}
          onFocus={() => { setAberto(true); setTexto(''); }}
          onKeyDown={aoTeclado}
          style={{
            flex: 1, minWidth: 0, padding: '14px 0', border: 'none', outline: 'none',
            fontSize: '1rem', fontFamily: t.fonte.corpo, background: 'transparent', color: t.cor.tinta,
          }} />
        <span aria-hidden onMouseDown={(e) => { e.preventDefault(); setAberto((a) => !a); }}
          style={{ flexShrink: 0, cursor: 'pointer', transition: 'transform .15s', transform: aberto ? 'rotate(180deg)' : 'none', color: t.cor.cinza }}>▾</span>
      </div>

      {aberto && (
        <div role="listbox" style={{
          position: 'absolute', top: 'calc(100% + 6px)', left: 0, right: 0, zIndex: 70,
          background: '#fff', borderRadius: t.raio.md,
          boxShadow: t.sombra.media, overflow: 'hidden', maxHeight: '300px', overflowY: 'auto',
        }}>
          {visiveis.length === 0 && (
            <p style={{ margin: 0, padding: '14px 16px', color: t.cor.cinza, fontSize: '0.9rem' }}>Nada encontrado.</p>
          )}
          {visiveis.map((o, i) => {
            const sel = o.valor === valor;
            const hov = i === ativo;
            return (
              <button key={o.valor ?? i} type="button" role="option" aria-selected={sel}
                onMouseEnter={() => setAtivo(i)} onMouseDown={(e) => { e.preventDefault(); escolher(o); }}
                style={{
                  width: '100%', textAlign: 'left', border: 'none', cursor: 'pointer',
                  padding: '11px 16px', fontSize: '0.95rem', fontFamily: t.fonte.corpo,
                  background: hov ? t.cor.papel : '#fff', color: t.cor.tinta,
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px',
                  fontWeight: sel ? 700 : 400,
                }}>
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{o.rotulo}</span>
                {sel && <span aria-hidden style={{ color: t.cor.ouro, flexShrink: 0 }}>✓</span>}
              </button>
            );
          })}
          {filtradas.length > limite && (
            <p style={{ margin: 0, padding: '10px 16px', color: t.cor.cinza, fontSize: '0.82rem', background: t.cor.papelQuente }}>
              +{filtradas.length - limite} — digite para refinar.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
