import Head from 'next/head';
import Link from 'next/link';
import { t } from '../src/estilo/tokens';
import { grafo, organizacao, site, migalhas, pagina, jsonSeguro } from '../src/lib/dadosEstruturados';

const principios = [
  { tit: 'Linguagem simples e clara', txt: 'Traduzimos o "politiquês" e o "juridiquês" para o português do dia a dia. Se a sua avó não entende, a gente reescreve.' },
  { tit: 'Sem lado', txt: 'Não torcemos por partido nenhum. Mostramos o fato (quem votou o quê, quem gastou quanto) e deixamos você decidir.' },
  { tit: 'Tudo com fonte', txt: 'Cada número tem o link do documento oficial. Você não precisa confiar na gente: pode conferir na fonte.' },
  { tit: 'Dados públicos', txt: 'Usamos apenas dados abertos e oficiais do governo. Nada de bastidor, nada de boato.' },
];

export default function Sobre() {
  return (
    <div className="pagina">
      <Head>
        <title>Sobre o Lume Cidadão: o que é e de onde vêm os dados | Lume</title>
        <meta name="description" content="O Lume reúne dados oficiais sobre deputados, senadores e candidatos em linguagem simples, sem lado e com link para a fonte de cada número." />
        <link rel="canonical" href="https://www.lumecidadao.com.br/sobre" />
        <script key="ld-sobre" type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonSeguro(grafo(
          organizacao(),
          site(),
          pagina({ nome: 'Sobre o Lume Cidadão: o que é e de onde vêm os dados', descricao: 'O Lume reúne dados oficiais sobre deputados, senadores e candidatos em linguagem simples, sem lado e com link para a fonte de cada número.', caminho: '/sobre', tipo: 'AboutPage' }),
          migalhas([{ nome: 'Início', caminho: '/' }, { nome: 'Sobre', caminho: '/sobre' }]),
        )) }} />
      </Head>
      <div className="leitura">
      <div style={{ textAlign: 'center' }}>
      <span style={{ fontSize: '0.8rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: t.cor.verde }}>Sobre o projeto</span>
      <h1 style={{ fontFamily: t.fonte.titulo, fontWeight: 600, fontSize: 'clamp(2rem,5vw,3rem)', lineHeight: 1.1, margin: '12px 0 20px' }}>
        Política não precisa ser confusa.
      </h1>
      <p style={{ fontSize: '1.15rem', color: t.cor.cinza, lineHeight: 1.6, margin: '0 0 40px' }}>
        O Lume existe para responder, de forma simples, uma pergunta que todo cidadão tem direito de fazer:
        <strong style={{ color: t.cor.tinta }}> o político que eu elegi está me representando?</strong> Reunimos dados oficiais
        espalhados e confusos, e entregamos mastigado, para você acompanhar e cobrar com base em fato, não em achismo.
      </p>
      </div>

      <h2 style={{ fontFamily: t.fonte.titulo, fontWeight: 600, fontSize: '1.5rem', margin: '0 0 16px' }}>Nossos princípios</h2>
      <div style={{ display: 'grid', gap: '12px', marginBottom: '44px' }}>
        {principios.map((p) => (
          <div key={p.tit} style={{ background: t.cor.papelCartao, borderRadius: t.raio.md, padding: '20px 22px', boxShadow: t.sombra.sutil }}>
            <h3 style={{ margin: '0 0 6px', fontSize: '1.05rem' }}>{p.tit}</h3>
            <p style={{ margin: 0, color: t.cor.cinza, lineHeight: 1.55 }}>{p.txt}</p>
          </div>
        ))}
      </div>

      <h2 style={{ fontFamily: t.fonte.titulo, fontWeight: 600, fontSize: '1.5rem', margin: '0 0 16px' }}>O que o Lume é, e o que não é</h2>
      <p style={{ color: t.cor.cinza, lineHeight: 1.6, margin: '0 0 12px' }}>
        O Lume é um site que reúne <strong style={{ color: t.cor.tinta }}>dados oficiais abertos</strong> sobre deputados, senadores, candidatos
        das eleições de 2026 e contas públicas, e mostra cada número com o link para o documento de origem. Ele reúne, em cada
        perfil, os gastos da verba de mandato, a presença nas votações, os votos e a candidatura.
      </p>
      <p style={{ color: t.cor.cinza, lineHeight: 1.6, margin: '0 0 28px' }}>
        <strong style={{ color: t.cor.tinta }}>Não damos nota nem dizemos quem é bom ou ruim.</strong> As ordenações do site (por exemplo, quem mais gastou
        da cota) usam um número oficial e mostram a conta. A conclusão é sua.
      </p>

      <h2 style={{ fontFamily: t.fonte.titulo, fontWeight: 600, fontSize: '1.5rem', margin: '0 0 16px' }}>De onde vêm os dados</h2>
      <p style={{ color: t.cor.cinza, lineHeight: 1.6, margin: '0 0 12px' }}>
        Coletamos de fontes oficiais, de forma automática. A fonte de cada dado aparece na própria página:
      </p>
      <ul style={{ color: t.cor.cinza, lineHeight: 1.8, margin: '0 0 24px', paddingLeft: '20px' }}>
        <li><strong style={{ color: t.cor.tinta }}>Câmara dos Deputados</strong> (<a href="https://dadosabertos.camara.leg.br" target="_blank" rel="noopener noreferrer" style={{ color: t.cor.verde }}>Dados Abertos</a>): deputados federais, votações nominais, presença e gastos da cota parlamentar.</li>
        <li><strong style={{ color: t.cor.tinta }}>Senado Federal</strong> (<a href="https://www12.senado.leg.br/dados-abertos" target="_blank" rel="noopener noreferrer" style={{ color: t.cor.verde }}>Dados Abertos</a>): senadores, votações, gastos da cota (CEAPS) e CPIs.</li>
        <li><strong style={{ color: t.cor.tinta }}>Tribunal Superior Eleitoral</strong> (<a href="https://divulgacandcontas.tse.jus.br" target="_blank" rel="noopener noreferrer" style={{ color: t.cor.verde }}>candidaturas</a> e <a href="https://resultados.tse.jus.br" target="_blank" rel="noopener noreferrer" style={{ color: t.cor.verde }}>resultados</a>): candidatos de 2026 e apuração.</li>
        <li><strong style={{ color: t.cor.tinta }}>Assembleias Legislativas</strong> de São Paulo, Rio Grande do Sul e Minas Gerais: deputados estaduais, gastos e, onde a casa divulga, votos.</li>
        <li><strong style={{ color: t.cor.tinta }}>Tesouro Nacional</strong> (<a href="https://apidatalake.tesouro.gov.br/docs/siconfi/" target="_blank" rel="noopener noreferrer" style={{ color: t.cor.verde }}>SICONFI</a>): arrecadação e gastos da União, dos estados, do DF e dos municípios.</li>
        <li><strong style={{ color: t.cor.tinta }}>Portal da Transparência</strong> (<a href="https://portaldatransparencia.gov.br" target="_blank" rel="noopener noreferrer" style={{ color: t.cor.verde }}>governo federal</a>): gastos do Executivo.</li>
      </ul>
      <p style={{ color: t.cor.cinza, lineHeight: 1.6, margin: '0 0 28px' }}>
        Quando a fonte não informa algo, escrevemos que a fonte não informa. Nunca preenchemos o vazio com suposição.
      </p>

      <h2 style={{ fontFamily: t.fonte.titulo, fontWeight: 600, fontSize: '1.5rem', margin: '0 0 16px' }}>Como lemos os números</h2>
      <ul style={{ color: t.cor.cinza, lineHeight: 1.8, margin: '0 0 28px', paddingLeft: '20px' }}>
        <li><strong style={{ color: t.cor.tinta }}>Presença nas votações:</strong> em quantas das votações nominais do período que coletamos o parlamentar registrou voto. Ausências justificadas (licença, missão) também contam como não registrado.</li>
        <li><strong style={{ color: t.cor.tinta }}>Coerência com o partido:</strong> em quantas votações nominais (só contam os votos Sim e Não) o parlamentar votou como a maioria dos parlamentares do próprio partido.</li>
        <li><strong style={{ color: t.cor.tinta }}>Gastos:</strong> valor líquido das despesas que cada casa publica, no ano indicado em cada perfil.</li>
      </ul>

      <h2 style={{ fontFamily: t.fonte.titulo, fontWeight: 600, fontSize: '1.5rem', margin: '0 0 16px' }}>Textos escritos por inteligência artificial</h2>
      <p style={{ color: t.cor.cinza, lineHeight: 1.6, margin: '0 0 28px' }}>
        Alguns resumos de votações, em português comum, são escritos por inteligência artificial. Eles vêm identificados como tal
        na página, e a ementa oficial aparece ao lado, para você comparar com o texto original.
      </p>

      <h2 style={{ fontFamily: t.fonte.titulo, fontWeight: 600, fontSize: '1.5rem', margin: '0 0 16px' }}>Achou um erro?</h2>
      <p style={{ color: t.cor.cinza, lineHeight: 1.6, margin: '0 0 28px' }}>
        Avise pelo link &ldquo;Encontrou um erro? Avise&rdquo;, que está em cada perfil, votação e página de estado. Erro confirmado é corrigido e fica
        registrado, com data e fonte, em <Link href="/correcoes" style={{ color: t.cor.verde, fontWeight: 700 }}>Correções</Link>.
      </p>

      <h2 style={{ fontFamily: t.fonte.titulo, fontWeight: 600, fontSize: '1.5rem', margin: '0 0 16px' }}>Conta e privacidade</h2>
      <p style={{ color: t.cor.cinza, lineHeight: 1.6, margin: '0 0 28px' }}>
        Entrar com uma conta Google é opcional e serve para levar seus favoritos e preferências a outros aparelhos. Sem conta, nada que
        identifique você fica guardado pelo Lume. Detalhes em <Link href="/privacidade" style={{ color: t.cor.verde, fontWeight: 700 }}>Privacidade</Link>.
      </p>

      <h2 style={{ fontFamily: t.fonte.titulo, fontWeight: 600, fontSize: '1.5rem', margin: '40px 0 16px' }}>O que é a cota parlamentar?</h2>
      <p style={{ color: t.cor.cinza, lineHeight: 1.6, margin: '0 0 12px' }}>
        Todo deputado e senador recebe uma <strong style={{ color: t.cor.tinta }}>verba mensal, paga com o seu imposto</strong>, para tocar o mandato: passagens, aluguel de escritório no estado, combustível, divulgação e consultorias. Tem um teto definido por lei.
      </p>
      <ul style={{ color: t.cor.cinza, lineHeight: 1.8, margin: '0 0 12px', paddingLeft: '20px' }}>
        <li><strong style={{ color: t.cor.tinta }}>O teto muda por estado.</strong> Quem é de um estado mais distante de Brasília recebe mais (gasta mais com passagens). Na Câmara, vai de cerca de R$ 30 mil a R$ 45 mil por mês.</li>
        <li><strong style={{ color: t.cor.tinta }}>Câmara e Senado são diferentes.</strong> A cota do Senado (chamada CEAPS) tem regras e valores próprios.</li>
      </ul>
      <p style={{ color: t.cor.cinza, lineHeight: 1.6, margin: '0 0 28px' }}>
        Por isso, no nosso ranking, <strong style={{ color: t.cor.tinta }}>comparamos cada parlamentar dentro da própria casa</strong>: comparar um deputado com um senador seria injusto, porque os tetos não são iguais.
      </p>

      <div style={{ background: t.cor.alertaBg, borderRadius: t.raio.md, padding: '20px 22px', boxShadow: t.sombra.sutil }}>
        <p style={{ margin: 0, color: t.cor.verdeEscuro, fontSize: '0.95rem', lineHeight: 1.55 }}>
          <strong>Em construção.</strong> Estamos expandindo a cobertura (gastos completos, Senado e Judiciário) e o
          acompanhamento de promessas de campanha. Encontrou algo errado? Esse retorno nos ajuda a melhorar.
        </p>
      </div>
      </div>
    </div>
  );
}
