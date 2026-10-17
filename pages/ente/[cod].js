import Head from 'next/head';
import { useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import ServicoAPI from '../../src/servicos/servico_api';
import { t } from '../../src/estilo/tokens';
import BotaoVoltar from '../../components/BotaoVoltar';
import SeloAtualizacao from '../../components/SeloAtualizacao';
import { Seta } from '../../components/icones';
import { pilulaPagina, realcePagina } from '../../src/estilo/botoes';
import { brlCompacto, brlPreciso, pct, montarPainel } from '../../src/lib/painelFiscal';

const porHab = (v, pop) => (v != null && pop ? `R$ ${(v / pop).toLocaleString('pt-BR', { maximumFractionDigits: 0 })}/hab` : null);

const ESFERA = {
  U: 'União · Governo Federal', E: 'Governo estadual', D: 'Governo do Distrito Federal', M: 'Prefeitura municipal',
};
const BIMESTRE_MES = { 1: 'fevereiro', 2: 'abril', 3: 'junho', 4: 'agosto', 5: 'outubro', 6: 'dezembro' };

export default function EntePanorama({ dados }) {
  const router = useRouter();
  const { ente, resumo, funcoes } = dados;
  const nome = ente?.ente || 'Ente';
  const esferaLabel = ESFERA[ente?.esfera] || 'Ente federativo';
  // A União tem um valor de "população" espúrio no dataset do SICONFI (~8,5 mi, sem sentido)
  // e per-capita não se aplica ao orçamento federal → não usamos população para a União.
  const pop = ente?.esfera === 'U' ? null : (resumo?.populacao || ente?.populacao || null);
  const superavit = resumo && resumo.resultado != null && resumo.resultado >= 0;
  const maxFuncao = funcoes && funcoes.length ? Math.max(...funcoes.map((f) => Number(f.valor) || 0), 1) : 1;
  const ateMes = resumo ? BIMESTRE_MES[resumo.periodo] : null;
  const painel = resumo ? montarPainel({ resumo, funcoes, ente }) : null;
  const [mostrarOrigem, setMostrarOrigem] = useState(false);
  const [todasAreas, setTodasAreas] = useState(false);

  return (
    <div className="pagina">
      <Head>
        <title>{`${nome}: arrecadação e gastos | Lume`}</title>
        <meta name="description" content={`Quanto ${nome} arrecadou e gastou em ${resumo?.ano || ''}, e para onde foi o dinheiro público, por função e por habitante. Fonte: SICONFI/Tesouro Nacional.`} />
      </Head>

      <BotaoVoltar margem="0 0 16px" />

      {/* Cabeçalho */}
      <div style={{ background: t.cor.verde, color: '#fff', borderRadius: t.raio.lg, padding: 'clamp(24px,4vw,40px)', marginBottom: '20px' }}>
        <span style={{ fontSize: '0.75rem', fontWeight: 800, letterSpacing: '0.07em', textTransform: 'uppercase', color: t.cor.ouro }}>{esferaLabel}</span>
        <h1 style={{ fontFamily: t.fonte.titulo, fontWeight: 600, fontSize: 'clamp(1.7rem,4vw,2.6rem)', margin: '8px 0 4px' }}>{nome}</h1>
        <p style={{ margin: 0, opacity: 0.85 }}>
          {ente?.esfera === 'M' && ente?.uf ? `${ente.uf} · ` : ''}{pop ? `${pop.toLocaleString('pt-BR')} habitantes` : ''}
        </p>
      </div>

      {resumo ? (
        <>
          {painel.v2 ? (
            <ResumoV2 painel={painel} ano={resumo.ano} ateMes={ateMes} nome={nome} uniao={ente?.esfera === 'U'}
              mostrarOrigem={mostrarOrigem} setMostrarOrigem={setMostrarOrigem} selo={resumo.atualizado_em} />
          ) : (
            <>
              {/* Arrecadação vs. despesa (entes sem resultado primário publicado) */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(220px, 100%), 1fr))', gap: '14px', marginBottom: '14px' }}>
                <CardNum rotulo="Arrecadou (receita)" valor={brlCompacto(resumo.receita_total)} sub={porHab(resumo.receita_total, pop)} cor={t.cor.sim} />
                <CardNum rotulo="Gastou (despesa)" valor={brlCompacto(resumo.despesa_total)} sub={porHab(resumo.despesa_total, pop)} cor={t.cor.ouroTexto} />
                <CardNum
                  rotulo="Diferença no período"
                  valor={brlCompacto(resumo.resultado != null ? Math.abs(resumo.resultado) : null)}
                  sub={superavit ? 'entrou mais do que saiu (até agora)' : 'saiu mais do que entrou (até agora)'}
                  cor={superavit ? t.cor.sim : t.cor.nao}
                />
              </div>
              <p style={{ color: t.cor.cinza, fontSize: '0.86rem', margin: '0 0 24px', lineHeight: 1.5 }}>
                Valores <strong>acumulados no ano de {resumo.ano}</strong>{ateMes ? `, até ${ateMes} (${resumo.periodo}º bimestre)` : ''}: receita realizada e despesa liquidada. A diferença reflete o <strong>momento do ano</strong> (a receita entra ao longo do exercício e a despesa é liquidada aos poucos), não é o resultado fiscal fechado. Fonte oficial: SICONFI / Tesouro Nacional.
              </p>
              <SeloAtualizacao coletadoEm={resumo.atualizado_em} style={{ margin: '-14px 0 22px' }} />
            </>
          )}

          {/* Para onde foi: despesa por função, com Encargos Especiais aberto */}
          {painel.destino.itens.length > 0 && (
            <ParaOndeFoi destino={painel.destino} pop={pop} todas={todasAreas} setTodas={setTodasAreas} />
          )}

          {/* Fonte */}
          <div style={{ background: t.cor.alertaBg, borderRadius: t.raio.md, padding: '14px 18px', fontSize: '0.86rem', color: t.cor.tinta, lineHeight: 1.5 }}>
            Estes números são <strong>agregados oficiais</strong> do Relatório Resumido da Execução Orçamentária (RREO), declarados pelo próprio ente ao <a href="https://siconfi.tesouro.gov.br/" target="_blank" rel="noopener noreferrer" style={{ color: t.cor.ouroTexto, fontWeight: 700 }}>SICONFI / Tesouro Nacional</a>. Eles mostram <em>quanto</em> e <em>em quais áreas</em>, não contratos individuais.
          </div>
        </>
      ) : (
        <div style={{ background: t.cor.papelCartao, borderRadius: t.raio.lg, padding: 'clamp(24px,4vw,40px)', boxShadow: t.sombra.sutil }}>
          <h2 style={{ fontFamily: t.fonte.titulo, fontWeight: 600, fontSize: '1.3rem', margin: '0 0 8px' }}>Dados fiscais ainda não disponíveis</h2>
          <p style={{ margin: 0, color: t.cor.cinza, fontSize: '0.92rem', lineHeight: 1.5 }}>
            {nome} ainda não tem um Relatório Resumido da Execução Orçamentária publicado no SICONFI para o período mais recente. Assim que o ente declarar, os números aparecem aqui automaticamente.
          </p>
        </div>
      )}
    </div>
  );
}

