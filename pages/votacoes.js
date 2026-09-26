// /votacoes — PAINEL DE ENTRADA, não uma lista. (19/09/2026)
//
// POR QUE MUDOU
// Até hoje esta página despejava 1.054 cartões de uma vez, cada um com cabeçalho, resumo,
// assuntos, situação e a linha do tempo do processo: 813 kB só de texto vindo do banco.
// E misturava TRÊS casas sem dizer qual era qual em lugar nenhum. A composição explicava a
// bagunça: 584 cartões da Assembleia do RS, 400 do Senado e 70 da Câmara, numa tela intitulada
// "Votações da Câmara e do Senado". Um projeto estadual aparecia idêntico a uma PEC federal.
//
// A SEÇÃO DO MEIO RESPONDE "ISSO MEXE EM QUÊ DA MINHA VIDA", NÃO "QUE SIGLA É ESSA".
// A primeira versão desta tela listava o instrumento mais votado ("66 Projeto de Lei"), que é
// taxonomia. Quem chega sem saber o que procura não pergunta qual instrumento aparece mais;
// pergunta o que aquilo alcança do dia a dia dele. A camada `naSuaVida` responde isso pelo
// ALCANCE DO INSTRUMENTO, com exemplos do tipo de coisa que se decide por ali, nunca prevendo
// o efeito de uma votação específica: previsão é opinião com cara de dado.
//
// O LAYOUT É UM CARTÃO POR LINHA, EM TRÊS COLUNAS.
// Em grade de três colunas o cartão fica estreito e o texto de alcance, que é a parte que
// interessa a quem não sabe por onde começar, vira uma coluna de sete palavras por linha.
// Ocupando a largura inteira cabe explicação de verdade ao lado do que foi votado por último.

import Head from 'next/head';
import Link from 'next/link';
import ServicoAPI from '../src/servicos/servico_api';
import { CASAS_VOTACAO } from '../src/lib/casa';
import { explicarProposicao, naSuaVida } from '../src/lib/proposicoes';
import { agruparPorMateria, humanizarVotacao, papelVotacao } from '../src/lib/votacao';
import { t } from '../src/estilo/tokens';

const dataBR = (d) => (d ? new Date(d).toLocaleDateString('pt-BR') : '');
const anoDe = (d) => (d ? new Date(d).getFullYear() : null);

function statusDoGrupo(g) {
  const principais = g.votacoes.filter((v) => /texto principal|reda/i.test(papelVotacao(v.descricao)));
  const alvo = principais[principais.length - 1] || g.votacoes[g.votacoes.length - 1];
  return alvo ? humanizarVotacao({ descricao_votacao: alvo.descricao, aprovacao: alvo.aprovacao }).status : null;
}

// Selo de âmbito: fundo âmbar com texto escuro. A regra fixada em 06/09/2026 é que âmbar nunca
// leva texto branco (dá 2,4:1 e reprova no WCAG AA); com a tinta do site o contraste é folgado.
const selo = {
  fontSize: '0.7rem', fontWeight: 800, letterSpacing: '0.05em', textTransform: 'uppercase',
  padding: '4px 11px', borderRadius: '6px',
  background: t.cor.ouro, color: t.cor.tinta,
};

const rotuloSecao = {
  margin: '0 0 10px', fontSize: '0.73rem', fontWeight: 800,
  letterSpacing: '0.05em', textTransform: 'uppercase', color: t.cor.cinza,
};

