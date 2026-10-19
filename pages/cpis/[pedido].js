// /cpis/rcp-N-AAAA: pagina de um pedido de CPI da Camara, com a tramitacao completa (19/10/2026).
// Existe para o cidadao ler tudo sem sair do site (D-053). Dados: tabelas pedidos_cpi_camara e
// pedidos_cpi_tramitacoes (banco 1), preenchidas todo dia pelo coletor coletor_pedidos_cpi.js.
// Regra do site: so fato e fonte. Um pedido de CPI e um pedido: nao e acusacao.
import Head from 'next/head';
import { useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import BotaoVoltar from '../../components/BotaoVoltar';
import { Seta } from '../../components/icones';
import { grafo, organizacao, site, migalhas, pagina, conjuntoDeDados, jsonSeguro } from '../../src/lib/dadosEstruturados';
import { buscarTudo } from '../../src/lib/paginar';
import { t } from '../../src/estilo/tokens';
import { dataBr } from '../../src/lib/datas';
import { situacaoLegivel } from '../../src/lib/situacaoCamara';
import { lerSlug, slugPedido, nomeOrgao, horaDe } from '../../src/lib/cpisRotas';

const PASSO = 50;
const INICIO = 30;

const rotulo = { display: 'inline-block', fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', color: t.cor.ouroTexto, marginBottom: '4px' };
const cartao = { background: t.cor.papelCartao, borderRadius: t.raio.md, padding: 'clamp(18px,3vw,26px)', boxShadow: t.sombra.media };
const fato = { background: t.cor.papelQuente, borderRadius: t.raio.md, padding: '12px 14px', fontSize: '0.84rem', color: t.cor.cinza, lineHeight: 1.4 };
const fatoValor = { display: 'block', color: t.cor.tinta, fontSize: '1.02rem', fontWeight: 700, marginTop: '2px' };
const pilula = {
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: '10px 18px', borderRadius: t.raio.pill,
  background: t.cor.papelQuente2, color: t.cor.tinta, fontFamily: t.fonte.corpo, fontSize: '0.84rem', fontWeight: 700,
  border: 'none', cursor: 'pointer', boxShadow: t.sombra.botao,
};
const linkFonte = { color: t.cor.ouroTexto, fontWeight: 700 };

function plural(n, um, varios) { return `${n} ${n === 1 ? um : varios}`; }

function Movimento({ m }) {
  const hora = horaDe(m.data_hora);
  const orgao = nomeOrgao(m.sigla_orgao);
  const apoio = [orgao, m.tipo].filter(Boolean).join(' · ');
  return (
    <li style={{ background: t.cor.papelQuente, borderRadius: t.raio.sm, padding: '10px 14px', display: 'grid', gap: '2px' }}>
      <span style={{ fontSize: '0.78rem', fontWeight: 700, letterSpacing: '0.02em', color: t.cor.ouroTexto }}>
        {dataBr(String(m.data_hora).slice(0, 10))}{hora ? ` · ${hora}` : ''}
      </span>
      <span style={{ fontSize: '0.92rem', lineHeight: 1.5, color: t.cor.tinta }}>{m.despacho || m.tipo}</span>
      {apoio && <span style={{ fontSize: '0.78rem', color: t.cor.cinza }}>{apoio}</span>}
    </li>
  );
}

function Tramitacao({ movs }) {
  // Do mais recente para o mais antigo; mostra aos poucos para nao pesar nos pedidos de 2023 (500 a 630).
  const [mostrar, setMostrar] = useState(INICIO);
  const ordenadas = [...movs].reverse();
  const restam = Math.max(0, ordenadas.length - mostrar);
  return (
    <>
      <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'grid', gap: '10px' }}>
        {ordenadas.slice(0, mostrar).map((m) => <Movimento key={m.ordem} m={m} />)}
      </ul>
      {restam > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginTop: '14px' }}>
          <button type="button" style={pilula} onClick={() => setMostrar((n) => n + PASSO)}>
            Ver mais {Math.min(PASSO, restam)}<Seta size={14} emTexto />
          </button>
          {restam > PASSO * 2 && (
            <button type="button" style={pilula} onClick={() => setMostrar(ordenadas.length)}>
              Ver todas as {ordenadas.length}
            </button>
          )}
          <span style={{ alignSelf: 'center', fontSize: '0.8rem', color: t.cor.cinza }}>Faltam {restam}</span>
        </div>
      )}
    </>
  );
}

