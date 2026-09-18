import { useState } from 'react';
import Link from 'next/link';
import Head from 'next/head';
import ServicoAPI from '../../src/servicos/servico_api';
import { t } from '../../src/estilo/tokens';

// /indicacao/[codigo] — a ficha de uma indicação. (18/09/2026)
//
// Cada indicação ganha endereço próprio porque cada uma é um fato completo: um nome, um
// cargo, uma data e uma decisão do Senado. Quem procurar "Messias STF Senado" precisa chegar
// numa página, não num filtro dentro de uma lista.
//
// O LIMITE DA FONTE É PARTE DO CONTEÚDO, não uma nota de rodapé. A votação é secreta por
// determinação constitucional: temos o placar e quem esteve na sessão, nunca a direção do
// voto. Conferimos nas 177 votações — em todas, sim + não + abstenção é exatamente o número
// de senadores marcados "Votou". Então a lista de presença é apresentada como presença, com
// o rótulo que o próprio Senado dá a cada sigla, e a tela diz em voz alta que ali não está
// como ninguém votou. Um leitor que saia daqui achando que viu o voto do senador dele teria
// sido enganado pela nossa tela, ainda que cada dado estivesse correto.

const dataBR = (d) => (d ? new Date(d + 'T12:00:00').toLocaleDateString('pt-BR') : '');

const badgeResultado = (r) => ({
  fontSize: '0.8rem', fontWeight: 800, padding: '6px 14px', borderRadius: '6px',
  textTransform: 'uppercase', letterSpacing: '0.03em',
  background: r === 'Aprovado' ? '#E7F3EC' : r === 'Rejeitado' ? '#FBEAE7' : '#EEEDE8',
  color: r === 'Aprovado' ? t.cor.sim : r === 'Rejeitado' ? t.cor.nao : t.cor.cinza,
});

const rotulo = { margin: 0, fontSize: '0.7rem', fontWeight: 800, letterSpacing: '0.05em', textTransform: 'uppercase', color: t.cor.cinza };
const secao = { background: t.cor.papelCartao, borderRadius: t.raio.md, padding: 'clamp(16px,3vw,22px)', boxShadow: t.sombra.sutil, marginBottom: '18px' };

function Placar({ i }) {
  const total = (i.votos_sim || 0) + (i.votos_nao || 0) + (i.votos_abstencao || 0);
  if (!total) return null;
  const barra = (n, cor) => ({ width: `${(n / total) * 100}%`, background: cor, height: '100%' });
  return (
    <div style={{ marginTop: '14px' }}>
      <div style={{ display: 'flex', height: '10px', borderRadius: t.raio.pill, overflow: 'hidden', background: '#EEEDE8' }}>
        <div style={barra(i.votos_sim || 0, t.cor.sim)} />
        <div style={barra(i.votos_nao || 0, t.cor.nao)} />
        <div style={barra(i.votos_abstencao || 0, t.cor.cinza)} />
      </div>
      <p style={{ margin: '8px 0 0', fontSize: '0.88rem', color: t.cor.tinta }}>
        <strong style={{ color: t.cor.sim, fontWeight: 700 }}>{i.votos_sim} sim</strong>
        {' · '}
        <strong style={{ color: t.cor.nao, fontWeight: 700 }}>{i.votos_nao} não</strong>
        {i.votos_abstencao ? <span style={{ color: t.cor.cinza }}>{' · '}{i.votos_abstencao} abstenção</span> : null}
      </p>
    </div>
  );
}

