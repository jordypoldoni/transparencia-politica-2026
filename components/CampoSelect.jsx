import { useState, useRef, useEffect, useMemo } from 'react';
import { t } from '../src/estilo/tokens';
import { Seta } from './icones';
import Giro from './Giro';
import { useNavegacao, anunciarDestino } from '../src/lib/navegacao';

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
  const [escolhida, setEscolhida] = useState(null);
  const raiz = useRef(null);
  const { navegando } = useNavegacao();
  const viuNavegar = useRef(false);

  // Campo que navega (estado da home, busca de parlamentar) nao recebe `valor`: antes, ao escolher, o
  // campo voltava a ficar vazio e parecia que nada tinha acontecido (20/10/2026, item 7). Agora guarda
  // a escolha e mostra um giro enquanto a pagina abre. Se a navegacao nao comecar em ~0,5s, ou se
  // terminar com o campo ainda na tela, esquece a escolha e volta ao normal.
  useEffect(() => {
    if (!escolhida) { viuNavegar.current = false; return undefined; }
    if (navegando) { viuNavegar.current = true; return undefined; }
    const espera = setTimeout(() => setEscolhida(null), viuNavegar.current ? 0 : 500);
    return () => clearTimeout(espera);
  }, [escolhida, navegando]);

  const selecionada = opcoes.find((o) => o.valor === valor) || escolhida || null;
  const ocupado = !!escolhida && navegando;
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

  const escolher = (o) => {
    setTexto(''); setAberto(false);
    viuNavegar.current = false;
    setEscolhida(o);
    anunciarDestino(o.rotulo);
    aoSelecionar?.(o.valor);
  };

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
        // ANEL DOURADO (27/09/2026, padrão dos campos, ver Diretrizes de Design): branco sobre cartão
        // branco sumia (Jordy, no estado do /perfil). Fino em repouso (#CC7A22, 3,29:1 contra o branco),
        // grosso ao usar (#FF8A00 + halo).
        boxShadow: aberto ? `inset 0 0 0 2.5px ${t.cor.ouro}, ${t.sombra.clicavel}, ${t.sombra.anelFoco}` : `inset 0 0 0 1px #CC7A22, ${t.sombra.clicavel}`, transition: 'box-shadow .15s',
      }}>
        {icone && <span aria-hidden style={{ flexShrink: 0, color: aberto ? t.cor.ouro : t.cor.cinza, display: 'flex' }}>{icone}</span>}
        <input
          value={display} placeholder={placeholder} aria-label={aoLabel} aria-busy={ocupado}
          role="combobox" aria-expanded={aberto} aria-autocomplete="list"
          onChange={(e) => { setTexto(e.target.value); setAberto(true); }}
          onFocus={() => { setAberto(true); setTexto(''); }}
          onKeyDown={aoTeclado}
          style={{
            flex: 1, minWidth: 0, padding: '14px 0', border: 'none', outline: 'none',
            fontSize: '1rem', fontFamily: t.fonte.corpo, background: 'transparent', color: t.cor.tinta,
          }} />
        <span aria-hidden onMouseDown={(e) => { e.preventDefault(); setAberto((a) => !a); }}
          style={{ flexShrink: 0, cursor: 'pointer', display: 'inline-flex' }}>
          {ocupado ? <Giro tamanho={16} /> : <Seta aberta={aberto} size={16} />}
        </span>
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
              +{filtradas.length - limite}, digite para refinar.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
