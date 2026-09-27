import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { t } from '../src/estilo/tokens';

// ESCOLHA COMPACTA (27/09/2026, pedido do Jordy para o celular). Pílulas irmãs que no celular
// ocupavam duas ou três linhas (páginas de "Pra você", casas, cargos) viram UM campo com a opção
// atual e uma seta; tocar abre a lista. Mesmo visual do CampoSelect da página inicial (pílula
// branca, anel dourado), mas é um botão que abre uma lista, e não um campo de digitar: com 2 a 4
// opções não há o que buscar, e um campo de texto abriria o teclado do celular à toa.
// `opcoes`: [{ valor, rotulo, href? }]. Com href, cada item é um link (navegação entre páginas);
// sem href, chama aoEscolher(valor) (troca de aba na mesma página).
export default function EscolhaCompacta({ opcoes, valor, aoEscolher, rotulo }) {
  const [aberto, setAberto] = useState(false);
  const raiz = useRef(null);
  const atual = opcoes.find((o) => o.valor === valor) || opcoes[0];

  useEffect(() => {
    if (!aberto) return undefined;
    const fora = (e) => { if (raiz.current && !raiz.current.contains(e.target)) setAberto(false); };
    const esc = (e) => { if (e.key === 'Escape') setAberto(false); };
    document.addEventListener('mousedown', fora);
    document.addEventListener('keydown', esc);
    return () => { document.removeEventListener('mousedown', fora); document.removeEventListener('keydown', esc); };
  }, [aberto]);

  const item = (ativo) => ({
    display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', width: '100%', textAlign: 'left',
    padding: '11px 16px', fontSize: '0.95rem', fontFamily: t.fonte.corpo, fontWeight: ativo ? 700 : 500, color: t.cor.tinta,
    background: ativo ? t.cor.papelQuente : '#fff', border: 'none', cursor: 'pointer', textDecoration: 'none',
  });
  return (
    <div ref={raiz} style={{ position: 'relative', width: '100%' }}>
      <button type="button" aria-expanded={aberto} aria-haspopup="true" aria-label={`${rotulo}: ${atual?.rotulo}. Trocar`}
        onClick={() => setAberto((a) => !a)}
        style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', minHeight: '44px',
          padding: '0 16px', borderRadius: t.raio.pill, border: 'none', cursor: 'pointer', background: '#fff', color: t.cor.tinta,
          fontFamily: t.fonte.corpo, fontSize: '0.95rem', fontWeight: 700, textAlign: 'left',
          boxShadow: aberto ? `inset 0 0 0 2.5px ${t.cor.ouro}, ${t.sombra.clicavel}, ${t.sombra.anelFoco}` : `inset 0 0 0 1px #CC7A22, ${t.sombra.clicavel}`,
          transition: 'box-shadow .15s' }}>
        <span style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{atual?.rotulo}</span>
        <span aria-hidden style={{ flexShrink: 0, color: t.cor.cinza, transition: 'transform .15s', transform: aberto ? 'rotate(180deg)' : 'none' }}>▾</span>
      </button>
      {aberto && (
        <div style={{ position: 'absolute', top: 'calc(100% + 6px)', left: 0, right: 0, zIndex: 70, background: '#fff', borderRadius: t.raio.md, boxShadow: t.sombra.media, overflow: 'hidden' }}>
          {opcoes.map((o) => {
            const ativo = o.valor === atual?.valor;
            const conteudo = <><span>{o.rotulo}</span>{ativo && <span aria-hidden style={{ color: t.cor.ouro }}>✓</span>}</>;
            return o.href ? (
              <Link key={o.valor} href={o.href} aria-current={ativo ? 'page' : undefined} onClick={() => setAberto(false)} style={item(ativo)}>{conteudo}</Link>
            ) : (
              <button key={o.valor} type="button" aria-pressed={ativo} onClick={() => { setAberto(false); aoEscolher?.(o.valor); }} style={item(ativo)}>{conteudo}</button>
            );
          })}
        </div>
      )}
    </div>
  );
}
