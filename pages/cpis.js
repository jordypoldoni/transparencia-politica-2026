// /cpis: CPIs em atividade no Senado e pedidos de CPI na Camara (ideia I1, 12/10/2026).
//
// Senado: ao vivo da fonte oficial (src/lib/cpisAoVivo.js), cache de 1 hora na borda.
// Camara: lido da tabela pedidos_cpi_camara (banco 1), preenchida todo dia pelo coletor
// coletores/coletor_pedidos_cpi.js, porque a Vercel nao consegue chamar a API da Camara (D-033). Regra do site: so fato e fonte. Esta pagina NAO diz que alguem e investigado
// nem sugere culpa: pedido de CPI e um pedido, e participar de CPI nao e ser alvo dela.
//
// Cada fonte falha sozinha: se o Senado cair, os pedidos da Camara continuam aparecendo, e o
// bloco que falhou diz isso, em vez de mostrar lista vazia (que se leria como "nao ha CPI").

import { grafo, organizacao, site, migalhas, conjuntoDeDados, jsonSeguro } from '../src/lib/dadosEstruturados';
import Head from 'next/head';
import Link from 'next/link';
import { useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { cpisSenado } from '../src/lib/cpisAoVivo';
import { buscarTudo } from '../src/lib/paginar';
import { resumirTramitacao } from '../src/lib/tramitacaoCpi';
import { Seta } from '../components/icones';
import { slugPedido } from '../src/lib/cpisRotas';
import { t } from '../src/estilo/tokens';
import { dataBr } from '../src/lib/datas';
import { situacaoLegivel } from '../src/lib/situacaoCamara';

const rotulo = {
  display: 'inline-block', fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.04em',
  textTransform: 'uppercase', color: t.cor.ouroTexto, marginBottom: '4px',
};
const cartao = { background: t.cor.papelCartao, borderRadius: t.raio.md, padding: 'clamp(18px,3vw,26px)', boxShadow: t.sombra.sutil };
const linhaItem = { background: t.cor.papelQuente, borderRadius: t.raio.md, padding: '14px 16px' };
const botaoLink = {
  display: 'inline-block', textDecoration: 'none', padding: '8px 16px', borderRadius: t.raio.pill,
  background: t.cor.verde, color: t.cor.ouro, fontSize: '0.8rem', fontWeight: 700, boxShadow: t.sombra.botao,
};
const acaoTexto = {
  display: 'inline-flex', alignItems: 'center', background: 'none', border: 'none', padding: '6px 0', margin: 0,
  color: t.cor.ouroTexto, font: 'inherit', fontSize: '0.86rem', fontWeight: 700, cursor: 'pointer',
  textDecoration: 'underline', textUnderlineOffset: '3px',
};
const aviso = { margin: 0, fontSize: '0.9rem', color: t.cor.cinza, lineHeight: 1.5 };

function plural(n, um, varios) { return `${n} ${n === 1 ? um : varios}`; }

function CartaoSenado({ c }) {
  const vagos = (c.cargos || []).filter((x) => !x.nome || /^vago/i.test(x.nome));
  const temCargos = c.cargos && c.cargos.length > 0;
  return (
    <div style={linhaItem}>
      <span style={rotulo}>Comissão do Senado{c.sigla ? ` · ${c.sigla}` : ''}</span>
      <h3 style={{ fontFamily: t.fonte.titulo, fontWeight: 600, fontSize: '1.15rem', margin: '0 0 6px', color: t.cor.tinta }}>{c.nome}</h3>
      <p style={{ margin: '0 0 8px', fontSize: '0.84rem', color: t.cor.cinza }}>
        {c.inicio ? <>Criada em {dataBr(c.inicio)}</> : null}
        {c.inicio && c.requerimento ? ' · ' : ''}
        {c.requerimento}
      </p>
      {c.finalidade && <p style={{ margin: '0 0 10px', fontSize: '0.9rem', lineHeight: 1.5, color: t.cor.tinta }}>{c.finalidade}</p>}
      <ul style={{ margin: 0, padding: 0, listStyle: 'none', fontSize: '0.84rem', lineHeight: 1.55, color: t.cor.cinza }}>
        {(c.titulares || c.suplentes) && (
          <li>
            O cadastro informa {c.titulares ? plural(c.titulares, 'titular', 'titulares') : null}
            {c.titulares && c.suplentes ? ' e ' : ''}{c.suplentes ? plural(c.suplentes, 'suplente', 'suplentes') : null}
            {c.nomesNoCadastro > 0 ? `, com ${c.nomesNoCadastro} nomes listados.` : ', mas não lista os nomes.'}
          </li>
        )}
        {temCargos && (
          <li>
            {vagos.length === c.cargos.length
              ? 'Presidência, vice-presidência e relatoria constam como vagas no cadastro oficial.'
              : c.cargosPreenchidos.map((x) => `${x.cargo.toLowerCase()}: ${x.nome}`).join(' · ')}
          </li>
        )}
      </ul>
    </div>
  );
}

// Data sempre com ano (dd/mm/aaaa). Periodo: "04/02/2026 a 26/05/2026"; dia unico: so a data.
function periodo(inicio, fim) {
  const a = dataBr(inicio);
  const b = dataBr(fim);
  return a === b || !fim ? a : `${a} a ${b}`;
}

// Cada movimento e um bloco: a data fica EM CIMA do texto, colada a ele (proximidade), e os blocos
// se separam entre si por um espaco maior que o de dentro (Gestalt). Sem borda lateral.
function ResumoTramitacao({ id, r }) {
  return (
    <div id={id} style={{ background: t.cor.papelCartao, borderRadius: t.raio.md, padding: '16px', margin: '10px 0 4px', boxShadow: t.sombra.sutil }}>
      <h4 style={{ fontFamily: t.fonte.titulo, fontWeight: 600, fontSize: '1.02rem', margin: '0 0 12px', color: t.cor.tinta }}>
        Resumo da tramitação · {plural(r.total, 'movimentação', 'movimentações')}
      </h4>
      <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'grid', gap: '10px' }}>
        {r.itens.map((x, i) => (
          <li key={i} style={{ background: t.cor.papelQuente, borderRadius: t.raio.sm, padding: '10px 14px', display: 'grid', gap: '2px' }}>
            <span style={{ fontSize: '0.78rem', fontWeight: 700, letterSpacing: '0.02em', color: t.cor.ouroTexto }}>{periodo(x.inicio, x.fim)}</span>
            <span style={{ fontSize: '0.92rem', lineHeight: 1.45, color: t.cor.tinta }}>{x.texto}</span>
          </li>
        ))}
      </ul>
      <p style={{ margin: '12px 0 0', fontSize: '0.8rem', lineHeight: 1.55, color: t.cor.cinza }}>
        Resumo montado com a tramitação oficial da Câmara: tipos com até 3 registros aparecem um a um; os demais, somados.
        {r.restantes > 0 ? ` Mais ${plural(r.restantes, 'movimentação ficou', 'movimentações ficaram')} fora deste resumo; todas estão na tramitação completa.` : ''}
      </p>
    </div>
  );
}

