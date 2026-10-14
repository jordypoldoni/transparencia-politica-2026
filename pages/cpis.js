// /cpis: CPIs em atividade no Senado e pedidos de CPI na Camara (ideia I1, 12/10/2026).
//
// Senado: ao vivo da fonte oficial (src/lib/cpisAoVivo.js), cache de 1 hora na borda.
// Camara: lido da tabela pedidos_cpi_camara (banco 1), preenchida todo dia pelo coletor
// coletores/coletor_pedidos_cpi.js, porque a Vercel nao consegue chamar a API da Camara (D-033). Regra do site: so fato e fonte. Esta pagina NAO diz que alguem e investigado
// nem sugere culpa: pedido de CPI e um pedido, e participar de CPI nao e ser alvo dela.
//
// Cada fonte falha sozinha: se o Senado cair, os pedidos da Camara continuam aparecendo, e o
// bloco que falhou diz isso, em vez de mostrar lista vazia (que se leria como "nao ha CPI").

import Head from 'next/head';
import { createClient } from '@supabase/supabase-js';
import { cpisSenado } from '../src/lib/cpisAoVivo';
import { t } from '../src/estilo/tokens';
import { dataBr } from '../src/lib/datas';

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

function CartaoPedido({ p }) {
  return (
    <div style={linhaItem}>
      <span style={rotulo}>Pedido RCP {p.numero}/{p.ano}{p.data ? ` · apresentado em ${dataBr(p.data)}` : ''}</span>
      {p.ementa && <p style={{ margin: '0 0 10px', fontSize: '0.92rem', lineHeight: 1.5, color: t.cor.tinta }}>{p.ementa}</p>}
      <ul style={{ margin: '0 0 12px', padding: 0, listStyle: 'none', fontSize: '0.84rem', lineHeight: 1.55, color: t.cor.cinza }}>
        {p.assinaturas != null && (
          <li>
            {plural(p.assinaturas, 'assinatura registrada', 'assinaturas registradas')} no requerimento
            {p.primeiro ? <>, a primeira de {p.primeiro}</> : null}.
          </li>
        )}
        {p.situacao && <li>Situação na Câmara: {p.situacao}.</li>}
        {p.despacho && <li>Último despacho{p.dataSituacao ? ` (${dataBr(p.dataSituacao)})` : ''}: {p.despacho}</li>}
      </ul>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
        {p.inteiroTeor && <a href={p.inteiroTeor} target="_blank" rel="noopener noreferrer" style={botaoLink}>Ler o requerimento</a>}
        <a href={p.ficha} target="_blank" rel="noopener noreferrer" style={botaoLink}>Ver a tramitação</a>
      </div>
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
      </Head>

      <div className="pagina">
        <h1 style={{ fontFamily: t.fonte.titulo, fontWeight: 600, fontSize: 'clamp(1.6rem,4vw,2.2rem)', margin: '0 0 8px' }}>
          CPIs e pedidos de CPI
        </h1>
        <p style={{ color: t.cor.cinza, margin: '0 0 8px', maxWidth: '720px', lineHeight: 1.55 }}>
          Uma CPI (Comissão Parlamentar de Inquérito) investiga um fato determinado, por prazo certo.
          A Constituição manda criá-la a pedido de um terço dos membros da casa: 171 deputados ou 27 senadores.
        </p>
        <p style={{ color: t.cor.cinza, margin: '0 0 26px', maxWidth: '720px', lineHeight: 1.55, fontSize: '0.9rem' }}>
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
