import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { t } from '../src/estilo/tokens';
import BotaoConta from './BotaoConta';
import { PAGINAS_PRA_VOCE } from './NavPraVoce';
import { sincronizarTudo } from '../src/lib/sincronizacao';
import { aoMudarSessao } from '../src/lib/perfilUsuario';

// ============================================================================
// MENU PRINCIPAL, REORGANIZADO EM 19/09/2026
//
// O QUE ESTAVA ERRADO, E NÃO ERA O CSS
// O menu tinha dez itens no mesmo nível, e eles carregavam SEIS naturezas diferentes
// disputando o mesmo peso visual: navegação (Início), ferramenta pessoal (Pra você), quem
// (Deputados, Senadores), o que foi decidido (Votações, Indicações), dinheiro (Gastos
// públicos) e institucional (Entenda, Sobre & Fontes). Coisas de naturezas diferentes com o
// mesmo peso obrigam a ler as dez antes de escolher.
//
// MEDIDO no site no ar, não estimado: o menu ocupava 964px e, com logo e respiro, exigia
// 1262px. O ponto de corte estava em 1360px, e um notebook de 1366 tem viewport de ~1350
// depois da barra de rolagem: o dono do site perdia o menu inteiro por DEZ pixels.
//
// O CONSERTO É DE ESTRUTURA. Agrupar Deputados com Senadores (é a mesma pergunta, "quem me
// representa", separada só pela casa) e Votações com Indicações (as duas são decisão tomada)
// levou o menu de 964px para 698px, medido com os rótulos definitivos.
//
// SOBRE & FONTES saiu do menu e foi para o rodapé, junto das fontes oficiais, que é o assunto
// da página. Nada foi removido do site, só mudou de camada.
//
// "INÍCIO" FICA, e isto foi uma correção do Jordy. Eu tinha tirado, no argumento de que o logo
// leva à home e tem aria-label dizendo isso. Ele perguntou se o usuário saberia disso, e a
// pergunta responde sozinha: logo-clicável é convenção de quem navega muito, e o público que
// este site persegue é justamente quem não navega muito. Custa 58px num menu que sobra espaço.
//
// POR QUE DISCLOSURE E NÃO role="menu": "Parlamentares" e "Decisões" não são páginas, são
// agrupamentos. O padrão de menu de aplicação (role="menu") exige navegação por setas e
// captura o Tab, o que é errado para navegação de site. Aqui é botão que revela uma lista de
// links, que é o padrão recomendado para navegação e o que o leitor de tela anuncia certo.
// ============================================================================

const navItens = [
  { href: '/', rotulo: 'Início' },
  // 26/09/2026: "Pra você" virou grupo (decisão do Jordy): cédula, afinidade, favoritos e perfil,
  // cada um com endereço próprio. A lista mora em NavPraVoce.jsx, que as páginas também usam.
  { rotulo: 'Pra você', filhos: PAGINAS_PRA_VOCE },
  {
    rotulo: 'Parlamentares',
    filhos: [
      { href: '/deputados', rotulo: 'Deputados', nota: 'federais e estaduais' },
      { href: '/senadores', rotulo: 'Senadores', nota: 'os 81 em exercício' },
    ],
  },
  {
    rotulo: 'Decisões',
    filhos: [
      { href: '/votacoes', rotulo: 'Votações', nota: 'Câmara, Senado e Assembleia do RS' },
      { href: '/indicacoes', rotulo: 'Indicações', nota: 'nomes do presidente no Senado' },
    ],
  },
  { href: '/gastos-publicos', rotulo: 'Gastos públicos' },
  { href: '/candidatos-2026', rotulo: 'Eleições 2026' },
  { href: '/entenda', rotulo: 'Entenda' },
];

function ehAtivo(href, pathname) {
  const hp = href.split('?')[0];
  if (hp === '/') return pathname === '/';
  // Senadores e Deputados sao rotas proprias desde 12/09/2026. Antes a lista de senadores
  // vivia em /deputados?casa=senado, e esta funcao tinha de deduzir a casa pela query e,
  // dentro de um perfil, pela casa do proprio parlamentar.
  if (hp === '/senadores') return pathname === '/senadores' || pathname.startsWith('/senador/');
  if (hp === '/deputados') return pathname === '/deputados' || pathname.startsWith('/deputados/') || pathname.startsWith('/deputado/');
  if (hp === '/indicacoes') return pathname === '/indicacoes' || pathname.startsWith('/indicacao/');
  if (hp === '/votacoes') return pathname === '/votacoes' || pathname.startsWith('/votacao');
  if (hp === '/candidatos-2026') return pathname === '/candidatos-2026' || pathname.startsWith('/presidencial/') || pathname.startsWith('/deputado-federal/') || pathname.startsWith('/candidato-');
  return pathname === hp || pathname.startsWith(hp + '/');
}