function CartaoPedido({ p }) {
  const [aberto, setAberto] = useState(false);
  const idResumo = `resumo-rcp-${p.numero}-${p.ano}`;
  return (
    <div style={linhaItem}>
      <span style={rotulo}>Pedido RCP {p.numero}/{p.ano}{p.data ? ` · apresentado em ${dataBr(p.data)}` : ''}</span>
      {p.ementa && <p style={{ margin: '0 0 10px', fontSize: '0.92rem', lineHeight: 1.5, color: t.cor.tinta }}>{p.ementa}</p>}
      <ul style={{ margin: '0 0 8px', padding: 0, listStyle: 'none', fontSize: '0.84rem', lineHeight: 1.55, color: t.cor.cinza }}>
        {p.assinaturas != null && (
          <li>
            {plural(p.assinaturas, 'assinatura registrada', 'assinaturas registradas')} no requerimento
            {p.primeiro ? <>, a primeira de {p.primeiro}</> : null}.
          </li>
        )}
        <li>Situação na Câmara: {situacaoLegivel(p.situacao) ? `${situacaoLegivel(p.situacao)}.` : 'a fonte não informa.'}</li>
        {p.despacho && <li>Última movimentação{p.dataSituacao ? ` (${dataBr(p.dataSituacao)})` : ''}: {p.despacho}</li>}
      </ul>
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', columnGap: '22px' }}>
        {p.resumo && p.resumo.total > 0 && (
          <button type="button" className="acao-texto" style={acaoTexto} aria-expanded={aberto} aria-controls={idResumo} onClick={() => setAberto((v) => !v)}>
            {aberto ? 'Ocultar o resumo da tramitação' : 'Ver o resumo da tramitação'}
            <Seta aberta={aberto} size={16} emTexto />
          </button>
        )}
        <Link href={`/cpis/${slugPedido(p.numero, p.ano)}`} className="acao-texto" style={acaoTexto}>
          Ver a tramitação completa<Seta direcao="direita" size={16} emTexto />
        </Link>
      </div>
      {aberto && p.resumo && p.resumo.total > 0 && <ResumoTramitacao id={idResumo} r={p.resumo} />}
    </div>
  );
}

