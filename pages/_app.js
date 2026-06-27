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
    <Layout>
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
        ::selection { background: #E8930C; color: #1A1A1A; }
        img { max-width: 100%; }

        :focus-visible { outline: 3px solid #E8930C; outline-offset: 2px; border-radius: 3px; }
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

        @keyframes surgir {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .surgir { animation: surgir .5s cubic-bezier(.2,.7,.2,1) both; }

        .barra-carregando {
          position: fixed; top: 0; left: 0; height: 3px; z-index: 9999;
          background: #E8930C; box-shadow: 0 0 8px #E8930C;
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
