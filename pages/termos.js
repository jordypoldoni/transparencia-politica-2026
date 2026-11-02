import Head from 'next/head';
import Link from 'next/link';
import { t } from '../src/estilo/tokens';
import { CONTATO } from '../src/lib/contato';

// TERMOS DE USO (02/11/2026). Pedido do Jordy: regras de uso do site, complementares à /privacidade
// (que trata dos dados pessoais). Texto aprovado por ele em 02/11/2026 e ajustado após análise jurídica
// preliminar (CDC art. 51, I; Marco Civil art. 8º, parágrafo único; STJ REsp 1.316.921/RJ; STF Tema 987).
// Não é parecer de advogado: vale uma revisão jurídica profissional.
//
// Regra da página: descrever o que o site faz, sem promessa que o site não cumpre. Mudou o que o site
// faz (conta nova, conteúdo de usuário, publicidade, cobrança), muda esta página e a data de ATUALIZADA.
const ATUALIZADA = '2 de novembro de 2026';

const h2 = { fontFamily: t.fonte.titulo, fontWeight: 600, fontSize: '1.4rem', margin: '36px 0 12px' };
const p = { color: t.cor.cinza, lineHeight: 1.65, margin: '0 0 12px' };
const forte = { color: t.cor.tinta };
const link = { color: t.cor.ouroTexto, fontWeight: 700 };

export default function Termos() {
  return (
    <div className="pagina">
      <Head>
        <title>Termos de uso | Lume Cidadão</title>
        <link rel="canonical" href="https://www.lumecidadao.com.br/termos" />
        <meta name="description" content="As regras para usar o Lume Cidadão: o que o site é, de onde vêm os dados, os limites, a conta, o uso adequado e quem responde pelo site." />
      </Head>
      <div className="leitura">
        <span style={{ fontSize: '0.8rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: t.cor.ouroTexto }}>Termos de uso</span>
        <h1 style={{ fontFamily: t.fonte.titulo, fontWeight: 600, fontSize: 'clamp(2rem,5vw,2.8rem)', lineHeight: 1.1, margin: '12px 0 16px' }}>
          Regras para usar o Lume
        </h1>
        <p style={{ ...p, fontSize: '1.1rem' }}>
          Resposta curta: <strong style={forte}>use o Lume para se informar.</strong> Os dados são públicos e oficiais, mas podem ter atraso ou erro:
          por segurança, consulte também a fonte oficial. Ao usar o site, você concorda com estes termos. Se não concordar, não use.
        </p>
        <p style={{ ...p, fontSize: '0.88rem' }}>Atualizados em {ATUALIZADA}.</p>

        <h2 style={h2}>1. O que é o Lume</h2>
        <p style={p}>
          O Lume Cidadão é um hub de transparência política. Mostra gastos, votos e candidaturas a partir de fontes oficiais, em linguagem clara.
          Mostramos fato e fonte, sem julgamento. <strong style={forte}>Nada neste site é recomendação de voto nem apoio a candidato ou partido</strong>,
          inclusive nos recursos de comparação.
        </p>

        <h2 style={h2}>2. De onde vêm os dados e quais são os limites</h2>
        <p style={p}>
          Os dados vêm de órgãos oficiais, como o TSE, a Câmara dos Deputados, o Senado, as Assembleias Legislativas e o Tesouro Nacional, e são coletados
          e calculados por nós. Podem ter atraso, lacuna ou erro, tanto da fonte quanto da nossa coleta e do nosso cálculo. Cada página indica a fonte e,
          quando possível, a data da última coleta. <strong style={forte}>Por segurança, a fonte oficial deve também ser consultada</strong>.
          Para avisar de um erro, use a página de{' '}
          <Link href="/correcoes" style={link}>Correções</Link>.
        </p>

        <h2 style={h2}>3. Disponibilidade e limites</h2>
        <p style={p}>
          Não garantimos que o site esteja sempre no ar, nem que os dados estejam completos ou atualizados no momento em que você os lê.
          O Lume é uma ferramenta de informação e não substitui a consulta às fontes oficiais, a um profissional habilitado ou o seu próprio critério.
          Estes termos não limitam direitos que a lei garante a você.
        </p>

        <h2 style={h2}>4. Sua conta</h2>
        <p style={p}>
          Entrar com uma conta Google é opcional. Você responde pelo uso da sua conta e pelo que informa nela. Pode apagar a conta a qualquer momento
          na página <Link href="/perfil" style={link}>Seu perfil</Link>. O que guardamos, onde e por quanto tempo está na página de{' '}
          <Link href="/privacidade" style={link}>Privacidade</Link>.
        </p>

        <h2 style={h2}>5. Uso adequado</h2>
        <p style={p}>
          Não use o site para sobrecarregá-lo, burlar suas proteções, acessar o que não é público ou fazer parecer que o Lume apoia ou combate
          alguém. Podemos limitar ou bloquear o acesso de quem fizer isso.
        </p>

        <h2 style={h2}>6. Conteúdo, dados e marca</h2>
        <p style={p}>
          Os dados mostrados são públicos e de origem oficial. Os textos e o desenho do site são de titularidade da PELEGRA, e Lume Cidadão é a marca
          usada pela PELEGRA. Você pode citar o Lume com link para a página e para a fonte oficial, sem sugerir vínculo com o Lume nem aprovação dele.
        </p>

        <h2 style={h2}>7. Mudanças nestes termos</h2>
        <p style={p}>
          Se o site mudar de forma que afete estas regras, por exemplo com conteúdo enviado por usuários, publicidade ou serviço pago, esta página
          muda antes, com nova data no topo.
        </p>

        <h2 style={h2}>8. Quem responde e como falar conosco</h2>
        <p style={p}>
          O Lume Cidadão é mantido por <strong style={forte}>PELEGRA</strong>, nome profissional de pessoa física. Contato direto:{' '}
          <a href={`mailto:${CONTATO}`} style={link}>{CONTATO}</a>.
        </p>
        <p style={p}>
          Valem as leis do Brasil. Disputas são resolvidas na Justiça brasileira, no foro do domicílio do usuário. Se uma parte destes termos for
          considerada inválida, as demais continuam valendo.
        </p>
      </div>
    </div>
  );
}