export default function PainelVotacoes({ resumo }) {
  const casas = CASAS_VOTACAO.map((c) => ({ ...c, dados: resumo[c.chave] || { total: 0, recentes: [], tipos: [] } }));
  const totalGeral = casas.reduce((s, c) => s + c.dados.total, 0);

  return (
    <>
      <Head>
        <title>{`Votações da Câmara, do Senado e da Assembleia do RS | Lume`}</title>
        <meta name="description" content={`${totalGeral} votações em plenário, separadas por casa, com o que cada tipo de decisão alcança na sua vida e quem votou o quê.`} />
      </Head>

      <div className="pagina">
        <h1 style={{ fontFamily: t.fonte.titulo, fontWeight: 600, fontSize: 'clamp(1.6rem,4vw,2.2rem)', margin: '0 0 8px' }}>
          Votações em plenário
        </h1>
        <p style={{ color: t.cor.cinza, margin: '0 0 26px', maxWidth: '700px', lineHeight: 1.55 }}>
          Cada casa legislativa decide sobre coisas diferentes, e elas não se misturam. Abaixo,
          o que se decide em cada uma e o que isso alcança do seu dia a dia. Entre numa delas
          para ver a lista completa e quem votou o quê.
        </p>

        <div style={{ display: 'grid', gap: '18px' }}>
          {casas.map((c) => {
            const { dados } = c;
            const grupos = agruparPorMateria(dados.recentes).slice(0, 4);
            const de = anoDe(dados.primeira);
            const ate = anoDe(dados.ultima);
            const periodo = de && ate ? (de === ate ? `em ${de}` : `de ${de} a ${ate}`) : '';

            // Só os tipos que o site sabe explicar EM LINGUAGEM COMUM E NESTE ÂMBITO. Sigla sem
            // texto próprio não herda o texto do outro âmbito: foi assim que a tramitação
            // federal foi parar na descrição de uma lei estadual.
            const tipos = dados.tipos
              .map((x) => ({ ...x, exp: explicarProposicao(x.sigla), vida: naSuaVida(x.sigla, c.ambito) }))
              .filter((x) => x.exp && x.vida)
              .slice(0, 3);

            return (
              <section key={c.chave} style={{ background: t.cor.papelCartao, borderRadius: t.raio.md, padding: '22px 24px', boxShadow: t.sombra.sutil }}>
                {/* .painel-casa: CSS global no _app.js, como o .etapa-linha. Tres colunas
                    enquanto couber, uma so abaixo de 900px. */}
                <div className="painel-casa">
                  {/* Coluna 1: identidade da casa e a porta de entrada */}
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ ...selo, alignSelf: 'flex-start', marginBottom: '10px' }}>{c.ambito}</span>
                    <h2 style={{ fontFamily: t.fonte.titulo, fontWeight: 600, fontSize: '1.3rem', margin: '0 0 6px', color: t.cor.tinta, lineHeight: 1.25 }}>{c.nome}</h2>
                    {dados.total > 0 && (
                      <p style={{ margin: '0 0 18px', fontSize: '0.88rem', color: t.cor.cinza }}>
                        <strong style={{ color: t.cor.tinta, fontWeight: 700, fontSize: '1.15rem' }}>{dados.total.toLocaleString('pt-BR')}</strong>
                        {' '}votações{periodo ? `, ${periodo}` : ''}
                      </p>
                    )}
                    {dados.total > 0 && (
                      <Link href={`/votacoes/${c.chave}`} style={{
                        marginTop: 'auto', alignSelf: 'flex-start', textDecoration: 'none',
                        padding: '10px 20px', borderRadius: t.raio.pill, border: 'none',
                        background: t.cor.verde, color: t.cor.ouro,
                        fontSize: '0.86rem', fontWeight: 700, fontFamily: t.fonte.corpo,
                        boxShadow: t.sombra.botao,
                      }}>
                        Ver as votações
                      </Link>
                    )}
                  </div>

                  {/* Coluna 2: o que isso alcança na vida de quem lê */}
                  <div>
                    {tipos.length > 0 && (
                      <>
                        <p style={rotuloSecao}>O que se decide aqui, e o que isso alcança</p>
                        {tipos.map((x) => (
                          <div key={x.sigla} style={{ marginBottom: '14px' }}>
                            <p style={{ margin: '0 0 3px', fontSize: '0.86rem', fontWeight: 700, color: t.cor.tinta }}>
                              {x.exp.nome} <span style={{ color: t.cor.cinza, fontWeight: 600 }}>({x.qtd.toLocaleString('pt-BR')} votações)</span>
                            </p>
                            <p style={{ margin: 0, fontSize: '0.86rem', lineHeight: 1.5, color: t.cor.cinza }}>{x.vida}</p>
                          </div>
                        ))}
                      </>
                    )}
                  </div>

                  {/* Coluna 3: o que foi votado por último */}
                  <div>
                    {grupos.length > 0 && (
                      <>
                        <p style={rotuloSecao}>Votado por último</p>
                        {grupos.map((g) => {
                          const status = statusDoGrupo(g);
                          const titulo = g.explicacao_cidada || g.ementa || g.votacoes[0]?.descricao || 'Votação';
                          return (
                            <div key={g.chave} style={{ marginBottom: '11px' }}>
                              <p style={{ margin: '0 0 2px', fontSize: '0.85rem', lineHeight: 1.4, color: t.cor.tinta }}>
                                {titulo.length > 110 ? `${titulo.slice(0, 110)}…` : titulo}
                              </p>
                              <p style={{ margin: 0, fontSize: '0.74rem', color: t.cor.cinza }}>
                                {g.titulo ? `${g.titulo} · ` : ''}{dataBR(g.votacoes[g.votacoes.length - 1]?.data_voto)}
                                {status ? ` · ${status}` : ''}
                              </p>
                            </div>
                          );
                        })}
                      </>
                    )}
                  </div>
                </div>

                {dados.total === 0 && (
                  <p style={{ color: t.cor.cinza, fontSize: '0.88rem', margin: '10px 0 0' }}>Ainda sem votações coletadas nesta casa.</p>
                )}
              </section>
            );
          })}
        </div>

        <p style={{ marginTop: '26px', fontSize: '0.82rem', lineHeight: 1.55, color: t.cor.cinza, maxWidth: '700px' }}>
          As explicações acima descrevem o que cada tipo de decisão é capaz de alcançar, não o
          efeito de uma votação específica. E a cobertura é desigual entre as casas porque cada
          uma publica o seu histórico de um jeito: o período ao lado de cada número diz até onde
          o site alcança hoje.
        </p>
      </div>

    </>
  );
}

export async function getServerSideProps() {
  let resumo = {};
  try { resumo = await ServicoAPI.resumoVotacoesPorCasa(); }
  catch (e) { console.error('PainelVotacoes:', e.message); }
  return { props: { resumo: JSON.parse(JSON.stringify(resumo)) } };
}
