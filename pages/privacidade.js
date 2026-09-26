import Head from 'next/head';
import Link from 'next/link';
import { t } from '../src/estilo/tokens';

// POLÍTICA DE PRIVACIDADE (26/09/2026). Nasceu porque o Google só publica o "Entrar com Google"
// com um endereço de política de privacidade, mas o motivo de verdade é outro: a página "Pra você"
// passa a lidar com opinião política, que a LGPD trata como dado pessoal SENSÍVEL (art. 5º, II).
// Quem usa precisa saber, antes, o que fica guardado, onde, e como apagar.
//
// Regra da página: descrever o que o CÓDIGO faz, sem promessa que o código não cumpre. Mudou o
// código (novo dado guardado, novo serviço externo), muda esta página e a data de ATUALIZADA.
const ATUALIZADA = '26 de setembro de 2026';
const CONTATO = 'jordyoldoni07@gmail.com'; // e-mail público para pedidos sobre dados pessoais (escolhido pelo Jordy em 26/09)

const h2 = { fontFamily: t.fonte.titulo, fontWeight: 600, fontSize: '1.4rem', margin: '36px 0 12px' };
const p = { color: t.cor.cinza, lineHeight: 1.65, margin: '0 0 12px' };
const li = { color: t.cor.cinza, lineHeight: 1.65, marginBottom: '6px' };
const forte = { color: t.cor.tinta };

export default function Privacidade() {
  return (
    <div className="pagina">
      <Head>
        <title>Privacidade | Lume Cidadão</title>
        <meta name="description" content="O que o Lume Cidadão guarda sobre você, onde, por quanto tempo e como apagar. Sem cadastro, o site não guarda dado pessoal." />
      </Head>
      <div className="leitura">
        <span style={{ fontSize: '0.8rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: t.cor.ouroTexto }}>Privacidade</span>
        <h1 style={{ fontFamily: t.fonte.titulo, fontWeight: 600, fontSize: 'clamp(2rem,5vw,2.8rem)', lineHeight: 1.1, margin: '12px 0 16px' }}>
          O que guardamos sobre você
        </h1>
        <p style={{ ...p, fontSize: '1.1rem' }}>
          Resposta curta: <strong style={forte}>sem entrar com uma conta, nada que identifique você fica guardado pelo Lume.</strong>{' '}
          Se você entrar, guardamos só o necessário para o seu perfil funcionar, e você pode apagar tudo quando quiser.
        </p>
        <p style={{ ...p, fontSize: '0.88rem' }}>Atualizada em {ATUALIZADA}.</p>

        <h2 style={h2}>Navegando sem conta</h2>
        <ul style={{ paddingLeft: '20px', margin: '0 0 12px' }}>
          <li style={li}><strong style={forte}>No seu próprio navegador</strong> ficam o estado e os temas que você escolheu, as respostas do questionário da página "Pra você" e o último filtro das listas. Isso não sai do seu aparelho e some se você limpar os dados do navegador.</li>
          <li style={li}><strong style={forte}>Estado aproximado pela conexão:</strong> na lista de candidatos a deputado estadual, o site usa a região aproximada que a hospedagem informa a partir do seu endereço de internet para abrir já no seu estado. Essa informação é usada naquele momento e não é guardada.</li>
          <li style={li}><strong style={forte}>Registros técnicos da hospedagem</strong> (Vercel), como em qualquer site: endereço de internet e página acessada, mantidos pela própria hospedagem por prazo curto, para segurança e funcionamento.</li>
        </ul>

        <h2 style={h2}>Se você entrar com uma conta</h2>
        <p style={p}>Você pode entrar com Google ou com um link enviado ao seu e-mail. A conta serve só para levar o seu perfil para outros aparelhos. Guardamos:</p>
        <ul style={{ paddingLeft: '20px', margin: '0 0 12px' }}>
          <li style={li}><strong style={forte}>Da conta:</strong> seu e-mail e, se entrar com Google, o nome e a foto que o Google envia.</li>
          <li style={li}><strong style={forte}>Do perfil:</strong> o seu estado, a data em que você deu o consentimento abaixo, e a sua posição (a favor, contra ou sem opinião) em cada pergunta do questionário, com a indicação de como ela foi dada: marcada por você, ou sugerida pela leitura automática e confirmada ou corrigida por você.</li>
        </ul>
        <p style={p}>
          A sua posição sobre temas políticos é <strong style={forte}>dado pessoal sensível</strong> pela Lei Geral de Proteção de Dados.
          Por isso ela só é guardada no perfil depois que você marca, na própria página, que concorda com isso (LGPD, art. 11, I).
          Sem esse consentimento, o sistema recusa gravar.
        </p>

        <h2 style={h2}>O texto que você escreve para a leitura automática</h2>
        <p style={p}>
          Na página "Pra você" você pode escrever, com as suas palavras, no que acredita. Esse texto é enviado a um serviço de
          inteligência artificial, a <strong style={forte}>Groq, Inc.</strong>, empresa dos Estados Unidos, apenas para sugerir as
          suas respostas às perguntas. <strong style={forte}>O Lume não guarda esse texto</strong>: guardamos só as respostas que você
          confirmar. Não escreva nesse campo nomes, documentos ou qualquer coisa que identifique você ou outra pessoa.
        </p>

        <h2 style={h2}>Onde os dados ficam</h2>
        <p style={p}>
          O perfil fica num banco de dados separado de todo o resto do site, no Supabase, com servidores em São Paulo. Cada pessoa só
          consegue ler e alterar o próprio perfil: a regra está no próprio banco, não só na tela. O site é hospedado na Vercel.
        </p>

        <h2 style={h2}>O que nunca fazemos</h2>
        <ul style={{ paddingLeft: '20px', margin: '0 0 12px' }}>
          <li style={li}>Vender ou ceder dados, para ninguém.</li>
          <li style={li}>Usar o seu perfil para publicidade.</li>
          <li style={li}>Mostrar a sua posição a partidos, candidatos ou a qualquer outra pessoa.</li>
        </ul>

        <h2 style={h2}>Seus direitos</h2>
        <p style={p}>
          Você pode ver, corrigir e apagar os seus dados, e retirar o consentimento quando quiser (LGPD, art. 18). Na página{' '}
          <Link href="/comecar" style={{ color: t.cor.ouroTexto, fontWeight: 700 }}>Pra você</Link>, a opção "Apagar meus dados"
          remove o perfil e as respostas de uma vez. Para apagar também a conta, ou para qualquer outro pedido, escreva para{' '}
          <a href={`mailto:${CONTATO}`} style={{ color: t.cor.ouroTexto, fontWeight: 700 }}>{CONTATO}</a>.
        </p>

        <h2 style={h2}>Mudanças nesta política</h2>
        <p style={p}>
          Se o site passar a guardar algum dado novo ou a usar outro serviço externo, esta página muda antes, com nova data no topo.
          Mudança que afete o que você já consentiu pede o seu consentimento de novo.
        </p>
      </div>
    </div>
  );
}
