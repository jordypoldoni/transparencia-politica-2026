import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { Analytics } from '@vercel/analytics/next';
import { limparEnderecoParaMedicao } from '../src/lib/analitica';
import Layout from '../components/Layout';
import IndicadorNavegacao from '../components/IndicadorNavegacao';
import { comecouNavegacao, terminouNavegacao, cancelouNavegacao, falhouNavegacao } from '../src/lib/navegacao';

export default function App({ Component, pageProps }) {
  const router = useRouter();
  // Estado de navegacao (20/10/2026): src/lib/navegacao.js e a fonte unica; o IndicadorNavegacao e o
  // CampoSelect leem dele. Navegacao cancelada (outro clique antes de abrir) nao e erro.
  useEffect(() => {
    const inicio = (url) => comecouNavegacao(url);
    const fim = () => terminouNavegacao();
    const erro = (err) => (err && err.cancelled ? cancelouNavegacao() : falhouNavegacao());
    router.events.on('routeChangeStart', inicio);
    router.events.on('routeChangeComplete', fim);
    router.events.on('routeChangeError', erro);
    return () => {
      router.events.off('routeChangeStart', inicio);
      router.events.off('routeChangeComplete', fim);
      router.events.off('routeChangeError', erro);
    };
  }, [router]);

  return (
    <Layout pageProps={pageProps}>
      <IndicadorNavegacao />
      <Component {...pageProps} />
      <Analytics beforeSend={limparEnderecoParaMedicao} />
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
        .secao-home { padding-left: 24px; padding-right: 24px; }
        .leitura { width: 100%; }
        /* Resumo "Entenda em 1 minuto" (pagina de uma votacao), 07/11/2026. Desenho aprovado pelo Jordy. Sem borda colorida: destaque por sombra e fundo. */
        .dest-sec { margin: 26px 0 12px; }
        .dest-sec h2 { font-family: "Fraunces", Georgia, serif; font-weight: 600; font-size: 1.6rem; margin: 0 0 4px; color: #191C20; }
        .dest-sub-titulo { margin: 18px 0 6px; font-size: 1rem; }
        .dest-tag { font-size: 0.7rem; font-weight: 800; letter-spacing: 0.05em; text-transform: uppercase; padding: 4px 10px; border-radius: 6px; }
        .dest-imp { background: #241E52; color: #fff; }
        .dest-sub { margin: 0 0 14px; font-size: 0.92rem; line-height: 1.5; color: #666E7B; }
        .dest-grade { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 16px; }
        .dest-cartao { background: #fff; border-radius: 24px; box-shadow: 0 1px 2px rgba(74,52,30,.06), 0 4px 16px rgba(74,52,30,.05); padding: 20px 22px; display: flex; flex-direction: column; text-decoration: none; color: inherit; transition: box-shadow .15s; }
        .dest-cartao:hover { box-shadow: 0 12px 30px rgba(74,52,30,.16); }
        .dest-topo { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; margin-bottom: 8px; }
        .dest-st { font-size: 0.7rem; font-weight: 800; letter-spacing: 0.04em; text-transform: uppercase; padding: 4px 10px; border-radius: 6px; background: #F4ECE1; color: #7A4B00; }
        .dest-st.ok { background: #E7F3EC; color: #1F7A4D; }
        .dest-rot { font-size: 0.76rem; color: #666E7B; margin: 0 0 6px; }
        .dest-cartao h4 { font-family: "Fraunces", Georgia, serif; font-weight: 600; font-size: 1.18rem; line-height: 1.25; margin: 0 0 8px; color: #191C20; }
        .dest-txt { margin: 0 0 12px; font-size: 0.9rem; line-height: 1.5; color: #666E7B; flex: 1; }
        .dest-link { font-size: 0.85rem; font-weight: 800; color: #A85B00; }
        .dest-alta { background: #FF8A00; color: #171238; }
        .dest-rank { display: grid; gap: 10px; }
        .dest-linha { background: #fff; border-radius: 20px; box-shadow: 0 1px 2px rgba(74,52,30,.06), 0 4px 16px rgba(74,52,30,.05); padding: 14px 18px; display: flex; align-items: center; gap: 14px; text-decoration: none; color: inherit; transition: box-shadow .15s; }
        .dest-linha:hover { box-shadow: 0 12px 30px rgba(74,52,30,.16); }
        .dest-n { flex: none; width: 34px; height: 34px; border-radius: 999px; background: #241E52; color: #FF8A00; font-weight: 800; display: flex; align-items: center; justify-content: center; }
        .dest-x { flex: 1; min-width: 0; }
        .dest-x b { font-family: "Fraunces", Georgia, serif; font-weight: 600; font-size: 1.08rem; color: #191C20; display: block; }
        .dest-x small { font-size: 0.76rem; color: #666E7B; display: block; }
        .dest-porque { display: flex; gap: 6px; flex-wrap: wrap; margin-top: 6px; }
        .dest-fonte { font-size: 0.7rem; font-weight: 700; padding: 3px 9px; border-radius: 999px; background: #F4ECE1; color: #5C3A00; }
        .dest-mais { display: flex; justify-content: center; margin-top: 14px; }
        .entenda-status { margin: 0 0 14px; font-size: 0.92rem; line-height: 1.5; color: #191C20; }
        .entenda-sec { margin: 28px 0 8px; }
        .entenda-sec h2 { font-family: "Fraunces", Georgia, serif; font-weight: 600; font-size: 1.5rem; margin: 0 0 6px; color: #191C20; }
        .entenda-sub { margin: 0 0 16px; font-size: 0.9rem; line-height: 1.5; color: #666E7B; }
        .entenda-grade { display: grid; grid-template-columns: 1.15fr 1fr; gap: 16px; }
        .entenda-cartao { background: #fff; border-radius: 24px; box-shadow: 0 1px 2px rgba(74,52,30,.06), 0 4px 16px rgba(74,52,30,.05); padding: 24px; }
        .entenda-cartao h3 { font-size: 1.05rem; font-weight: 700; margin: 0 0 14px; color: #191C20; }
        .entenda-cheio { grid-column: 1 / -1; }
        .entenda-lista { list-style: none; margin: 0; padding: 0; display: grid; gap: 14px; }
        .entenda-lista li { display: flex; gap: 14px; align-items: flex-start; font-size: 1rem; line-height: 1.5; color: #191C20; }
        .entenda-n { flex: none; width: 28px; height: 28px; border-radius: 999px; background: #241E52; color: #FF8A00; font-weight: 800; font-size: .85rem; display: flex; align-items: center; justify-content: center; margin-top: 1px; }
        .entenda-rotulo { font-size: .78rem; font-weight: 700; color: #666E7B; margin: 0 0 8px; letter-spacing: .02em; text-transform: uppercase; }
        .entenda-barras { display: grid; gap: 12px; margin: 0 0 22px; }
        .entenda-linha { display: grid; grid-template-columns: 150px 1fr; gap: 12px; align-items: center; font-size: .88rem; color: #191C20; }
        .entenda-linha small { display: block; color: #666E7B; font-size: .76rem; }
        .entenda-trilho { background: #F4ECE1; border-radius: 999px; height: 26px; }
        .entenda-barra { height: 100%; border-radius: 999px; background: #241E52; color: #fff; font-weight: 800; font-size: .82rem; display: flex; align-items: center; justify-content: flex-end; padding-right: 12px; min-width: 60px; box-sizing: border-box; }
        .entenda-barra.am { background: #FF8A00; color: #171238; }
        .entenda-semana { display: grid; gap: 10px; }
        .entenda-dias { display: flex; gap: 6px; align-items: center; flex-wrap: wrap; }
        .entenda-dia { width: 30px; height: 30px; border-radius: 10px; background: #241E52; }
        .entenda-dia.d { background: #FF8A00; }
        .entenda-leg { font-size: .88rem; color: #191C20; margin-left: 8px; }
        .entenda-nota { margin: 10px 0 0; font-size: .78rem; color: #666E7B; }
        .entenda-fluxo { display: grid; gap: 12px; align-items: stretch; }
        .entenda-etapa { background: #FAF5EE; border-radius: 16px; padding: 16px 18px; }
        .entenda-etapa b { display: block; font-size: .98rem; margin-bottom: 4px; color: #191C20; }
        .entenda-etapa span { font-size: .88rem; line-height: 1.5; color: #666E7B; }
        .entenda-etapa-link { display: block; text-decoration: none; color: inherit; transition: box-shadow .15s; }
        .entenda-etapa-link:hover { box-shadow: 0 8px 24px rgba(74,52,30,.14); }
        .entenda-ver { display: block; margin-top: 8px; font-style: normal; font-size: .82rem; font-weight: 800; color: #A85B00; }
        .entenda-etapa.fim { background: #241E52; }
        .entenda-etapa.fim b { color: #fff; }
        .entenda-etapa.fim span { color: rgba(255,255,255,.82); }
        .entenda-seta { display: flex; align-items: center; color: #A85B00; font-size: 1.4rem; font-weight: 700; }
        .entenda-regra { margin: 14px 0 0; font-size: .88rem; color: #666E7B; line-height: 1.5; }
        .entenda-exc { margin: 0; padding-left: 20px; display: grid; gap: 8px; font-size: .98rem; line-height: 1.55; color: #191C20; }
        .entenda-fonte { margin: 14px 2px 0; font-size: .8rem; color: #666E7B; line-height: 1.5; }
        .entenda-fonte a { color: #A85B00; font-weight: 700; }
        @media (max-width: 760px) {
          .entenda-grade { grid-template-columns: 1fr; }
          .dest-grade { grid-template-columns: 1fr; }
          .dest-sec h2 { font-size: 1.4rem; }
          .entenda-fluxo { grid-template-columns: 1fr !important; }
          .entenda-seta { justify-content: center; transform: rotate(90deg); }
          .entenda-linha { grid-template-columns: 1fr; }
          .entenda-cartao { padding: 20px 18px; }
        }
        /* Faixa "Como o Lume nasceu" (pagina Sobre), 07/11/2026: sangra ate as bordas da tela e devolve o mesmo recuo por dentro, para o texto alinhar com o resto da pagina. */
        .nasceu-etiqueta, .nasceu-faixa { margin-left: -24px; margin-right: -24px; padding-left: 24px; padding-right: 24px; }
        .nasceu-etiqueta { display: flex; align-items: center; padding-top: 13px; padding-bottom: 13px; background: #FF8A00; color: #171238; font-family: 'Fraunces', Georgia, serif; font-size: 0.95rem; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; border-radius: 6px 6px 0 0; }
        .nasceu-faixa { position: relative; overflow: hidden; padding-top: 36px; padding-bottom: 40px; margin-bottom: 44px; background: #241E52; box-shadow: 0 8px 30px rgba(74,52,30,0.18); border-radius: 0 0 6px 6px; }
        .nasceu-marca { position: absolute; right: 30px; top: 8%; bottom: 8%; aspect-ratio: 82.99 / 100; pointer-events: none; background: linear-gradient(90deg, rgba(255,138,0,0.10) 0%, rgba(255,138,0,0.30) 55%, rgba(255,138,0,0.38) 100%); transform: perspective(700px) rotateY(-35deg); -webkit-mask: url(/simbolo-lume.svg) no-repeat center / contain; mask: url(/simbolo-lume.svg) no-repeat center / contain; }

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
        .titulo-pagina-movel { display: none; }
        @media (max-width: 1060px) {
          .nav-desktop { display: none; }
          .btn-hamburguer { display: inline-flex; align-items: center; }
          .menu-mobile { display: block; }
          /* Celular: nome da pagina na mesma linha, colado ao hamburguer. */
          .topo-linha { padding: 12px 16px !important; gap: 10px !important; }
          .titulo-pagina-movel { display: block; }
          .conta-nome { max-width: 130px !important; }
        }
        /* Telas estreitas (ate 420px): o nome da conta cede espaco para o nome da pagina. */
        @media (max-width: 420px) {
          .conta-nome { max-width: 100px !important; }
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

        /* Resumo "Suas respostas" do Quem vota como voce (27/09/2026): uma linha por pergunta, duas
           colunas a partir de 720px para caber na tela sem rolar. */
        .resumo-respostas { display: grid; grid-template-columns: 1fr; gap: 4px; }
        @media (min-width: 720px) { .resumo-respostas { grid-template-columns: 1fr 1fr; column-gap: 8px; } }

        /* CELULAR MAIS APROVEITADO (27/09/2026, pedido do Jordy: "diminuir o tamanho das fontes na
           tela mobile para usar melhor o espaco"). Ate 640px:
           1) a base do texto vai de 16px para 15px. Tudo que esta em rem (quase todo o site) diminui
              ~6%. Nao mais que isso: o publico inclui gente mais velha, e o menor texto do site
              (0,72rem) fica em ~11px. Campo de digitar continua em 16px (abaixo disso o iPhone
              da zoom ao tocar);
           2) menos margem nas laterais e titulos de pagina menores;
           3) pilulas irmas (paginas de Pra voce, casas, cargos) viram um campo de escolha
              (EscolhaCompacta): .so-celular / .so-computador trocam uma pela outra;
           4) botoes com .botao-compacto encolhem o respiro. */
        .so-celular, .so-celular-inline { display: none; }
        @media (max-width: 640px) {
          html { font-size: 15px; }
          .pagina { padding: 16px 14px; }
          .nasceu-etiqueta, .nasceu-faixa { margin-left: -14px; margin-right: -14px; padding-left: 14px; padding-right: 14px; }
          .nasceu-marca { display: none; }
          .secao-home { padding-left: 14px; padding-right: 14px; }
          .pagina h1 { font-size: 1.75rem !important; line-height: 1.15 !important; }
          .topo-linha { padding: 10px 14px !important; }
          .so-computador { display: none !important; }
          .so-computador-inline { display: none !important; }
          .so-celular { display: block; }
          .so-celular-inline { display: inline; }
          .botao-compacto { padding: 8px 14px !important; font-size: 0.86rem !important; }
        }

        /* IMPRESSAO (27/09/2026): a cola para a urna (/cola) se imprime para levar no papel. Sai o
           cabecalho, o rodape e os botoes; fica a lista com os numeros. */
        @media print {
          header, footer, .nao-imprimir { display: none !important; }
          body { background: #fff !important; }
        }

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

        /* Secao Como atualizamos os dados (components/AtualizacaoDados.jsx). Hex iguais aos de
           src/estilo/tokens.js: tinta #191C20, cinza #666E7B, papelQuente #FAF5EE.
           Computador: quatro colunas. Celular: cada linha vira um bloco, fonte em cima e os tres
           valores logo abaixo, cada um com seu rotulo. O alinhamento fica aqui, nao no style. */
        .atu-cab, .atu-linha { display: grid; grid-template-columns: 1.6fr 1fr 1fr 1fr; gap: 8px; align-items: center; }
        .atu-cab { font-size: 0.72rem; color: #666E7B; padding: 2px 0 6px; }
        .atu-linha { font-size: 0.9rem; color: #191C20; padding: 10px 12px; margin: 0 -12px; border-radius: 8px; }
        .atu-linha:nth-of-type(even) { background: #FAF5EE; }
        .atu-fonte { font-weight: 600; }
        .atu-rot { display: none; }
        @media (max-width: 640px) {
          .atu-cab { display: none; }
          .atu-linha { grid-template-columns: 1fr 1fr; row-gap: 6px; padding: 12px; }
          .atu-fonte { grid-column: 1 / -1; }
          .atu-freq { grid-column: 1 / -1; color: #666E7B; font-size: 0.82rem; }
          .atu-rot { display: block; font-size: 0.68rem; color: #666E7B; text-transform: uppercase; letter-spacing: 0.04em; }
          .atu-freq .atu-rot { display: inline; margin-right: 6px; }
        }

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

        /* O que a assembleia publica e o que nao publica (/deputados/[uf]). Sem container:
           texto corrido, na mesma margem do paragrafo de cima. A margem negativa aproxima os
           dois, porque sao a mesma ideia continuada. */
        .nota-casa { margin: -16px 0 24px; font-size: 0.88rem; line-height: 1.55; color: #666E7B; }
        .nota-casa strong { color: #191C20; font-weight: 700; }

        /* Nota do seletor de ano: uma linha, colada na barra de controles, porque e sobre o
           CONTROLE. Antes dividia uma grade de duas colunas com a ressalva de leitura da
           lista: coisas de donos diferentes, e uma acabava flutuando no canto direito. */
        .nota-ano { margin: -4px 0 16px; font-size: 0.82rem; line-height: 1.5; color: rgba(255,255,255,0.62); }
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
        /* Hover dos botoes capsulares (23/10/2026, pedido do Jordy). Regra unica para todo botao/link com cantos de pilula
           (border-radius 999px = t.raio.pill): sombra cresce e o botao sobe 1px, o mesmo padrao do Anterior/Proxima e do Favoritar.
           Os estilos sao inline, por isso o !important. Fora: desativados, fundo transparente (nao e capsula "cheia") e toque (sem hover). */
        :is(button, a, summary, [role="button"], label)[style*="border-radius:999px"], :is(button, a, summary, [role="button"], label)[style*="border-radius: 999px"] { transition: box-shadow .15s ease, transform .15s ease; }
        @media (hover: hover) {
          :is(button, a, summary, [role="button"], label):is([style*="border-radius:999px"], [style*="border-radius: 999px"]):not(:disabled):not([aria-disabled="true"]):not([style*="background:transparent"]):not([style*="background: transparent"]):not([style*="background:none"]):not([style*="background: none"]):hover { box-shadow: 0 4px 8px rgba(36,30,82,0.22), 0 16px 34px rgba(36,30,82,0.34) !important; transform: translateY(-1px); }
        }
        @media (prefers-reduced-motion: reduce) {
          :is(button, a, summary, [role="button"], label):is([style*="border-radius:999px"], [style*="border-radius: 999px"]):hover { transform: none !important; }
        }
        /* Hover dos cards clicaveis (23/10/2026, pedido do Jordy): mesmo padrao dos cards de /deputados e /eleicoes
           (sombra .hover e sobe 2px). .linha-clicavel e a versao leve para linhas e faixas (sobe 1px). Inline pede !important. */
        .card-clicavel, .linha-clicavel { transition: box-shadow .15s ease, transform .15s ease; }
        @media (hover: hover) {
          .card-clicavel:hover { box-shadow: 0 12px 30px rgba(74,52,30,0.16) !important; transform: translateY(-2px); }
          .linha-clicavel:hover { box-shadow: 0 12px 30px rgba(74,52,30,0.16) !important; transform: translateY(-1px); }
        }
        @media (prefers-reduced-motion: reduce) { .card-clicavel:hover, .linha-clicavel:hover { transform: none !important; } }
        /* Paginacao (components/Paginacao.jsx), 21/10/2026: uma linha so. Esquerda: "Mostrando X a Y de Z"; centro: botoes em texto dourado com seta e a pagina. */
        .paginacao-linha { display: grid; grid-template-columns: 1fr auto 1fr; align-items: center; column-gap: 16px; }
        .paginacao-detalhe { margin: 0; font-size: 0.8rem; text-align: left; }
        .paginacao { display: flex; align-items: center; justify-content: center; gap: 18px; flex-wrap: nowrap; }
        .paginacao-botao { display: inline-flex; align-items: center; gap: 6px; padding: 10px 6px; border: none; background: transparent; box-shadow: none; font-family: inherit; font-size: 0.92rem; font-weight: 700; color: #A85B00; cursor: pointer; white-space: nowrap; }
        .paginacao-botao:hover:not(:disabled) { text-decoration: underline; text-underline-offset: 3px; text-decoration-thickness: 2px; }
        .paginacao-botao:focus-visible { outline: none; box-shadow: 0 0 0 2.5px #FF8A00; border-radius: 8px; }
        .paginacao-botao:disabled { opacity: 0.35; cursor: default; }
        .paginacao-info { font-size: 0.85rem; font-weight: 600; text-align: center; white-space: nowrap; }
        @media (max-width: 720px) {
          .paginacao-linha { grid-template-columns: 1fr; row-gap: 6px; }
          .paginacao-linha > span { display: none; }
          .paginacao-detalhe { order: 2; text-align: center; }
        }
        @media (max-width: 520px) {
          .paginacao { gap: 8px; justify-content: space-between; }
          .paginacao-info { line-height: 1.25; }
          .pg-rotulo { display: block; font-size: 0.72rem; font-weight: 600; }
        }
        @media (pointer: coarse) { .paginacao-botao { min-height: 40px; } }
        /* Acao em texto dentro de cartao (ex.: resumo da tramitacao em /cpis): hover engrossa o sublinhado; alvo 40px no toque. */
        .acao-texto:hover { text-decoration-thickness: 2px; }
        /* Pagina do pedido de CPI: celular em uma coluna (ementa, fatos, tramitacao). A partir de
           1000px os 3 fatos formam uma coluna fixa a direita, para o texto manter linha legivel. */
        .pedido-grade { display: grid; grid-template-columns: minmax(0, 1fr); }
        .pedido-fatos { display: grid; gap: 10px; grid-template-columns: repeat(auto-fit, minmax(210px, 1fr)); margin: 0 0 24px; }
        @media (min-width: 1000px) {
          .pedido-grade { grid-template-columns: minmax(0, 1fr) 320px; grid-template-areas: "ementa fatos" "tramitacao fatos"; column-gap: 32px; max-width: 1180px; }
          .pedido-ementa { grid-area: ementa; }
          .pedido-tramitacao { grid-area: tramitacao; }
          .pedido-fatos { grid-area: fatos; grid-template-columns: minmax(0, 1fr); align-content: start; align-self: start; position: sticky; top: 88px; margin: 0; }
        }
        @media (pointer: coarse) { .acao-texto { min-height: 40px; } }
        .etapa-linha { display: flex; align-items: center; gap: 10px; min-width: 0; }

        /* Linha de voto do parlamentar (aba "Como votou"). No desktop e uma linha so: voto,
           papel da votacao, resultado, data e "ver". No celular essa soma nao cabe (~290px
           uteis) e os textos se sobrepunham. Ali vira uma grade: o voto na esquerda, o papel
           em cima e o resultado com a data embaixo, e "ver" na ponta direita. */
        .voto-linha { display: flex; align-items: center; gap: 10px; }
        .voto-meta { display: contents; }
        @media (max-width: 520px) {
          .voto-linha {
            display: grid; grid-template-columns: auto minmax(0, 1fr) auto;
            grid-template-areas: "tipo papel ver" "tipo meta ver";
            column-gap: 10px; row-gap: 2px; align-items: center;
          }
          .voto-tipo { grid-area: tipo; }
          .voto-papel { grid-area: papel; line-height: 1.3; }
          .voto-meta { grid-area: meta; display: flex; flex-wrap: wrap; gap: 0 10px; align-items: baseline; }
          .voto-ver { grid-area: ver; }
        }

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
          .etapa-linha { flex-wrap: wrap; gap: 6px 10px; }
          .etapa-linha .etapa-papel { min-width: 0; }
          /* 07/11/2026: o resultado tinha flex:1 e min-width:0, entao no celular ele encolhia a ~20px e o texto "Aprovado" passava por cima da data. Agora ele ocupa o que o texto precisa e a linha quebra em duas quando nao cabe tudo. */
          .etapa-linha .etapa-res { flex: 1 1 auto !important; min-width: max-content; }
        }

        @keyframes surgir {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .surgir { animation: surgir .5s cubic-bezier(.2,.7,.2,1) both; }

        /* Indicador de navegacao (20/10/2026, components/IndicadorNavegacao.jsx). Barra de 4px que
           avanca depressa no comeco e desacelera ate ~92% (nao chega a 100% sozinha); ao abrir a
           pagina fecha em 100% e some. Aviso abaixo do cabecalho: nao clica, entao retangulo. */
        .barra-nav { position: fixed; top: 0; left: 0; height: 4px; z-index: 9999; background: #FF8A00; box-shadow: 0 0 8px rgba(255,138,0,.7); pointer-events: none; }
        .barra-nav.andando { width: 92%; animation: avanco 14s cubic-bezier(.1,.7,.2,1) both; }
        .barra-nav.concluindo { width: 100%; animation: fechar .25s ease-out forwards; }
        @keyframes avanco { from { width: 0; } to { width: 92%; } }
        @keyframes fechar { 0% { width: var(--w, 90%); opacity: 1; } 60% { width: 100%; opacity: 1; } 100% { width: 100%; opacity: 0; } }
        .aviso-nav { position: fixed; left: 0; right: 0; margin: 0 auto; width: max-content; z-index: 9998; display: flex; align-items: center; gap: 12px; max-width: min(92vw, 420px); padding: 11px 16px; border-radius: 10px; background: #241E52; color: #fff; font-size: 0.9rem; line-height: 1.35; box-shadow: 0 8px 24px rgba(36,30,82,.28); animation: surgir .2s ease-out both; }
        .aviso-nav small { display: block; margin-top: 2px; font-size: 0.78rem; color: rgba(255,255,255,.75); }
        @media (max-width: 640px) { .aviso-nav { left: 14px; right: 14px; width: auto; max-width: none; } }
        .giro { display: inline-block; flex-shrink: 0; border-radius: 50%; border: 2.5px solid rgba(255,138,0,.3); border-top-color: #FF8A00; animation: giro .8s linear infinite; }
        @keyframes giro { to { transform: rotate(360deg); } }
        @media (prefers-reduced-motion: reduce) { .giro { animation: none !important; border-top-color: #FF8A00; } .barra-nav.andando { animation: none !important; width: 60%; } }
      `}</style>
    </Layout>
  );
}