function Barra({ partes }) {
  const soma = partes.reduce((a, p) => a + p.valor, 0) || 1;
  return (
    <div aria-hidden="true" style={{ display: 'flex', height: '12px', borderRadius: t.raio.pill, overflow: 'hidden', gap: '2px', margin: '16px 0 10px' }}>
      {partes.map((p, i) => <div key={i} style={{ flex: p.valor / soma, background: p.cor }} />)}
    </div>
  );
}

const Quadrado = ({ cor }) => <i aria-hidden="true" style={{ display: 'inline-block', width: '10px', height: '10px', borderRadius: '3px', background: cor, marginRight: '6px', flexShrink: 0 }} />;
const COR_ORIGEM = { contribuicoes: '#241E52', impostos: '#FF8A00', outras: '#9AA0B4' };

function ResumoV2({ painel, ano, ateMes, nome, uniao, mostrarOrigem, setMostrarOrigem, selo }) {
  const quem = uniao ? 'o governo federal' : nome;
  const ate = ateMes ? `Até ${ateMes} de ${ano}` : `Em ${ano}`;
  const tit = { fontFamily: t.fonte.titulo, fontWeight: 600 };
  const rot = { fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: t.cor.cinza, marginBottom: '8px' };
  const cartao = { background: t.cor.papelCartao, borderRadius: t.raio.lg, boxShadow: t.sombra.sutil, padding: '22px 24px' };
  const botaoPeq = { ...pilulaPagina(false), minWidth: 0, padding: '9px 16px', fontSize: '0.82rem', marginTop: '14px', gap: '7px' };
  const { origem, divida } = painel;
  return (
    <>
      <p style={{ ...tit, fontSize: 'clamp(1.2rem, 2.6vw, 1.5rem)', lineHeight: 1.4, margin: '6px 2px 14px', maxWidth: '900px' }}>
        {ate}, {quem} arrecadou <strong style={{ color: t.cor.sim }}>{brlCompacto(painel.arrecadou)}</strong> e gastou <strong style={{ color: t.cor.ouroTexto }}>{brlCompacto(painel.gastou)}</strong> com o funcionamento do país.
        {painel.deficit
          ? <> Só de juros da dívida foram mais <strong style={{ color: t.cor.nao }}>{brlPreciso(painel.juros)}</strong>, e o déficit de <strong>{brlPreciso(Math.abs(painel.nominal))}</strong> foi coberto com mais dívida.</>
          : <> Depois dos juros da dívida, a conta fechou com sobra de <strong>{brlPreciso(Math.abs(painel.nominal))}</strong>.</>}
      </p>
      <SeloAtualizacao coletadoEm={selo} style={{ margin: '0 2px 20px' }} />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(300px, 100%), 1fr))', gap: '14px', marginBottom: '14px', alignItems: 'start' }}>
        <div style={cartao}>
          <div style={rot}>Arrecadou</div>
          <div style={{ ...tit, fontSize: '2.1rem', lineHeight: 1.1, color: t.cor.sim }}>{brlCompacto(painel.arrecadou)}</div>
          <div style={{ fontSize: '0.84rem', color: t.cor.cinza, marginTop: '6px', lineHeight: 1.45 }}>Impostos, contribuições e outras receitas. Não conta dívida nova.</div>
          {origem && (
            <>
              <Barra partes={origem.map((o) => ({ valor: o.valor, cor: COR_ORIGEM[o.chave] }))} />
              {!mostrarOrigem ? (
                <div style={{ fontSize: '0.84rem', display: 'flex', flexWrap: 'wrap', gap: '4px 14px' }}>
                  {origem.map((o) => <span key={o.chave} style={{ display: 'inline-flex', alignItems: 'center' }}><Quadrado cor={COR_ORIGEM[o.chave]} />{o.curto} {pct(o.pct)}</span>)}
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.84rem' }}>
                  {origem.map((o) => (
                    <div key={o.chave} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Quadrado cor={COR_ORIGEM[o.chave]} />
                      <span style={{ flex: 1 }}>{o.rotulo}</span>
                      <strong style={{ whiteSpace: 'nowrap' }}>{brlCompacto(o.valor)}</strong>
                      <span style={{ color: t.cor.cinza, width: '44px', textAlign: 'right' }}>{pct(o.pct)}</span>
                    </div>
                  ))}
                </div>
              )}
              <button type="button" onClick={() => setMostrarOrigem(!mostrarOrigem)} aria-expanded={mostrarOrigem} style={botaoPeq}
                onMouseOver={(e) => realcePagina(e, true)} onMouseOut={(e) => realcePagina(e, false)}>
                {mostrarOrigem ? 'Ocultar de onde veio' : 'Ver de onde veio'} <Seta aberta={mostrarOrigem} size={13} />
              </button>
            </>
          )}
        </div>
        <div style={cartao}>
          <div style={rot}>Gastou</div>
          <div style={{ ...tit, fontSize: '2.1rem', lineHeight: 1.1, color: t.cor.ouroTexto }}>{brlCompacto(painel.gastou)}</div>
          <div style={{ fontSize: '0.84rem', color: t.cor.cinza, marginTop: '6px', lineHeight: 1.45 }}>Aposentadorias, salários, saúde, educação e obras, pagos no ano. Não conta juros nem pagamento da dívida.</div>
          <div style={{ fontSize: '0.84rem', color: t.cor.cinza, marginTop: '18px', lineHeight: 1.45 }}>Para onde foi cada real está mais abaixo.</div>
        </div>
      </div>

      <div style={{ ...cartao, marginBottom: '20px' }}>
        <h2 style={{ ...tit, fontSize: '1.4rem', margin: '0 0 6px' }}>Como a conta fechou</h2>
        <p style={{ color: t.cor.cinza, fontSize: '0.9rem', margin: '0 0 4px', lineHeight: 1.5 }}>
          {painel.primario < 0
            ? `Arrecadou ${brlPreciso(Math.abs(painel.primario))} a menos do que gastou, e ainda houve os juros da dívida.`
            : `Arrecadou ${brlPreciso(painel.primario)} a mais do que gastou, antes dos juros da dívida.`}
        </p>
        <Ponte painel={painel} />
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', flexWrap: 'wrap', fontSize: '0.84rem', color: t.cor.cinza, margin: '22px 0 6px' }}>
          <span>{painel.deficit ? 'Como foi coberto' : 'Dívida líquida'}</span>
          <strong style={{ color: t.cor.tinta }}>{divida.aumento >= 0 ? '+ ' : '- '}{brlPreciso(Math.abs(divida.aumento))} de dívida</strong>
        </div>
        <div aria-hidden="true" style={{ height: '14px', borderRadius: '12px', background: t.cor.verde }} />
        <div style={{ fontSize: '0.88rem', marginTop: '8px', lineHeight: 1.5 }}>
          Dívida líquida: de <strong>{brlCompacto(divida.inicio)}</strong> (início de {ano}) para <strong>{brlCompacto(divida.atual)}</strong> (até {ateMes || 'o fim do período'} de {ano}).
        </div>
        {painel.ajuste !== 0 && (
          <div style={{ fontSize: '0.78rem', color: t.cor.cinza, marginTop: '14px', lineHeight: 1.5 }}>
            A diferença oficial (resultado primário) de {brlPreciso(Math.abs(painel.primario))} é a conta direta, {brlPreciso(Math.abs(painel.direta))}, mais um ajuste metodológico de {brlPreciso(Math.abs(painel.ajuste))} feito pelo Tesouro. O gasto é o valor pago no ano, incluindo restos a pagar de anos anteriores.
          </div>
        )}
      </div>
    </>
  );
}