// NOME DA PÁGINA NO CABEÇALHO DO CELULAR (26/09/2026, pedido do Jordy). No celular o menu vira
// hambúrguer e some a pista de onde a pessoa está. O nome sai do próprio menu (o item ativo), e
// as páginas que não estão no menu têm nome aqui.
const FORA_DO_MENU = [
  ['/entrar', 'Entrar'], ['/privacidade', 'Privacidade'], ['/sobre', 'Sobre o Lume'],
  ['/estado/', 'Parlamentares do estado'], ['/ente/', 'Gastos públicos'],
];
function nomeDaPagina(pathname) {
  for (const n of navItens) {
    if (n.filhos) { const f = n.filhos.find((x) => ehAtivo(x.href, pathname)); if (f) return f.rotulo; }
    else if (ehAtivo(n.href, pathname)) return n.rotulo;
  }
  const extra = FORA_DO_MENU.find(([p]) => (p.endsWith('/') ? pathname.startsWith(p) : pathname === p));
  return extra ? extra[1] : '';
}

const grupoAtivo = (item, pathname) =>
  !!item.filhos && item.filhos.some((f) => ehAtivo(f.href, pathname));

// ONDE VOCÊ ESTÁ = PASTILHA ÂMBAR. (pedido do Jordy, 19/09/2026)
// Era `papelQuente2`, um bege acinzentado que se confundia com o fundo do cabeçalho: marcava
// a página atual sem chamar atenção, que é o contrário do que a marca deveria fazer aqui.
// Agora é o âmbar do site, com texto na tinta. Contraste medido: 7,24:1, passa AA e AAA.
// Texto claro sobre âmbar está PROIBIDO nas Diretrizes (branco dá 2,4:1), por isso tinta.
const ATIVO_FUNDO = t.cor.ouro;
const ATIVO_TEXTO = t.cor.tinta;

// Estilo do item de primeiro nível. Sem borda: separação por superfície preenchida, nunca por
// contorno (Diretrizes). A pastilha do ativo é a única superfície da barra.
const itemTopo = (ativo) => ({
  display: 'inline-flex', alignItems: 'center', gap: '5px',
  textDecoration: 'none', border: 'none', cursor: 'pointer',
  fontFamily: t.fonte.corpo, fontSize: '0.88rem',
  color: ativo ? ATIVO_TEXTO : t.cor.cinza,
  fontWeight: ativo ? 800 : 600,
  padding: '8px 11px',
  whiteSpace: 'nowrap',
  borderRadius: t.raio.pill,
  background: ativo ? ATIVO_FUNDO : 'transparent',
  transition: 'background .15s, color .15s',
});

