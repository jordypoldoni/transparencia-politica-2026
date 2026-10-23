import { useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { t } from '../../src/estilo/tokens';
import { Seta } from '../../components/icones';
import PlanoDoisEixos from '../../components/PlanoDoisEixos';

// Tema "Esquerda e direita" (23/10/2026). Estrutura em 3 camadas aprovada pelo Jordy.
// Cada número vem com instituto, data de campo, amostra e margem, conferidos nas fontes
// (tabela em lume-cidadao-docs / projeto: entenda_fontes_esquerda_direita). Medidas
// diferentes (autoclassificação x perfil calculado) NUNCA são somadas nem comparadas como
// iguais. Princípio do Lume: só fato + fonte; sem juízo. Regra do Jordy: sem travessão.
const ULTIMA_CONFERENCIA = '23 de outubro de 2026';

const cartao = { background: t.cor.papelCartao, borderRadius: t.raio.md, padding: '20px 22px', boxShadow: t.sombra.sutil, marginBottom: '16px' };
const h2 = { fontFamily: t.fonte.titulo, fontWeight: 600, fontSize: '1.5rem', margin: '0 0 6px', scrollMarginTop: '90px' };
const sub = { color: t.cor.cinza, margin: '0 0 14px', fontSize: '0.95rem', lineHeight: 1.55 };
const p = { margin: '0 0 10px', fontSize: '0.97rem', lineHeight: 1.6 };
const fonteLink = { color: t.cor.verde, fontWeight: 700, fontSize: '0.85rem', textDecoration: 'underline', textUnderlineOffset: '3px' };
const botao = { display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '8px 16px', fontSize: '0.85rem', fontWeight: 700, fontFamily: t.fonte.corpo, borderRadius: t.raio.pill, textDecoration: 'none', background: '#fff', color: t.cor.tinta, boxShadow: t.sombra.botao };
const selo = { display: 'inline-block', fontSize: '0.72rem', fontWeight: 700, color: t.cor.alertaTexto, background: t.cor.alertaBg, borderRadius: t.raio.pill, padding: '2px 10px', marginBottom: '8px' };

const Fonte = ({ href, children }) => <a href={href} target="_blank" rel="noopener noreferrer" style={fonteLink}>{children} ↗</a>;

// Mesmo padrão de abrir/fechar do site (DocumentosERedes): botão com aria-expanded, "Ver" ou
// "Recolher" em âmbar escuro e a Seta dourada oficial. Nada de triângulo nativo do navegador.
function Camada({ titulo, children, aberta: inicial = false }) {
  const [aberta, setAberta] = useState(inicial);
  return (
    <div style={{ background: t.cor.papelQuente, borderRadius: t.raio.sm, padding: '14px 16px', marginBottom: '10px' }}>
      <button
        type="button"
        onClick={() => setAberta((v) => !v)}
        aria-expanded={aberta}
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', width: '100%', background: 'none', border: 'none', padding: 0, margin: 0, textAlign: 'left', cursor: 'pointer', color: 'inherit', font: 'inherit' }}
      >
        <span style={{ minWidth: 0, fontWeight: 700, fontSize: '0.98rem' }}>{titulo}</span>
        <span style={{ flexShrink: 0, display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', fontWeight: 700, color: t.cor.ouroTexto }}>
          {aberta ? 'Recolher' : 'Ver'}
          <Seta aberta={aberta} size={14} />
        </span>
      </button>
      {aberta && <div style={{ marginTop: '12px' }}>{children}</div>}
    </div>
  );
}

const FAIXAS = [
  { nome: 'Direita', v: 15, cor: '#7A1F1F' },
  { nome: 'Centro-direita', v: 29, cor: '#B4553A' },
  { nome: 'Centro', v: 17, cor: '#6E6B66' },
  { nome: 'Centro-esquerda', v: 26, cor: '#4F6FA5' },
  { nome: 'Esquerda', v: 13, cor: '#2C4A82' },
];

const Ficha = ({ children }) => (
  <p style={{ margin: '10px 0 0', fontSize: '0.8rem', lineHeight: 1.5, color: t.cor.cinza }}><strong style={{ color: t.cor.tinta }}>Ficha:</strong> {children}</p>
);

export default function EsquerdaEDireita() {
  return (
    <>
      <Head>
        <title>Esquerda e direita: o que significam e o que os dados mostram | Lume</title>
        <meta name="description" content="De onde vêm os termos esquerda e direita, como as pesquisas medem a posição dos brasileiros e por que o resultado muda conforme a pergunta. Com fonte e ficha técnica de cada número." />
        <link rel="canonical" href="https://www.lumecidadao.com.br/entenda/esquerda-e-direita" />
      </Head>

      <div className="pagina">
        <nav aria-label="Você está em" style={{ fontSize: '0.85rem', marginBottom: '12px' }}>
          <Link href="/entenda" style={{ color: t.cor.ouroTexto, fontWeight: 700, textDecoration: 'none' }}>Entenda</Link>
          <span style={{ color: t.cor.cinza }}> / Esquerda e direita</span>
        </nav>
        <span style={selo}>Escolher meus representantes</span>
        <h1 style={{ fontFamily: t.fonte.titulo, fontWeight: 600, fontSize: 'clamp(1.8rem,4.5vw,2.6rem)', lineHeight: 1.15, margin: '0 0 12px' }}>Esquerda e direita</h1>

        <div style={{ ...cartao, background: t.cor.alertaBg, boxShadow: 'none' }}>
          <p style={{ ...p, margin: 0 }}>
            <strong>O essencial:</strong> &ldquo;esquerda&rdquo; e &ldquo;direita&rdquo; são rótulos para posições sobre economia e sobre costumes. As pesquisas mostram que o resultado muda conforme a forma de medir: como a pessoa se descreve nem sempre coincide com o que suas respostas indicam. Abaixo, os números, cada um com a sua fonte.
          </p>
        </div>

        {/* 1. COMO FUNCIONA */}
        <h2 id="como-funciona" style={h2}>Como funciona</h2>
        <p style={sub}>Origem dos termos, a ideia central de um autor clássico e os dois eixos mais usados.</p>
        <div style={cartao}>
          <Camada titulo="Por que esses nomes?">
            <p style={p}>Em 11 de setembro de 1789, a Assembleia Constituinte francesa debatia se o rei poderia vetar as leis que ela votasse. Os defensores do veto absoluto (como Mounier, Maury e Cazalès) sentaram-se à direita do presidente da sessão. Os que se opunham (como Robespierre e Pétion) sentaram-se à esquerda. Barnave, por exemplo, defendia o veto apenas suspensivo, e cada campo era plural por dentro. A partir de outubro de 1789, a separação por lados se fixou na sala onde a Assembleia passou a se reunir.</p>
            <Fonte href="https://www.vie-publique.fr/files/fiche_produit/pdf/3303330404041_EX.pdf">Vie-publique (França)</Fonte>{' · '}
            <Fonte href="https://www.herodote.net/almanach-ID-1703.php">Hérodote.net</Fonte>
          </Camada>
          <Camada titulo="A ideia de Bobbio: a atitude diante da igualdade">
            <p style={p}>Para o filósofo italiano Norberto Bobbio, a diferença central está na atitude diante da igualdade: a esquerda veria as pessoas como mais iguais do que desiguais, e a direita como mais desiguais do que iguais. É uma posição de um autor, não um consenso: o historiador Perry Anderson, na <em>New Left Review</em>, concorda que a distinção sobrevive, mas critica a forma como Bobbio a justifica.</p>
            <Fonte href="https://newleftreview.org/issues/i231/articles/perry-anderson-a-sense-of-the-left">Perry Anderson, New Left Review nº 231</Fonte>{' · '}
            <Fonte href="https://www.politize.com.br/espectro-politico/">Politize</Fonte>
          </Camada>
          <Camada titulo="Dois eixos: economia e costumes">
            <p style={p}>Uma linha única de esquerda a direita mistura assuntos diferentes. Por isso há modelos com dois eixos. No gráfico de Nolan (criado por David Nolan em 1969), um eixo mede liberdade econômica e o outro, liberdade pessoal. O Political Compass (desde 2001) usa economia e uma escala de autoritário a libertário. Os dois modelos não são iguais, e o de Nolan tem críticas: há quem diga que os eixos se sobrepõem.</p>
            <PlanoDoisEixos legenda="Desenho do Lume para ilustrar a ideia dos dois eixos; não é o gráfico de Nolan nem o do Political Compass. Na horizontal, a economia; na vertical, os costumes." />
            <p style={p}>O Datafolha, nas pesquisas citadas nesta página, também separa duas escalas: 10 perguntas de comportamento e 6 de economia.</p>
            <Fonte href="https://en.wikipedia.org/wiki/Nolan_chart">Nolan chart (Wikipédia)</Fonte>{' · '}
            <Fonte href="https://politicalcompass.org/analysis2">Political Compass</Fonte>
          </Camada>
        </div>

        {/* 2. DADO OFICIAL */}
        <h2 id="dado-oficial" style={h2}>O retrato do Brasil: Datafolha, junho de 2026</h2>
        <p style={sub}>Perfil calculado a partir das respostas a 16 perguntas. Não é autodeclaração.</p>
        <div style={cartao}>
          <div role="img" aria-label={FAIXAS.map((f) => `${f.nome} ${f.v}%`).join(', ')} style={{ display: 'flex', height: '36px', borderRadius: '8px', overflow: 'hidden', margin: '4px 0 10px' }}>
            {FAIXAS.map((f) => (
              <div key={f.nome} style={{ width: `${f.v}%`, background: f.cor, color: '#fff', textAlign: 'center', lineHeight: '36px', fontSize: '0.85rem', fontWeight: 700 }}>{f.v}%</div>
            ))}
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 16px', fontSize: '0.82rem', color: t.cor.cinza, marginBottom: '10px' }}>
            {FAIXAS.map((f) => (
              <span key={f.nome}><span aria-hidden="true" style={{ display: 'inline-block', width: 10, height: 10, borderRadius: 3, background: f.cor, marginRight: 6 }} />{f.nome}</span>
            ))}
          </div>
          <p style={p}>Somando as faixas, 44% ficam na direita e centro-direita e 39% na esquerda e centro-esquerda. <span style={{ color: t.cor.cinza }}>Cálculo do Lume (não é número publicado pelo Datafolha): centro-direita, centro e centro-esquerda juntos somam 29% + 17% + 26% = 72%.</span></p>
          <Ficha>Datafolha, 17 e 18 de junho de 2026, 2.004 eleitores de 16 anos ou mais, entrevistas presenciais em 139 municípios, margem de erro de 2 pontos percentuais (95% de confiança, maior nos subgrupos), registro TSE BR-09956/2026.</Ficha>
          <p style={{ margin: '8px 0 0' }}><Fonte href="https://www.dgabc.com.br/Noticia/4333195/datafolha-direita-ultrapassa-esquerda-entre-eleitores-pela-1-vez-desde-2014">Reportagem (DGABC)</Fonte></p>
        </div>

        {/* 3. VOCE PODE NAO SER... */}
        <h2 id="voce-pode" style={h2}>Como me vejo <span style={{ color: t.cor.ouroTexto, fontFamily: t.fonte.corpo, fontWeight: 800, fontSize: '1.25em', letterSpacing: '0.04em', margin: '0 2px' }}>VS</span> o que minhas respostas indicam</h2>
        <p style={sub}>Dois jeitos diferentes de medir. Os números abaixo não se somam nem se comparam como se fossem a mesma coisa.</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(300px, 100%), 1fr))', gap: '14px', marginBottom: '16px' }}>
          <div style={{ ...cartao, marginBottom: 0 }}>
            <h3 style={{ fontFamily: t.fonte.titulo, fontWeight: 600, fontSize: '1.1rem', margin: '0 0 8px' }}>Como a pessoa se descreve</h3>
            <p style={p}>Em dezembro de 2025, 34% dos que se declararam petistas se colocaram na direita ou centro-direita, e 14% dos que se declararam bolsonaristas se colocaram na esquerda ou centro-esquerda.</p>
            <Ficha>Datafolha, 2 a 4 de dezembro de 2025, 2.002 eleitores em 113 municípios, margem de 2 pontos. Pergunta: &ldquo;em qual posição política você se colocaria, sendo 1 o máximo à esquerda e 7 o máximo à direita?&rdquo;. Respostas 1 e 2 contam como esquerda, 3 como centro-esquerda, 4 centro, 5 centro-direita, 6 e 7 direita.</Ficha>
            <p style={{ margin: '8px 0 0' }}><Fonte href="https://www.cnnbrasil.com.br/politica/datafolha-14-de-bolsonaristas-se-dizem-esquerda-e-34-petistas-direita/">CNN Brasil</Fonte></p>
          </div>
          <div style={{ ...cartao, marginBottom: 0 }}>
            <h3 style={{ fontFamily: t.fonte.titulo, fontWeight: 600, fontSize: '1.1rem', margin: '0 0 8px' }}>O que as respostas indicam</h3>
            <p style={p}>Em junho de 2026, 24% dos eleitores que declararam voto em Lula tinham perfil de direita ou centro-direita (19% + 5%). Entre os que declararam voto em Flávio Bolsonaro, 18% tinham perfil de esquerda ou centro-esquerda (15% + 3%; a reportagem cita 19% e atribui a diferença a arredondamento).</p>
            <Ficha>Datafolha, 17 e 18 de junho de 2026, 2.004 eleitores, margem de 2 pontos para o total (maior nesses subgrupos). Perfil calculado por 16 perguntas de comportamento e economia.</Ficha>
            <p style={{ margin: '8px 0 0' }}><Fonte href="https://www.correiobraziliense.com.br/politica/2026/07/7456813-datafolha-24-dos-eleitores-de-lula-tem-perfil-ideologico-de-direita.html">Correio Braziliense</Fonte></p>
          </div>
        </div>
        <div style={{ ...cartao, background: t.cor.papel, boxShadow: 'none' }}>
          <p style={{ ...p, margin: 0, color: t.cor.cinza, fontSize: '0.9rem' }}>Para comparar no tempo: em maio de 2022, o Datafolha mostrou 23% dos eleitores de Lula com perfil de direita e 29% dos de Bolsonaro com perfil de esquerda (campo em 25 e 26 de maio, 2.556 eleitores). <Fonte href="https://www.bnews.com.br/noticias/eleicoes/lula-tem-23-dos-seus-eleitores-de-direita-e-bolsonaro-29-de-esquerda-mostra-datafolha.html">BNews</Fonte></p>
        </div>

        {/* 4. MESMO TEMA, NUMEROS DIFERENTES */}
        <h2 id="numeros-diferentes" style={h2}>Mesmo tema, números diferentes</h2>
        <p style={sub}>Institutos diferentes perguntam de formas diferentes, em épocas diferentes. Antes de comparar, olhe o método.</p>
        <div style={{ ...cartao, overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem', minWidth: '560px' }}>
            <thead>
              <tr style={{ textAlign: 'left', color: t.cor.cinza }}>
                <th style={{ padding: '6px 8px 10px 0' }}>Tema</th><th style={{ padding: '6px 8px 10px' }}>Instituto e método</th><th style={{ padding: '6px 8px 10px' }}>Resultado</th>
              </tr>
            </thead>
            <tbody>
              {[
                ['Casamento entre pessoas do mesmo sexo', 'Ipsos-Ipec, 3 a 8 de julho de 2025, 2.000 entrevistas presenciais em 131 municípios', '36% a favor, 47% contra'],
                ['Casamento entre pessoas do mesmo sexo', 'PoderData, 24 a 26 de janeiro de 2026, 2.500 entrevistas por telefone (resposta pelo teclado) em 111 municípios', '52% a favor, 39% contra, 9% não souberam'],
                ['Aborto', 'Ipsos-Ipec, julho de 2025, presencial', '16% a favor, 75% contra'],
                ['Aborto (liberação)', 'PoderData, janeiro de 2026, telefone', '22% a favor, 68% contra, 10% não souberam'],
              ].map((r, i) => (
                <tr key={i} style={{ borderTop: `1px solid ${t.cor.linha}`, verticalAlign: 'top' }}>
                  <td style={{ padding: '10px 8px 10px 0', fontWeight: 700 }}>{r[0]}</td><td style={{ padding: '10px 8px', color: t.cor.cinza }}>{r[1]}</td><td style={{ padding: '10px 8px' }}>{r[2]}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p style={{ margin: '10px 0 0', fontSize: '0.8rem', color: t.cor.cinza }}>Margem de erro de 2 pontos nas duas pesquisas. Os textos exatos das perguntas do PoderData não estão impressos nas reportagens.</p>
          <p style={{ margin: '8px 0 0' }}>
            <Fonte href="https://www.ipsos.com/pt-br/indice-de-conservadorismo-brasileiro-2025">Ipsos-Ipec</Fonte>{' · '}
            <Fonte href="https://www.poder360.com.br/poderdata/apoio-ao-casamento-gay-vai-a-52-e-bate-recorde-diz-poderdata/">PoderData (casamento)</Fonte>{' · '}
            <Fonte href="https://www.poder360.com.br/poderdata/contrarios-ao-aborto-no-brasil-batem-recorde-e-somam-68/">PoderData (aborto)</Fonte>
          </p>
        </div>

        {/* 5. PERCEPCAO */}
        <h2 id="percepcao" style={h2}>O que achamos que o outro lado pensa</h2>
        <p style={sub}>Um estudo da Universidade de Oxford mediu a diferença entre o que as pessoas acham que o outro lado pensa e o que ele realmente pensa.</p>
        <div style={cartao}>
          <p style={p}>Entre abril de 2022 e fevereiro de 2023, em cinco pesquisas no Brasil, bolsonaristas estimaram que mais de 81% dos lulistas apoiavam a legalização do aborto até o terceiro mês de gestação. O número real era 46%. Quando os participantes recebiam o dado real antes de responder, relatavam menos antipatia pelo outro grupo do que o grupo de controle.</p>
          <p style={{ ...p, color: t.cor.cinza, fontSize: '0.9rem' }}>A página da universidade não informa o tamanho da amostra. Nos Estados Unidos, os cientistas políticos Donald Kinder e Nathan Kalmoe (2017) concluíram que a maioria do eleitorado se guia mais por vínculos de grupo do que por ideologia: é um estudo sobre outro país e não se aplica automaticamente ao Brasil.</p>
          <Fonte href="https://www.bsg.ox.ac.uk/news/polarisation-intensifies-around-elections-can-be-reduced-right-information">Blavatnik School of Government, Oxford</Fonte>{' · '}
          <Fonte href="https://chicagoreference.com/ucp/books/book/chicago/N/bo25841664.html">Kinder e Kalmoe, University of Chicago Press</Fonte>
        </div>

        {/* RODAPE DO TEMA */}
        <div style={{ ...cartao, background: t.cor.papel, boxShadow: 'none' }}>
          <p style={{ ...p, margin: '0 0 6px', fontSize: '0.88rem', color: t.cor.cinza }}><strong style={{ color: t.cor.tinta }}>Última conferência das fontes:</strong> {ULTIMA_CONFERENCIA}. Os números são os publicados pelos institutos e reportagens citados. Quando a conta é do Lume, ela aparece marcada e com as parcelas.</p>
        </div>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '32px' }}>
          <Link href="/entenda" style={botao}>Todos os temas<Seta direcao="direita" size={14} emTexto /></Link>
          <Link href="/deputados" style={{ ...botao, background: t.cor.verde, color: t.cor.ouro }}>Ver os parlamentares<Seta direcao="direita" size={14} emTexto /></Link>
          <Link href="/votacoes" style={botao}>Ver as votações<Seta direcao="direita" size={14} emTexto /></Link>
        </div>
      </div>
    </>
  );
}