function Ponte({ painel }) {
  const dif = Math.abs(painel.primario), jur = Math.abs(painel.juros);
  const cDif = '#E08A7E', cJur = t.cor.nao;
  return (
    <div style={{ marginTop: '18px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', flexWrap: 'wrap', fontSize: '0.84rem', color: t.cor.cinza, marginBottom: '6px' }}>
        <span>{painel.deficit ? 'Déficit do período' : 'Resultado do período'}</span>
        <strong style={{ color: t.cor.tinta }}>{brlPreciso(Math.abs(painel.nominal))}</strong>
      </div>
      <div aria-hidden="true" style={{ display: 'flex', height: '34px', borderRadius: '12px', overflow: 'hidden', gap: '2px' }}>
        <div style={{ flex: dif, background: cDif }} />
        <div style={{ flex: jur, background: cJur }} />
      </div>
      <div style={{ fontSize: '0.84rem', marginTop: '8px', display: 'flex', flexWrap: 'wrap', gap: '4px 16px' }}>
        <span style={{ display: 'inline-flex', alignItems: 'center' }}><Quadrado cor={cDif} />Diferença entre arrecadou e gastou: {brlPreciso(dif)}</span>
        <span style={{ display: 'inline-flex', alignItems: 'center' }}><Quadrado cor={cJur} />Juros da dívida (líquidos): {brlPreciso(jur)}</span>
      </div>
    </div>
  );
}