function Seta({ aberto }) {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"
      style={{ transform: aberto ? 'rotate(180deg)' : 'none', transition: 'transform .18s ease', flexShrink: 0 }}>
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

export default function Layout({ children, pageProps }) {
  const { pathname, asPath } = useRouter();
  const [menu, setMenu] = useState(false);       // hambúrguer
  const [aberto, setAberto] = useState(null);    // rótulo do grupo aberto, ou null
  const navRef = useRef(null);
  const relogio = useRef(null);

  useEffect(() => { setMenu(false); setAberto(null); }, [asPath]); // fecha ao navegar

  // Respostas e favoritos entre aparelhos (src/lib/sincronizacao.js): ao abrir o site, ao entrar
  // na conta e ao voltar para a aba. Sem sessão ou sem autorização, não faz nada.
  useEffect(() => {
    sincronizarTudo({ forcar: true });
    const parar = aoMudarSessao((s) => { if (s) sincronizarTudo({ forcar: true }); });
    const aoVoltar = () => { if (document.visibilityState === 'visible') sincronizarTudo(); };
    document.addEventListener('visibilitychange', aoVoltar);
    return () => { parar(); document.removeEventListener('visibilitychange', aoVoltar); };
  }, []);

  // MENU MÓVEL TRAVA A PÁGINA (26/09/2026). Com o menu aberto, o dedo rolava a página de baixo
  // e o menu ia junto, porque era parte do cabeçalho. Agora: a página trava (classe no <html>,
  // CSS em _app.js), o menu tem rolagem própria até o fim da tela e um fundo escurecido que
  // fecha ao tocar. Esc também fecha.
  const topoRef = useRef(null);
  const [alturaTopo, setAlturaTopo] = useState(0);
  useEffect(() => {
    const html = document.documentElement;
    if (!menu) { html.classList.remove('menu-aberto'); return undefined; }
    setAlturaTopo(topoRef.current?.offsetHeight || 0);
    html.classList.add('menu-aberto');
    const esc = (e) => { if (e.key === 'Escape') setMenu(false); };
    window.addEventListener('keydown', esc);
    return () => { html.classList.remove('menu-aberto'); window.removeEventListener('keydown', esc); };
  }, [menu]);

  // ---------------------------------------------------------------------------
  // O SUBMENU NÃO PODE FECHAR ENQUANTO O MOUSE VAI ATÉ ELE. (corrigido em 19/09/2026)
  //
  // A primeira versão fechava assim que o ponteiro saía do botão, e era impossível chegar às
  // opções. Duas causas somadas, e as duas precisam de conserto:
  //
  //   1. ZONA MORTA. O painel abria em `top: calc(100% + 6px)`. Esses 6px não pertencem a
  //      elemento nenhum, então atravessá-los disparava mouseleave. Agora o painel fica em
  //      `top: 100%` dentro de um invólucro com `paddingTop: 6px`: o respiro visual continua,
  //      mas o caminho do mouse é contínuo.
  //   2. FECHAMENTO INSTANTÂNEO. Mesmo sem vão, sair um pixel pela borda fechava na hora.
  //      Agora há 220ms de tolerância, cancelados se o ponteiro voltar. É o intervalo comum
  //      para menu suspenso: curto o bastante para não parecer travado, longo o bastante para
  //      um movimento de mão normal.
  // ---------------------------------------------------------------------------
  const abrirGrupo = (rotulo) => { clearTimeout(relogio.current); setAberto(rotulo); };
  const fecharComTolerancia = () => {
    clearTimeout(relogio.current);
    relogio.current = setTimeout(() => setAberto(null), 220);
  };
  useEffect(() => () => clearTimeout(relogio.current), []);

  // Fechar o submenu: clique fora e Esc. O Esc devolve o foco para o botão do grupo, senão
  // quem navega por teclado fecha o painel e o foco fica órfão no fim da página.
  useEffect(() => {
    if (!aberto) return;
    const foraDaqui = (e) => { if (navRef.current && !navRef.current.contains(e.target)) setAberto(null); };
    const escapou = (e) => {
      if (e.key !== 'Escape') return;
      setAberto(null);
      navRef.current?.querySelector(`[data-grupo="${aberto}"]`)?.focus();
    };
    document.addEventListener('mousedown', foraDaqui);
    document.addEventListener('keydown', escapou);
    return () => {
      document.removeEventListener('mousedown', foraDaqui);
      document.removeEventListener('keydown', escapou);
    };
  }, [aberto]);

  return (
    <div style={{ minHeight: '100vh', background: t.cor.papel, color: t.cor.tinta, fontFamily: t.fonte.corpo, display: 'flex', flexDirection: 'column' }}>
      {/* Cabeçalho */}
      <header ref={topoRef} style={{ boxShadow: '0 1px 14px rgba(74,52,30,0.06)', background: 'rgba(251,248,242,0.9)', backdropFilter: 'blur(8px)', position: 'sticky', top: 0, zIndex: 50 }}>
        {/* nowrap desde 18/09: com `wrap`, o menu que não coubesse na linha CAÍA para baixo do
            logo em vez de virar hambúrguer. Uma linha extra de menu não é um estado desenhado,
            é um acidente de layout. Ou cabe na linha, ou o hambúrguer assume (ponto de corte
            em _app.js, de 1360 para 1060 depois que o menu encolheu). */}
        <div className="topo-linha" style={{ width: '100%', padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', flexWrap: 'nowrap' }}>
          {/* LOGO + CONTA, juntos à esquerda (pedido do Jordy, 26/09/2026). No celular (mesmo
              ponto de corte do hambúrguer, em _app.js) o logotipo sai e fica só o símbolo, menor,
              para o botão de entrar caber ao lado sem apertar. */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', minWidth: 0 }}>
            <Link href="/" aria-label="Lume Cidadão, ir para a página inicial"
              style={{ textDecoration: 'none', display: 'flex', alignItems: 'center' }}>
              {/* Marca em SVG de contorno: símbolo + logotipo (Plus Jakarta Sans 700/500 vetorizada),
                  sem dependência de fonte e sem perda em qualquer tamanho. */}
              <img className="logo-marca" src="/marca-lume.svg" alt="Lume Cidadão" style={{ height: '30px', width: 'auto', display: 'block' }} />
              <img className="logo-simbolo" src="/simbolo-lume.svg" alt="Lume Cidadão" style={{ height: '26px', width: 'auto' }} />
            </Link>
            <BotaoConta />
          </div>

          <nav ref={navRef} className="nav-desktop" aria-label="Navegação principal" style={{ gap: '0' }}>
            {navItens.map((n) => {
              if (!n.filhos) {
                const ativo = ehAtivo(n.href, pathname);
                return (
                  <Link key={n.rotulo} href={n.href} aria-current={ativo ? 'page' : undefined} style={itemTopo(ativo)}>
                    {n.rotulo}
                  </Link>
                );
              }
              const ativo = grupoAtivo(n, pathname);
              const estaAberto = aberto === n.rotulo;
              return (
                <div key={n.rotulo} style={{ position: 'relative' }}
                  onMouseEnter={() => abrirGrupo(n.rotulo)}
                  onMouseLeave={fecharComTolerancia}>
                  <button
                    type="button"
                    data-grupo={n.rotulo}
                    aria-expanded={estaAberto}
                    aria-haspopup="true"
                    onClick={() => (estaAberto ? setAberto(null) : abrirGrupo(n.rotulo))}
                    style={itemTopo(ativo)}
                  >
                    {n.rotulo}
                    <Seta aberto={estaAberto} />
                  </button>

                  {estaAberto && (
                    // Invólucro sem fundo, colado no botão (top: 100%), com o respiro de 6px
                    // como PADDING. É o que elimina a zona morta entre o botão e o painel.
                    <div
                      style={{ position: 'absolute', top: '100%', left: 0, paddingTop: '6px', zIndex: 60 }}
                      onMouseEnter={() => abrirGrupo(n.rotulo)}
                      onMouseLeave={fecharComTolerancia}
                    >
                      <div style={{
                        minWidth: '260px', background: t.cor.papelCartao,
                        borderRadius: t.raio.md, boxShadow: t.sombra.media, padding: '6px',
                      }}>
                        {n.filhos.map((f) => {
                          const fAtivo = ehAtivo(f.href, pathname);
                          return (
                            <Link key={f.href} href={f.href} aria-current={fAtivo ? 'page' : undefined}
                              onClick={() => setAberto(null)}
                              style={{
                                display: 'block', textDecoration: 'none', padding: '10px 12px',
                                borderRadius: t.raio.sm,
                                background: fAtivo ? ATIVO_FUNDO : 'transparent',
                                transition: 'background .12s',
                              }}
                              onMouseOver={(e) => { if (!fAtivo) e.currentTarget.style.background = t.cor.papelQuente; }}
                              onMouseOut={(e) => { if (!fAtivo) e.currentTarget.style.background = 'transparent'; }}
                            >
                              <span style={{ display: 'block', fontSize: '0.9rem', fontWeight: fAtivo ? 800 : 700, color: t.cor.tinta }}>{f.rotulo}</span>
                              {/* Na pastilha âmbar a nota vai em tinta, nunca em cinza:
                                  cinza sobre âmbar não alcança o mínimo do AA. */}
                              {f.nota && <span style={{ display: 'block', fontSize: '0.76rem', color: fAtivo ? ATIVO_TEXTO : t.cor.cinza, marginTop: '1px' }}>{f.nota}</span>}
                            </Link>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
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

        {/* Segunda linha do cabeçalho, só no celular (CSS em _app.js): o nome da página. Linha
            própria, e não entre o logo e o hambúrguer, porque ali já estão o símbolo e a conta
            com nome e sobrenome: numa linha só, o nome da página viraria "Gastos pú..." */}
        {nomeDaPagina(pathname) && (
          <p className="titulo-pagina-movel" style={{ margin: 0, fontFamily: t.fonte.titulo, fontWeight: 600, fontSize: '1.15rem', lineHeight: 1.2, color: t.cor.tinta, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {nomeDaPagina(pathname)}
          </p>
        )}

        {/* Menu mobile. Os grupos viram SEÇÕES abertas, não sanfona: no celular há rolagem de
            sobra, e esconder dois links atrás de mais um toque só acrescenta trabalho. */}
        {menu && (
          <div className="menu-mobile" aria-hidden="true" onClick={() => setMenu(false)}
            style={{ position: 'absolute', top: '100%', left: 0, right: 0, height: `calc(100dvh - ${alturaTopo}px)`, background: 'rgba(25,28,32,0.38)', touchAction: 'none' }} />
        )}
        {menu && (
          <nav className="menu-mobile" aria-label="Navegação principal"
            style={{ position: 'absolute', top: '100%', left: 0, right: 0, maxHeight: `calc(100dvh - ${alturaTopo}px)`, overflowY: 'auto', overscrollBehavior: 'contain', WebkitOverflowScrolling: 'touch', background: t.cor.papel, padding: '8px 12px 14px', boxShadow: t.sombra.media }}>
            {navItens.map((n) => {
              if (!n.filhos) {
                const ativo = ehAtivo(n.href, pathname);
                return (
                  <Link key={n.rotulo} href={n.href} aria-current={ativo ? 'page' : undefined}
                    style={{
                      display: 'block', textDecoration: 'none', padding: '14px 12px',
                      color: ativo ? ATIVO_TEXTO : t.cor.cinza, fontWeight: ativo ? 800 : 600,
                      fontSize: '1.05rem', borderRadius: t.raio.sm,
                      background: ativo ? ATIVO_FUNDO : 'transparent',
                    }}>
                    {n.rotulo}
                  </Link>
                );
              }
              return (
                <div key={n.rotulo} style={{ marginTop: '6px' }}>
                  <p style={{ margin: '10px 12px 2px', fontSize: '0.72rem', fontWeight: 800, letterSpacing: '0.05em', textTransform: 'uppercase', color: t.cor.cinza }}>
                    {n.rotulo}
                  </p>
                  {n.filhos.map((f) => {
                    const fAtivo = ehAtivo(f.href, pathname);
                    return (
                      <Link key={f.href} href={f.href} aria-current={fAtivo ? 'page' : undefined}
                        style={{
                          display: 'block', textDecoration: 'none', padding: '14px 12px',
                          color: fAtivo ? ATIVO_TEXTO : t.cor.cinza, fontWeight: fAtivo ? 800 : 600,
                          fontSize: '1.05rem', borderRadius: t.raio.sm,
                          background: fAtivo ? ATIVO_FUNDO : 'transparent',
                        }}>
                        {f.rotulo}
                      </Link>
                    );
                  })}
                </div>
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
            <img src="/marca-lume.svg" alt="Lume Cidadão" style={{ height: '24px', width: 'auto', display: 'block', marginBottom: '10px' }} />
            <p style={{ margin: 0, lineHeight: 1.5 }}>
              Informação política em linguagem clara, sem lado. Todos os dados vêm de fontes oficiais e podem ser conferidos por você.
            </p>
            {/* "Sobre & Fontes" saiu do menu principal em 19/09/2026 e passou a morar aqui, ao
                lado das fontes oficiais, que é o assunto da página. Ocupava 124px do menu,
                mais que "Deputados", para conteúdo institucional. */}
            <p style={{ margin: '12px 0 0' }}>
              <Link href="/sobre" style={{ color: t.cor.ouroTexto, fontWeight: 700 }}>Sobre o Lume e as fontes que usamos</Link>
            </p>
            {/* 26/09/2026: a política de privacidade entrou com o perfil do usuário (banco 2). */}
            <p style={{ margin: '8px 0 0' }}>
              <Link href="/privacidade" style={{ color: t.cor.ouroTexto, fontWeight: 700 }}>Privacidade: o que guardamos sobre você</Link>
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

        {/* Assinatura do rodapé. O ano vem do relógio, não fixo: um "© 2026" congelado em 2028
            é o tipo de detalhe que faz o leitor duvidar de quão atual é o resto da página. */}
        <div style={{ borderTop: `1px solid ${t.cor.papelQuente2}` }}>
          <div style={{ width: '100%', padding: '18px 24px', display: 'flex', flexWrap: 'wrap', gap: '6px 20px', justifyContent: 'space-between', color: t.cor.cinza, fontSize: '0.8rem' }}>
            <p style={{ margin: 0 }}>© {new Date().getFullYear()} Lume Cidadão. Todos os direitos reservados.</p>
            <p style={{ margin: 0 }}>Desenvolvido por Jordy Oldoni</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