export default function PaginaCpis({ senado, camara }) {
  return (
    <>
      <Head>
        <title>CPIs e pedidos de CPI | Lume</title>
        <meta name="description" content="CPIs em atividade no Senado e pedidos de CPI na Câmara, direto das fontes oficiais, com data, situação e assinaturas. Só fato e fonte." />
        <link rel="canonical" href="https://www.lumecidadao.com.br/cpis" />
        <script key="ld-cpis" type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonSeguro(grafo(
          organizacao(),
          site(),
          migalhas([{ nome: 'Início', caminho: '/' }, { nome: 'CPIs', caminho: '/cpis' }]),
          conjuntoDeDados({
            nome: 'CPIs em atividade no Senado e pedidos de CPI na Câmara',
            descricao: 'CPIs em atividade no Senado e pedidos de CPI na Câmara dos Deputados, com data, situação e assinaturas, lidos das fontes oficiais.',
            caminho: '/cpis',
            fontes: [
              { nome: 'Dados Abertos da Câmara dos Deputados', url: 'https://dadosabertos.camara.leg.br' },
              { nome: 'Dados Abertos do Senado Federal', url: 'https://www12.senado.leg.br/dados-abertos' },
            ],
          }),
        )) }} />
      </Head>

      <div className="pagina">
        <h1 style={{ fontFamily: t.fonte.titulo, fontWeight: 600, fontSize: 'clamp(1.6rem,4vw,2.2rem)', margin: '0 0 8px' }}>
          CPIs e pedidos de CPI
        </h1>
        <p style={{ color: t.cor.cinza, margin: '0 0 8px', lineHeight: 1.55 }}>
          Uma CPI (Comissão Parlamentar de Inquérito) investiga um fato determinado, por prazo certo.
          A Constituição manda criá-la a pedido de um terço dos membros da casa: 171 deputados ou 27 senadores.
        </p>
        <p style={{ color: t.cor.cinza, margin: '0 0 26px', lineHeight: 1.55, fontSize: '0.9rem' }}>
          Aqui entram só fatos e links oficiais. <strong style={{ color: t.cor.tinta }}>Um pedido de CPI não é uma acusação, e participar de uma CPI não significa ser investigado.</strong>
        </p>

        <div style={{ display: 'grid', gap: '18px' }}>
          <section style={cartao}>
            <h2 style={{ fontFamily: t.fonte.titulo, fontWeight: 600, fontSize: '1.35rem', margin: '0 0 4px' }}>Em atividade no Senado</h2>
            <p style={{ ...aviso, margin: '0 0 14px', fontSize: '0.84rem' }}>
              Lista do cadastro de comissões do Senado. A Câmara não informa se uma CPI está ativa, por isso não há lista equivalente dela aqui.
            </p>
            {!senado.ok ? (
              <p style={aviso}>Não foi possível carregar agora. A fonte oficial não respondeu.</p>
            ) : senado.itens.length === 0 ? (
              <p style={aviso}>O cadastro de comissões do Senado não lista nenhuma CPI em atividade neste momento.</p>
            ) : (
              <div style={{ display: 'grid', gap: '10px' }}>
                {senado.itens.map((c) => <CartaoSenado key={c.codigo} c={c} />)}
              </div>
            )}
          </section>

          <section style={cartao}>
            <h2 style={{ fontFamily: t.fonte.titulo, fontWeight: 600, fontSize: '1.35rem', margin: '0 0 4px' }}>Pedidos de CPI na Câmara</h2>
            <p style={{ ...aviso, margin: '0 0 14px', fontSize: '0.84rem' }}>
              Requerimentos de instituição de CPI apresentados de 2023 em diante, do mais recente para o mais antigo. O número de assinaturas é o que consta no requerimento; a Câmara decide se o pedido atende às exigências.{camara.atualizadoEm ? <> Lista atualizada em {dataBr(String(camara.atualizadoEm).slice(0, 10))}.</> : null}
            </p>
            {!camara.ok ? (
              <p style={aviso}>Não foi possível carregar agora. A fonte oficial não respondeu.</p>
            ) : camara.itens.length === 0 ? (
              <p style={aviso}>A Câmara não registra pedidos de CPI neste período.</p>
            ) : (
              <div style={{ display: 'grid', gap: '10px' }}>
                {camara.itens.map((p) => <CartaoPedido key={p.id} p={p} />)}
              </div>
            )}
          </section>
        </div>

        <p style={{ margin: '18px 0 0', fontSize: '0.78rem', color: t.cor.cinza, lineHeight: 1.5 }}>
          Fontes: Senado Federal (cadastro de comissões) e Câmara dos Deputados (dados abertos, proposições do tipo requerimento de CPI).
          Pedidos de CPI feitos no Senado ainda não entram nesta página.
        </p>
      </div>
    </>
  );
}

