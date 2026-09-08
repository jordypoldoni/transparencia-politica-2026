import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Layout from '../components/Layout';

export default function App({ Component, pageProps }) {
  const router = useRouter();
  const [carregando, setCarregando] = useState(false);

  useEffect(() => {
    const inicio = () => setCarregando(true);
    const fim = () => setCarregando(false);
    router.events.on('routeChangeStart', inicio);
    router.events.on('routeChangeComplete', fim);
    router.events.on('routeChangeError', fim);
    return () => {
      router.events.off('routeChangeStart', inicio);
      router.events.off('routeChangeComplete', fim);
      router.events.off('routeChangeError', fim);
    };
  }, [router]);

  return (
    <Layout pageProps={pageProps}>
      {carregando && <div className="barra-carregando" aria-hidden />}
      <Component {...pageProps} />
      <style jsx global>{`
        * { box-sizing: border-box; }
        html, body { margin: 0; padding: 0; }
        body {
          font-family: "Public Sans", system-ui, sans-serif;
          -webkit-font-smoothing: antialiased;
          text-rendering: optimizeLegibility;
        }
        a { transition: color .15s ease, opacity .15s ease; }
        ::selection { background: #FF8A00; color: #1A1A1A; }
        img { max-width: 100%; }

        :focus-visible { outline: 3px solid #FF8A00; outline-offset: 2px; border-radius: 3px; }
        @media (prefers-reduced-motion: reduce) {
          *, *::before, *::after { animation-duration: .001ms !important; animation-iteration-count: 1 !important; transition-duration: .001ms !important; }
        }

        .pagina { width: 100%; padding: 24px; }
        .leitura { max-width: 72ch; }

        .nav-desktop { display: flex; align-items: center; flex-wrap: wrap; }
        .btn-hamburguer { display: none; }
        .menu-mobile { display: none; }
        @media (max-width: 860px) {
          .nav-desktop { display: none; }
          .btn-hamburguer { display: inline-flex; align-items: center; }
          .menu-mobile { display: block; }
        }

        .hero-grid {
          display: grid;
          grid-template-columns: minmax(0, 1.2fr) minmax(0, 0.9fr);
          gap: 48px; align-items: center;
        }
        @media (max-width: 880px) {
          .hero-grid { grid-template-columns: 1fr; gap: 28px; align-items: stretch; }
        }

        /* Grafico de gastos mes a mes (PerfilPolitico). Fica AQUI, e nao num <style jsx> dentro
           do componente: o compilador do Next quebra ("Option::unwrap() on a None") quando o CSS
           do componente interpola valores dos tokens. Por isso as cores vao em hex, iguais as de
           src/estilo/tokens.js: tinta #191C20, cinza #6B7280, papelQuente2 #F4ECE1.
           Comentarios sem acento aqui de proposito, para nao arriscar o parser de CSS. */
        .grafico-mes--colunas { display: flex; align-items: flex-end; gap: 6px; min-height: 180px; padding: 0 2px; }
        .grafico-mes__col { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 5px; justify-content: flex-end; }
        .grafico-mes__valor { font-size: 0.62rem; font-weight: 700; color: #191C20; white-space: nowrap; line-height: 1; }
        .grafico-mes__barra { width: 100%; max-width: 34px; border-radius: 6px 6px 0 0; transition: height .3s ease; }
        .grafico-mes__rotulo { font-size: 0.62rem; color: #6B7280; font-weight: 700; }

        .grafico-mes--lista { display: none; }
        .grafico-mes__linha { display: grid; grid-template-columns: 4.4rem 1fr auto; align-items: center; gap: 10px; padding: 7px 0; }
        .grafico-mes__mes { font-size: 0.8rem; font-weight: 700; color: #6B7280; }
        .grafico-mes__trilho { display: block; height: 10px; background: #F4ECE1; border-radius: 999px; overflow: hidden; }
        .grafico-mes__preenchido { display: block; height: 100%; border-radius: 999px; }
        .grafico-mes__cifra { font-size: 0.85rem; font-weight: 700; white-space: nowrap; }
        .grafico-mes__vazios { margin: 10px 0 0; font-size: 0.8rem; color: #6B7280; line-height: 1.5; }

        /* No celular as 12 colunas ficariam com ~28px e nenhum valor caberia: vira lista. */
        @media (max-width: 640px) {
          .grafico-mes--colunas { display: none; }
          .grafico-mes--lista { display: block; }
        }

        /* Linhas de ranking e de etapas de votacao.
           Nas duas o problema era o mesmo: varias colunas de largura fixa numa linha que nao
           quebra. Em ~327px de area util no celular a soma nao cabe, e em vez de quebrar a linha
           empurrava o conteudo para fora da tela (a pagina ficava com rolagem horizontal e o
           valor cortado). Aqui elas passam a quebrar. */
        .radar-linha { display: flex; align-items: center; gap: 14px; min-width: 0; }
        .radar-nome { min-width: 0; }
        .etapa-linha { display: flex; align-items: center; gap: 10px; min-width: 0; }

        @media (max-width: 520px) {
          .radar-linha { flex-wrap: wrap; gap: 10px 12px; }
          .radar-linha .radar-valor { width: 100%; text-align: left; padding-left: 40px; }
          .etapa-linha { flex-wrap: wrap; gap: 6px 10px; }
          .etapa-linha .etapa-papel { min-width: 0; }
        }

        @keyframes surgir {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .surgir { animation: surgir .5s cubic-bezier(.2,.7,.2,1) both; }

        .barra-carregando {
          position: fixed; top: 0; left: 0; height: 3px; z-index: 9999;
          background: #FF8A00; box-shadow: 0 0 8px #FF8A00;
          animation: progresso 1.2s ease-in-out infinite;
        }
        @keyframes progresso {
          0% { width: 0%; left: 0; }
          50% { width: 70%; }
          100% { width: 100%; left: 0; opacity: .4; }
        }
      `}</style>
    </Layout>
  );
}
