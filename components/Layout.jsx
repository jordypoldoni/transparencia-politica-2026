import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { t } from '../src/estilo/tokens';

const navItens = [
  { href: '/', rotulo: 'Início' },
  { href: '/comecar', rotulo: 'Pra você' },
  { href: '/deputados', rotulo: 'Deputados' },
  { href: '/deputados?casa=senado', rotulo: 'Senadores' },
  { href: '/votacoes', rotulo: 'Votações' },
  { href: '/entenda', rotulo: 'Entenda' },
  { href: '/sobre', rotulo: 'Sobre & Fontes' },
];

function ehAtivo(href, pathname, asPath) {
  const [hp, hq] = href.split('?');
  const casaAtual = new URLSearchParams((asPath.split('?')[1] || '')).get('casa');
  if (hp === '/') return pathname === '/';
  if (hp === '/deputados') {
    if (pathname !== '/deputados' && !pathname.startsWith('/deputado/')) return false;
    const querSenado = hq && new URLSearchParams(hq).get('casa') === 'senado';
    return querSenado ? casaAtual === 'senado' : casaAtual !== 'senado';
  }
  if (hp === '/votacoes') return pathname === '/votacoes' || pathname.startsWith('/votacao');
  return pathname === hp || pathname.startsWith(hp + '/');
}

export default function Layout({ children }) {
  const { pathname, asPath } = useRouter();
  const [menu, setMenu] = useState(false);
  useEffect(() => { setMenu(false); }, [asPath]); // fecha ao navegar
  return (
    <div style={{ minHeight: '100vh', background: t.cor.papel, color: t.cor.tinta, fontFamily: t.fonte.corpo, display: 'flex', flexDirection: 'column' }}>
      {/* Cabeçalho */}
      <header style={{ boxShadow: '0 1px 14px rgba(74,52,30,0.06)', background: 'rgba(251,248,242,0.9)', backdropFilter: 'blur(8px)', position: 'sticky', top: 0, zIndex: 50 }}>
        <div style={{ width: '100%', padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
          <Link href="/" style={{ textDecoration: 'none', color: t.cor.tinta, display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span aria-hidden style={{ width: '28px', height: '28px', borderRadius: '8px', background: t.cor.verde, color: '#fff', display: 'grid', placeItems: 'center', fontFamily: t.fonte.titulo, fontWeight: 900 }}>O</span>
            <span style={{ fontFamily: t.fonte.titulo, fontWeight: 600, fontSize: '1.15rem', letterSpacing: '-0.01em' }}>Olho Público</span>
          </Link>
          <nav className="nav-desktop" style={{ gap: '2px' }}>
            {navItens.map((n) => {
              const ativo = ehAtivo(n.href, pathname, asPath);
              return (
                <Link key={n.rotulo} href={n.href} aria-current={ativo ? 'page' : undefined}
                  style={{
                    textDecoration: 'none',
                    color: ativo ? t.cor.tinta : t.cor.cinza,
                    fontWeight: ativo ? 800 : 600,
                    fontSize: '0.92rem',
                    padding: '8px 14px',
                    borderRadius: t.raio.pill,
                    background: ativo ? t.cor.papelQuente2 : 'transparent',
                  }}>
                  {n.rotulo}
                </Link>
              );
            })}
          </nav>

          {/* Hambúrguer (mobile) */}
          <button className="btn-hamburguer" onClick={() => setMenu((m) => !m)}
            aria-label={menu ? 'Fechar menu' : 'Abrir menu'} aria-expanded={menu}
            style={{ border: 'none', background: 'transparent', cursor: 'pointer', padding: '8px', color: t.cor.tinta, lineHeight: 0 }}>
            {menu ? (
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><line x1="6" y1="6" x2="18" y2="18" /><line x1="18" y1="6" x2="6" y2="18" /></svg>
            ) : (
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><line x1="3" y1="7" x2="21" y2="7" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="17" x2="21" y2="17" /></svg>
            )}
          </button>
        </div>

        {/* Menu mobile (dropdown) */}
        {menu && (
          <nav className="menu-mobile" style={{ background: t.cor.papel, padding: '8px 12px 14px', boxShadow: t.sombra.media }}>
            {navItens.map((n) => {
              const ativo = ehAtivo(n.href, pathname, asPath);
              return (
                <Link key={n.rotulo} href={n.href} aria-current={ativo ? 'page' : undefined}
                  style={{
                    display: 'block', textDecoration: 'none', padding: '14px 12px',
                    color: ativo ? t.cor.tinta : t.cor.cinza, fontWeight: ativo ? 800 : 600,
                    fontSize: '1.05rem', borderRadius: t.raio.sm,
                    background: ativo ? t.cor.papelQuente2 : 'transparent',
                  }}>
                  {n.rotulo}
                </Link>
              );
            })}
          </nav>
        )}
      </header>

      <main style={{ flex: 1 }}>{children}</main>

      {/* Rodapé de confiança */}
      <footer style={{ marginTop: '64px', background: t.cor.papelQuente }}>
        <div style={{ width: '100%', padding: '32px 24px', color: t.cor.cinza, fontSize: '0.85rem', display: 'flex', flexWrap: 'wrap', gap: '24px', justifyContent: 'space-between' }}>
          <div style={{ maxWidth: '420px' }}>
            <p style={{ margin: '0 0 6px', fontFamily: t.fonte.titulo, fontSize: '1rem', color: t.cor.tinta }}>Olho Público</p>
            <p style={{ margin: 0, lineHeight: 1.5 }}>
              Informação política em linguagem clara, sem lado. Todos os dados vêm de fontes oficiais e podem ser conferidos por você.
            </p>
          </div>
          <div>
            <p style={{ margin: '0 0 8px', fontWeight: 700, color: t.cor.tinta }}>Fontes oficiais</p>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: '4px' }}>
              <li><a href="https://dadosabertos.camara.leg.br" target="_blank" rel="noopener noreferrer" style={{ color: t.cor.verde }}>Câmara dos Deputados</a></li>
              <li><a href="https://www12.senado.leg.br/dados-abertos" target="_blank" rel="noopener noreferrer" style={{ color: t.cor.verde }}>Senado Federal</a></li>
              <li><a href="https://portaldatransparencia.gov.br" target="_blank" rel="noopener noreferrer" style={{ color: t.cor.verde }}>Portal da Transparência</a></li>
            </ul>
          </div>
        </div>
      </footer>
    </div>
  );
}