export default function FichaIndicacao({ i }) {
  const [abrirPresencas, setAbrirPresencas] = useState(false);

  const presencas = Array.isArray(i.presencas) ? i.presencas : [];
  // Agrupamos pela DESCRIÇÃO OFICIAL da sigla, buscada em plenario/lista/tiposComparecimento.
  // Quando o Senado não descreve uma sigla, ela própria já é texto legível ("Votou",
  // "Presidente (art. 51 RISF)") e vai como está. Em nenhum caso escrevemos rótulo nosso.
  const grupos = presencas.reduce((acc, p) => {
    const chave = p.comparecimento || p.sigla_voto || 'Não informado';
    (acc[chave] = acc[chave] || []).push(p);
    return acc;
  }, {});
  const ordenados = Object.entries(grupos).sort((a, b) => b[1].length - a[1].length);

  // O cargo por extenso passa de 130 caracteres ("Ministro do Supremo Tribunal Federal, na
  // vaga decorrente da aposentadoria do Ministro Luís Roberto Barroso") e o Google corta o
  // título perto de 60. Para o <title> fica só a primeira oração — o cargo em si, sem a
  // cláusula da vaga. O texto completo continua inteiro no H1 e na ementa.
  const cargoCurto = (i.cargo || '').split(',')[0].trim();
  const titulo = `${i.nome_indicado || i.identificacao} — ${cargoCurto || 'indicação ao Senado'}`;
  const desc = i.votada
    ? `Indicado pela Presidência da República e ${String(i.resultado || '').toLowerCase()} pelo Senado em ${dataBR(i.data_votacao)}, por ${i.votos_sim} a ${i.votos_nao}.`
    : `Nome indicado pela Presidência da República ao Senado em ${dataBR(i.data_mensagem)}, ainda sem votação no plenário.`;

  return (
    <div className="pagina">
      <Head>
        {/* Template literal numa expressão só: com dois filhos de texto o React insere
            `<!-- -->` entre eles, e dentro de <title> isso vira texto literal no HTML servido. */}
        <title>{`${titulo} | Lume`}</title>
        <meta name="description" content={desc} />
        <meta name="robots" content="index, follow" />
        <meta property="og:title" content={titulo} />
        <meta property="og:description" content={desc} />
      </Head>

      <Link href="/indicacoes" style={{ display: 'inline-block', marginBottom: '20px', color: t.cor.cinza, textDecoration: 'none', fontWeight: 600, fontSize: '0.88rem' }}>← Indicações do presidente</Link>

      <p style={{ margin: '0 0 6px', fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: t.cor.ouroTexto }}>
        {i.identificacao} · indicação do Poder Executivo
      </p>
      <h1 style={{ fontFamily: t.fonte.titulo, fontWeight: 600, fontSize: 'clamp(1.7rem,4vw,2.4rem)', margin: '0 0 8px', lineHeight: 1.15 }}>
        {i.nome_indicado || i.identificacao}
      </h1>
      <p style={{ margin: '0 0 24px', fontSize: '1.02rem', lineHeight: 1.5, color: t.cor.tinta, maxWidth: '60ch' }}>
        {i.cargo}
      </p>

      <section style={secao}>
        <h2 style={{ fontFamily: t.fonte.titulo, fontWeight: 600, fontSize: '1.15rem', margin: '0 0 14px' }}>Decisão do Senado</h2>
        {i.votada ? (
          <>
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
              <span style={badgeResultado(i.resultado)}>{i.resultado}</span>
              <span style={{ fontSize: '0.88rem', color: t.cor.cinza }}>em {dataBR(i.data_votacao)}</span>
            </div>
            <Placar i={i} />
          </>
        ) : (
          <p style={{ margin: 0, fontSize: '0.95rem', lineHeight: 1.55, color: t.cor.tinta }}>
            Enviada ao Senado em {dataBR(i.data_mensagem)} e <strong style={{ fontWeight: 700 }}>ainda sem votação</strong> no plenário.
          </p>
        )}
      </section>

      {i.votacao_secreta && (
        <section style={{ ...secao, background: t.cor.papelQuente, boxShadow: 'none' }}>
          <h2 style={{ fontFamily: t.fonte.titulo, fontWeight: 600, fontSize: '1.05rem', margin: '0 0 8px' }}>Por que não mostramos o voto de cada senador</h2>
          <p style={{ margin: 0, fontSize: '0.9rem', lineHeight: 1.6, color: t.cor.tinta, maxWidth: '66ch' }}>
            Esta votação é secreta por determinação constitucional. O Senado publica o placar e
            a lista de quem esteve na sessão, mas não registra publicamente como cada senador
            votou. O dado abaixo é <strong style={{ fontWeight: 700 }}>presença</strong>, não
            posição: “Votou” significa que a pessoa depositou um voto, não qual foi.
          </p>
        </section>
      )}

      {presencas.length > 0 && (
        <section style={secao}>
          <button
            type="button" onClick={() => setAbrirPresencas((v) => !v)} aria-expanded={abrirPresencas}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', width: '100%', background: 'none', border: 'none', padding: 0, margin: 0, textAlign: 'left', cursor: 'pointer', color: 'inherit', font: 'inherit' }}>
            <span>
              <span style={{ display: 'block', fontFamily: t.fonte.titulo, fontWeight: 600, fontSize: '1.15rem' }}>Quem estava na sessão</span>
              <span style={{ display: 'block', marginTop: '3px', fontSize: '0.82rem', color: t.cor.cinza }}>
                {presencas.length} senadores · {ordenados.map(([k, v]) => `${v.length} ${k.toLowerCase()}`).join(' · ')}
              </span>
            </span>
            <span style={{ flexShrink: 0, fontSize: '0.8rem', fontWeight: 700, color: t.cor.ouroTexto }}>
              {abrirPresencas ? 'Recolher' : 'Ver'} <span aria-hidden="true">{abrirPresencas ? '▴' : '▾'}</span>
            </span>
          </button>

          {abrirPresencas && (
            <div style={{ marginTop: '16px', display: 'grid', gap: '18px' }}>
              {ordenados.map(([condicao, gente]) => (
                <div key={condicao}>
                  <p style={rotulo}>{condicao} · {gente.length}</p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '8px' }}>
                    {gente.map((p, n) => (
                      <span key={p.codigo || n} style={{ fontSize: '0.82rem', padding: '5px 10px', borderRadius: t.raio.pill, background: t.cor.papelQuente, color: t.cor.tinta }}>
                        {p.nome}
                        {(p.partido || p.uf) && (
                          <span style={{ color: t.cor.cinza }}> · {[p.partido, p.uf].filter(Boolean).join('-')}</span>
                        )}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
              <p style={{ margin: 0, fontSize: '0.76rem', lineHeight: 1.5, color: t.cor.cinza }}>
                As condições de comparecimento são as que o próprio Senado publica, sem tradução
                nossa.
              </p>
            </div>
          )}
        </section>
      )}

      <section style={secao}>
        <p style={rotulo}>Ementa oficial</p>
        <p style={{ margin: '8px 0 0', fontSize: '0.92rem', lineHeight: 1.65, color: t.cor.tinta, maxWidth: '72ch' }}>{i.ementa}</p>
        <p style={{ margin: '14px 0 0', fontSize: '0.8rem', color: t.cor.cinza }}>
          Enviada por {i.autor || 'Presidência da República'} em {dataBR(i.data_mensagem)}
          {i.orgao ? ` · ${i.orgao}` : ''}
        </p>
      </section>

      <p style={{ fontSize: '0.78rem', lineHeight: 1.6, color: t.cor.cinza }}>
        Fonte: <a href={i.url_materia} target="_blank" rel="noopener noreferrer" style={{ color: t.cor.ouroTexto, fontWeight: 700 }}>matéria {i.identificacao} no portal do Senado</a>
        {' · '}
        <a href={i.url_fonte} target="_blank" rel="noopener noreferrer" style={{ color: t.cor.ouroTexto, fontWeight: 700 }}>dados abertos</a>.
        Nome e cargo são extraídos da ementa acima por regra fixa, sem interpretação. Sem juízo
        de valor, só os dados oficiais.
      </p>
    </div>
  );
}

export async function getServerSideProps({ params }) {
  const i = await ServicoAPI.getIndicacaoPorCodigo(params.codigo);
  if (!i) return { notFound: true };
  return { props: { i: JSON.parse(JSON.stringify(i)) } };
}