function ParaOndeFoi({ destino, pop, todas, setTodas }) {
  const linhas = todas ? destino.itens : destino.principais;
  const maior = destino.itens.length ? destino.itens[0].valor : 1;
  const fecho = !todas && destino.outras;
  const Linha = ({ f, cor, trilho, nota }) => (
    <div style={{ marginBottom: '15px', ...(f.divida ? { background: '#E9E7F3', borderRadius: t.raio.md, padding: '12px 14px', margin: '0 -14px 15px' } : null) }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', alignItems: 'baseline', flexWrap: 'wrap' }}>
        <span style={{ fontWeight: 600, fontSize: '0.95rem', color: t.cor.tinta }}>{f.rotulo}</span>
        <span style={{ fontSize: '0.85rem', color: t.cor.cinza }}>
          <strong style={{ color: t.cor.tinta }}>{brlCompacto(f.valor)}</strong> · {pct(f.pct)}{porHab(f.valor, pop) ? ` · ${porHab(f.valor, pop)}` : ''}
        </span>
      </div>
      {(f.desc || nota) && <div style={{ fontSize: '0.8rem', color: t.cor.cinza, margin: '1px 0 5px', lineHeight: 1.4 }}>{f.desc || nota}</div>}
      <div aria-hidden="true" style={{ height: '10px', background: trilho || t.cor.papelQuente2, borderRadius: t.raio.pill, overflow: 'hidden', marginTop: f.desc || nota ? 0 : '5px' }}>
        <div style={{ width: `${Math.max(2, Math.round((f.valor / maior) * 100))}%`, height: '100%', background: cor || t.cor.ouro, borderRadius: t.raio.pill }} />
      </div>
    </div>
  );
  return (
    <div style={{ background: t.cor.papelCartao, borderRadius: t.raio.lg, padding: 'clamp(20px,3vw,32px)', boxShadow: t.sombra.sutil, marginBottom: '20px' }}>
      <h2 style={{ fontFamily: t.fonte.titulo, fontWeight: 600, fontSize: '1.4rem', margin: '0 0 6px' }}>Para onde foi o dinheiro</h2>
      <p style={{ color: t.cor.cinza, fontSize: '0.9rem', margin: '0 0 20px', lineHeight: 1.5 }}>
        Tudo que o orçamento aplicou no ano, por <strong>área de governo</strong>: <strong>{brlCompacto(destino.total)}</strong>. Inclui o pagamento da dívida e outros encargos.
        {pop ? ' Ao lado, o valor por habitante.' : ''}
      </p>
      <div>
        {linhas.map((f) => <Linha key={f.rotulo} f={f} cor={f.divida ? t.cor.verde : t.cor.ouro} trilho={f.divida ? '#D6D2EA' : null} />)}
        {fecho && <Linha f={{ ...destino.outras, desc: null }} cor="#9AA0B4" />}
      </div>
      {destino.outras && (
        <button type="button" onClick={() => setTodas(!todas)} aria-expanded={todas}
          style={{ ...pilulaPagina(false), minWidth: 0, padding: '10px 18px', fontSize: '0.9rem', gap: '7px', marginTop: '6px' }}
          onMouseOver={(e) => realcePagina(e, true)} onMouseOut={(e) => realcePagina(e, false)}>
          {todas ? 'Mostrar só as maiores' : `Ver as ${destino.itens.length} áreas`} <Seta aberta={todas} size={14} />
        </button>
      )}
    </div>
  );
}

function CardNum({ rotulo, valor, sub, cor }) {
  return (
    <div style={{ background: t.cor.papelCartao, borderRadius: t.raio.lg, padding: '20px 22px', boxShadow: t.sombra.sutil }}>
      <div style={{ fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: t.cor.cinza, marginBottom: '8px' }}>{rotulo}</div>
      <div style={{ fontFamily: t.fonte.titulo, fontWeight: 600, fontSize: '1.9rem', color: cor || t.cor.tinta, lineHeight: 1.1 }}>{valor}</div>
      {sub && <div style={{ fontSize: '0.82rem', color: t.cor.cinza, marginTop: '4px' }}>{sub}</div>}
    </div>
  );
}

const pilula = {
  display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '10px 18px', fontSize: '0.9rem',
  fontWeight: 700, fontFamily: t.fonte.corpo, borderRadius: t.raio.pill, cursor: 'pointer',
  textDecoration: 'none', border: 'none',
};

export async function getServerSideProps({ params }) {
  const dados = await ServicoAPI.getPanoramaEnte(params.cod);
  if (!dados) return { notFound: true };
  return { props: { dados: JSON.parse(JSON.stringify(dados)) } };
}