async function pedidosDaTabela() {
  const banco = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  const { data, error } = await banco.from('pedidos_cpi_camara').select('*')
    .order('ano', { ascending: false }).order('numero', { ascending: false });
  if (error) throw new Error(error.message);
  const itens = (data || []).map((r) => ({
    id: r.id, numero: r.numero, ano: r.ano, ementa: r.ementa, data: r.data_apresentacao,
    situacao: r.situacao, despacho: r.despacho, dataSituacao: r.data_situacao,
    assinaturas: r.assinaturas, primeiro: r.primeiro_autor, inteiroTeor: r.inteiro_teor, ficha: r.ficha,
  }));
  // Tramitacao: resumida aqui, no servidor, para a pagina levar so o resumo. A tabela passa de 1.000
  // linhas (buscarTudo) e leitura incompleta NAO vira resumo: confere com a contagem exata.
  let resumos = {};
  try {
    const { count, error: ec } = await banco.from('pedidos_cpi_tramitacoes').select('pedido_id', { count: 'exact', head: true });
    if (ec) throw new Error(ec.message);
    const movs = await buscarTudo(() => banco.from('pedidos_cpi_tramitacoes')
      .select('pedido_id, ordem, data_hora, tipo, cod_tipo, despacho').order('pedido_id').order('ordem'), 'cpis/tramitacao');
    if (movs.length !== count) throw new Error(`leitura incompleta: ${movs.length} de ${count}`);
    const porPedido = {};
    for (const m of movs) (porPedido[m.pedido_id] ||= []).push(m);
    const ementaDe = Object.fromEntries((data || []).map((r) => [r.id, r.ementa]));
    for (const [id, lista] of Object.entries(porPedido)) resumos[id] = resumirTramitacao(lista, { ementa: ementaDe[id] });
  } catch (e) {
    console.error('cpis/tramitacao:', e.message);
    resumos = {};
  }
  for (const it of itens) it.resumo = resumos[it.id] || null;
  const atualizadoEm = (data || []).reduce((m, r) => (r.coletado_em > m ? r.coletado_em : m), '') || null;
  return { itens, atualizadoEm };
}

export async function getServerSideProps({ res }) {
  const [s, c] = await Promise.allSettled([cpisSenado(), pedidosDaTabela()]);
  if (s.status === 'rejected') console.error('cpis/senado:', s.reason?.message);
  if (c.status === 'rejected') console.error('cpis/camara:', c.reason?.message);
  // Uma hora na borda; so cacheia se as duas fontes responderam, senao o erro grudaria.
  res.setHeader('Cache-Control', s.status === 'fulfilled' && c.status === 'fulfilled'
    ? 'public, s-maxage=3600, stale-while-revalidate=86400'
    : 'public, s-maxage=60');
  return {
    props: {
      senado: s.status === 'fulfilled' ? { ok: true, itens: s.value } : { ok: false, itens: [] },
      camara: c.status === 'fulfilled' ? { ok: true, itens: c.value.itens, atualizadoEm: c.value.atualizadoEm } : { ok: false, itens: [], atualizadoEm: null },
    },
  };
}
