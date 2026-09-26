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

        /* flex-wrap: nowrap + flex-shrink: 0 desde 18/09/2026.
           O menu estava EMPILHANDO os nomes uns sobre os outros ao diminuir a tela. Causa: o
           cabecalho virou nowrap (pra nao jogar o menu pra segunda linha), mas o proprio menu
           continuava com flex-wrap: wrap. Resultado: entre o ponto de corte e a largura em que
           ele cabe de verdade, o menu era espremido e quebrava POR DENTRO. Agora ele nao
           quebra nem encolhe: ou cabe inteiro, ou o hamburguer assume. */
        .nav-desktop { display: flex; align-items: center; flex-wrap: nowrap; flex-shrink: 0; }
        /* Alvo de toque em tela sensível (Diretrizes: mínimo 24px, 40px em pointer coarse).
           O item do menu tem ~33px de altura com a fonte de 0.88rem, o que basta para mouse
           mas não para dedo. Um notebook com tela de toque fica acima do ponto de corte e vê
           o menu inteiro, então a regra precisa existir aqui, não só no mobile. */
        @media (pointer: coarse) {
          .nav-desktop a, .nav-desktop button { padding-top: 12px; padding-bottom: 12px; }
        }
        .btn-hamburguer { display: none; }
        .menu-mobile { display: none; }
        /* PONTO DE CORTE DO HAMBÚRGUER: 1360 -> 1000 em 19/09/2026.

           Histórico curto, porque o número subiu duas vezes pelo motivo errado: 860 -> 1240 e
           depois -> 1360, sempre para acomodar um menu que crescia. Com dez itens o menu
           media 964px e, com logo e respiro, exigia 1262px. Um notebook de 1366px tem
           viewport de ~1350 depois da barra de rolagem, então o dono do site perdia o menu
           inteiro por DEZ pixels, em desktop, sem ter pedido isso.

           A correção foi de estrutura, não de número: agrupar Deputados com Senadores e
           Votações com Indicações, e mandar Sobre & Fontes para o rodapé, levou o menu de
           964px para 698px, MEDIDO no site com os rótulos definitivos (e já contando o
           "Início", que voltou por pedido do Jordy). Com logo e respiro, precisa de 996px.
           O corte fica em 1060 para ter folga de verdade: 1000 deixaria 4px, que é repetir
           em escala menor o erro que esta nota descreve.

           REGRA QUE FICA: quando o menu não couber, a resposta é reorganizar o menu, não
           subir o ponto de corte. Subir o corte resolve para quem tem tela grande e tira a
           navegação de todo o resto. */
        /* Logo (26/09/2026): marca inteira em tela larga; abaixo de 1200px, só o símbolo, para o
           botão de entrar caber ao lado dele (Layout.jsx). O corte é 1200 e não o do hambúrguer
           (1060) por CONTA, não por gosto: marca de 234px + botão Entrar + menu de ~715px pedem
           ~1104px, e entre 1061 e 1104 o menu vazaria. Trocar a marca pelo símbolo devolve
           ~210px, sem subir o corte do menu (regra de 19/09). */
        .logo-simbolo { display: none; }
        @media (max-width: 1200px) {
          .logo-marca { display: none !important; }
          .logo-simbolo { display: block; }
        }
        @media (max-width: 1060px) {
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

        /* CELULAR SEM ARRASTAR PARA OS LADOS (26/09/2026).
           1) overflow-x clip: nada pode alargar a pagina alem da tela. Clip e nao hidden, porque
              hidden no body quebra o cabecalho sticky.
           2) Campo de digitar com 16px no celular: abaixo disso o iPhone da zoom ao tocar no campo
              e depois a pagina fica solta, andando para os lados.
           3) Menu aberto trava a rolagem da pagina de baixo (classe posta pelo Layout). So no html:
              overflow hidden no body transforma o body em area de rolagem e o cabecalho sticky some. */
        html, body { overflow-x: clip; max-width: 100%; }
        @media (max-width: 760px) { input, select, textarea { font-size: 16px !important; } }
        html.menu-aberto { overflow: hidden; overscroll-behavior: none; }

        /* Tela /entrar (26/09/2026). Celular: titulo, cartao de login, explicacao. Computador:
           titulo e explicacao a esquerda, cartao a direita ocupando as duas linhas. */
        .entrar-grade { display: grid; gap: 28px; grid-template-columns: minmax(0, 1fr);
          grid-template-areas: "texto" "acao" "porque"; max-width: 480px; margin: 8px auto 0; }
        .entrar-texto { grid-area: texto; }
        .entrar-acao { grid-area: acao; }
        .entrar-porque { grid-area: porque; }
        @media (min-width: 880px) {
          .entrar-grade { max-width: 1000px; grid-template-columns: minmax(0, 1fr) minmax(0, 430px);
            grid-template-areas: "texto acao" "porque acao"; column-gap: 72px; row-gap: 28px;
            align-items: start; margin-top: 40px; }
          .entrar-texto { align-self: end; }
        }

        /* Placeholder do campo de e-mail do /entrar: cinza #666E7B (4,7:1), nao o cinza claro
           padrao do navegador. Em hex pelo mesmo motivo do bloco abaixo. */
        .campo-email::placeholder { color: #666E7B; opacity: 1; }

        /* Grafico de gastos mes a mes (PerfilPolitico). Fica AQUI, e nao num <style jsx> dentro
           do componente: o compilador do Next quebra ("Option::unwrap() on a None") quando o CSS
           do componente interpola valores dos tokens. Por isso as cores vao em hex, iguais as de
           src/estilo/tokens.js: tinta #191C20, cinza #666E7B, papelQuente2 #F4ECE1.
           Comentarios sem acento aqui de proposito, para nao arriscar o parser de CSS. */
        .grafico-mes--colunas { display: flex; align-items: flex-end; gap: 6px; min-height: 180px; padding: 0 2px; }
        .grafico-mes__col { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 5px; justify-content: flex-end; }
        .grafico-mes__valor { font-size: 0.62rem; font-weight: 700; color: #191C20; white-space: nowrap; line-height: 1; }
        .grafico-mes__barra { width: 100%; max-width: 34px; border-radius: 6px 6px 0 0; transition: height .3s ease; }
        .grafico-mes__rotulo { font-size: 0.62rem; color: #666E7B; font-weight: 700; }

        .grafico-mes--lista { display: none; }
        .grafico-mes__linha { display: grid; grid-template-columns: 4.4rem 1fr auto; align-items: center; gap: 10px; padding: 7px 0; }
        .grafico-mes__mes { font-size: 0.8rem; font-weight: 700; color: #666E7B; }
        .grafico-mes__trilho { display: block; height: 10px; background: #F4ECE1; border-radius: 999px; overflow: hidden; }
        .grafico-mes__preenchido { display: block; height: 100%; border-radius: 999px; }
        .grafico-mes__cifra { font-size: 0.85rem; font-weight: 700; white-space: nowrap; }
        .grafico-mes__vazios { margin: 10px 0 0; font-size: 0.8rem; color: #666E7B; line-height: 1.5; }

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
        /* Grade de parlamentares (/deputados, /deputados/[uf], /senadores). Colunas fixas por
           faixa de largura em vez de auto-fill: o pedido e 5 por linha no desktop, e auto-fill
           entrega 4 ou 6 conforme a largura da janela. */
        /* ---- Painel do ranking (cartao indigo) ----
           Cabecalho: identidade a esquerda, numero do conjunto a direita. O contador nao e
           controle, e um dado sobre o conjunto, entao vive aqui e nao no meio dos botoes. */
        .painel-topo { display: flex; justify-content: space-between; align-items: flex-start; gap: 12px 32px; flex-wrap: wrap; margin: 0 0 20px; }
        .painel-meta { flex-shrink: 0; text-align: right; margin: 0; font-size: 0.8rem; line-height: 1.35; color: rgba(255,255,255,0.6); }
        .painel-meta strong { display: block; color: #fff; font-size: 1.5rem; font-weight: 800; font-family: "Fraunces", Georgia, serif; line-height: 1.1; }

        /* Barra de controles: os dois seletores juntos a esquerda, cada um no seu trilho.
           Empurrar um para cada ponta da linha abria um buraco de 500px no meio e fazia dois
           controles irmaos parecerem coisas sem relacao. */
        .barra-controles { display: flex; flex-wrap: wrap; align-items: center; gap: 10px 14px; margin: 0 0 14px; }
        .trilho { display: inline-flex; align-items: center; gap: 4px; padding: 4px; border-radius: 999px; background: rgba(255,255,255,0.09); }
        /* No dedo, o alvo precisa ser maior que no mouse. 32px passa no minimo da WCAG 2.2
           (24px), mas erra facil; em tela de toque a pastilha cresce. */
        @media (pointer: coarse) { .trilho button { min-height: 40px; } }

        /* O que a assembleia publica e o que nao publica (/deputados/[uf]). Sem container:
           texto corrido, na mesma margem do paragrafo de cima. A margem negativa aproxima os
           dois, porque sao a mesma ideia continuada. */
        .nota-casa { margin: -16px 0 24px; max-width: 88ch; font-size: 0.88rem; line-height: 1.55; color: #666E7B; }
        .nota-casa strong { color: #191C20; font-weight: 700; }

        /* Nota do seletor de ano: uma linha, colada na barra de controles, porque e sobre o
           CONTROLE. Antes dividia uma grade de duas colunas com a ressalva de leitura da
           lista: coisas de donos diferentes, e uma acabava flutuando no canto direito. */
        .nota-ano { margin: -4px 0 16px; font-size: 0.82rem; line-height: 1.5; color: rgba(255,255,255,0.62); max-width: 72ch; }
        .nota-ano strong { color: rgba(255,255,255,0.88); font-weight: 700; }

        /* Faixa de leitura: governa as linhas que vem abaixo, entao ocupa a largura inteira e
           gruda no topo da lista, com superficie propria. */
        .faixa-leitura { margin: 0 0 10px; padding: 12px 16px; border-radius: 10px; background: rgba(255,255,255,0.07); font-size: 0.83rem; line-height: 1.55; color: rgba(255,255,255,0.72); }
        .faixa-leitura strong { color: #fff; font-weight: 700; }

        @media (max-width: 760px) {
          .painel-meta { text-align: left; }
          .painel-meta strong { display: inline; font-size: 1rem; margin-right: 6px; }
        }
        /* Grade de parlamentares (/deputados, /deputados/[uf], /senadores). Colunas fixas por
           faixa de largura em vez de auto-fill: o pedido e 5 por linha no desktop, e auto-fill
           entrega 4 ou 6 conforme a largura da janela. */
        /* Celular (26/09/2026): UM cartao por linha. Com dois, nome e partido viravam "Al..." e
           "RE..." e ninguem sabia quem era quem. */
        .grade-parl { display: grid; gap: 10px; grid-template-columns: minmax(0, 1fr); }
        @media (min-width: 560px) { .grade-parl { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
        @media (min-width: 760px) { .grade-parl { grid-template-columns: repeat(3, minmax(0, 1fr)); } }
        @media (min-width: 980px) { .grade-parl { grid-template-columns: repeat(4, minmax(0, 1fr)); } }
        @media (min-width: 1120px) { .grade-parl { grid-template-columns: repeat(5, minmax(0, 1fr)); } }
        .radar-linha { display: flex; align-items: center; gap: 14px; min-width: 0; }
        .radar-nome { min-width: 0; }
        .etapa-linha { display: flex; align-items: center; gap: 10px; min-width: 0; }

        /* Painel de entrada da /votacoes (19/09/2026): um cartao por casa, em tres colunas,
           ocupando a largura inteira. Em grade de tres cartoes lado a lado o texto que explica
           o que cada decisao alcanca virava uma coluna de sete palavras por linha, e e
           justamente esse texto que serve a quem chega sem saber o que procurar.
           Abaixo de 900px vira uma coluna, na ordem do codigo: identidade, alcance, recentes. */
        .painel-casa {
          display: grid; gap: 26px; align-items: start;
          grid-template-columns: minmax(200px, 0.85fr) minmax(280px, 1.3fr) minmax(240px, 1fr);
        }
        @media (max-width: 900px) {
          .painel-casa { grid-template-columns: 1fr; gap: 18px; }
        }

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