export default function PaginaPedido({ pedido, movs, tramitacaoOk, lidoEm }) {
  const nome = `RCP ${pedido.numero}/${pedido.ano}`;
  const caminho = `/cpis/${slugPedido(pedido.numero, pedido.ano)}`;
  const descricao = `Pedido de CPI ${nome} na Câmara dos Deputados: ${String(pedido.ementa || '').slice(0, 130).trim()}. Tramitação completa com fonte oficial.`;
  const situ = situacaoLegivel(pedido.situacao);
  return (
    <>
      <Head>
        <title>{`${nome}: pedido de CPI na Câmara | Lume`}</title>
        <meta name="description" content={descricao} />
        <link rel="canonical" href={`https://www.lumecidadao.com.br${caminho}`} />
        <script key="ld-pedido" type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonSeguro(grafo(
          organizacao(),
          site(),
          migalhas([{ nome: 'Início', caminho: '/' }, { nome: 'CPIs', caminho: '/cpis' }, { nome, caminho }]),
          pagina({ nome: `${nome}: pedido de CPI na Câmara`, descricao, caminho }),
          conjuntoDeDados({
            nome: `Tramitação do pedido de CPI ${nome}`,
            descricao: `Movimentações do pedido de CPI ${nome} na Câmara dos Deputados, lidas da fonte oficial.`,
            caminho,
            fontes: [{ nome: 'Dados Abertos da Câmara dos Deputados', url: 'https://dadosabertos.camara.leg.br' }],
          }),
        )) }} />
      </Head>

      <div className="pagina">
        <BotaoVoltar href="/cpis" />
        <div style={cartao}>
          <span style={rotulo}>Pedido de CPI · Câmara dos Deputados</span>
          <h1 style={{ fontFamily: t.fonte.titulo, fontWeight: 600, fontSize: 'clamp(1.6rem,4vw,2.1rem)', margin: '0 0 12px' }}>{nome}</h1>

          <div className="pedido-grade">
          <div className="pedido-ementa">
          <span style={rotulo}>Ementa oficial</span>
          <p style={{ margin: '0 0 16px', fontSize: '0.98rem', lineHeight: 1.6, color: t.cor.tinta, maxWidth: '75ch' }}>{pedido.ementa || 'A fonte não informa a ementa.'}</p>
          </div>

          <div className="pedido-fatos">
            <div style={fato}>Apresentado em<span style={fatoValor}>{pedido.data_apresentacao ? dataBr(pedido.data_apresentacao) : 'a fonte não informa'}</span></div>
            <div style={fato}>Assinaturas no requerimento
              <span style={fatoValor}>{pedido.assinaturas != null ? pedido.assinaturas : 'a fonte não informa'}</span>
              {pedido.primeiro_autor ? <>1ª assinatura: {pedido.primeiro_autor}</> : null}
            </div>
            <div style={fato}>Situação na Câmara<span style={{ ...fatoValor, fontSize: '0.95rem' }}>{situ || 'a fonte não informa'}</span></div>
          </div>

          <div className="pedido-tramitacao">
          <h2 style={{ fontFamily: t.fonte.titulo, fontWeight: 600, fontSize: '1.3rem', margin: '0 0 4px' }}>Tramitação completa</h2>
          {tramitacaoOk && movs.length > 0 ? (
            <>
              <p style={{ margin: '0 0 14px', fontSize: '0.84rem', color: t.cor.cinza, lineHeight: 1.5 }}>
                {plural(movs.length, 'movimentação', 'movimentações')}, da mais recente para a mais antiga.
                {lidoEm ? ` Lida da Câmara em ${dataBr(String(lidoEm).slice(0, 10))}.` : ''}
              </p>
              <Tramitacao movs={movs} />
            </>
          ) : (
            <p style={{ margin: '4px 0 0', fontSize: '0.9rem', color: t.cor.cinza, lineHeight: 1.5 }}>
              {tramitacaoOk ? 'A tramitação deste pedido ainda não foi coletada.' : 'Não foi possível carregar a tramitação agora.'} A ficha oficial na Câmara mostra tudo.
            </p>
          )}
          </div>
          </div>

          <p style={{ margin: '22px 0 0', fontSize: '0.8rem', lineHeight: 1.6, color: t.cor.cinza }}>
            <strong style={{ color: t.cor.tinta }}>Um pedido de CPI não é uma acusação.</strong> Esta página só registra o que a Câmara publica.
            Fonte: Dados Abertos da Câmara dos Deputados.{' '}
            {pedido.inteiro_teor ? <><a href={pedido.inteiro_teor} target="_blank" rel="noopener noreferrer" style={linkFonte}>Requerimento (PDF)</a>{' · '}</> : null}
            <a href={pedido.ficha} target="_blank" rel="noopener noreferrer" style={linkFonte}>Ficha de tramitação</a>.
          </p>
        </div>
      </div>
    </>
  );
}

export async function getServerSideProps({ params, res }) {
  const id = lerSlug(params.pedido);
  if (!id) return { notFound: true };
  const banco = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  const { data: pedido, error } = await banco.from('pedidos_cpi_camara').select('*').eq('numero', id.numero).eq('ano', id.ano).maybeSingle();
  if (error) {
    console.error('cpis/pedido:', error.message);
    res.setHeader('Cache-Control', 'public, s-maxage=60');
    throw new Error('banco indisponivel');
  }
  if (!pedido) return { notFound: true };

  // Tramitacao: leitura incompleta NAO vira lista (confere com a contagem exata).
  let movs = [];
  let tramitacaoOk = true;
  try {
    const { count, error: ec } = await banco.from('pedidos_cpi_tramitacoes').select('pedido_id', { count: 'exact', head: true }).eq('pedido_id', pedido.id);
    if (ec) throw new Error(ec.message);
    movs = await buscarTudo(() => banco.from('pedidos_cpi_tramitacoes')
      .select('ordem, data_hora, sigla_orgao, tipo, despacho, coletado_em').eq('pedido_id', pedido.id).order('ordem'), 'cpis/pedido/tramitacao');
    if (movs.length !== count) throw new Error(`leitura incompleta: ${movs.length} de ${count}`);
  } catch (e) {
    console.error('cpis/pedido/tramitacao:', e.message);
    movs = [];
    tramitacaoOk = false;
  }
  const lidoEm = movs.reduce((m, x) => (x.coletado_em > m ? x.coletado_em : m), '') || null;
  res.setHeader('Cache-Control', tramitacaoOk ? 'public, s-maxage=3600, stale-while-revalidate=86400' : 'public, s-maxage=60');
  return {
    props: {
      pedido: {
        numero: pedido.numero, ano: pedido.ano, ementa: pedido.ementa, data_apresentacao: pedido.data_apresentacao,
        situacao: pedido.situacao, assinaturas: pedido.assinaturas, primeiro_autor: pedido.primeiro_autor,
        inteiro_teor: pedido.inteiro_teor, ficha: pedido.ficha,
      },
      movs: movs.map(({ coletado_em, ...resto }) => resto),
      tramitacaoOk,
      lidoEm,
    },
  };
}
