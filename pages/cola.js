import Head from 'next/head';
import Link from 'next/link';
import Avatar from '../components/Avatar';
import BotaoCompartilhar from '../components/BotaoCompartilhar';
import { t } from '../src/estilo/tokens';
import { NOMES_UF } from '../src/lib/cotas';
import { CARGOS_VOTO } from '../src/lib/meuVoto';
import { lerLinkCola, CAMPOS_COLA } from '../src/lib/cola';

// COLA PARA A URNA (27/09/2026): a cédula PESSOAL que alguém compartilhou (regras em
// src/lib/cola.js). Página pública e só de leitura. Deixa claro que as escolhas são de quem mandou
// o link, não do Lume, e que o Lume não guarda voto de ninguém. O número de cada candidato vem
// em destaque, porque é o que se digita na urna.
const caixa = { background: t.cor.papelCartao, borderRadius: t.raio.md, padding: 'clamp(16px,3vw,22px)', boxShadow: t.sombra.sutil };
const botaoPrimario = {
  display: 'inline-flex', alignItems: 'center', padding: '12px 22px', fontSize: '0.95rem', fontWeight: 700, fontFamily: t.fonte.corpo,
  color: t.cor.ouro, background: t.cor.verde, borderRadius: t.raio.pill, textDecoration: 'none', boxShadow: t.sombra.botao,
  transition: 'box-shadow .15s, transform .15s',
};
const realce = (e, ligar) => {
  e.currentTarget.style.boxShadow = ligar ? t.sombra.botaoHover : t.sombra.botao;
  e.currentTarget.style.transform = ligar ? 'translateY(-1px)' : 'none';
};

export default function Cola({ uf, escolhas, pedidos, url }) {
  const nomeUf = NOMES_UF[uf] || uf;
  const total = Object.values(escolhas).reduce((s, l) => s + l.length, 0);
  const faltou = pedidos - total;
  const resumo = CARGOS_VOTO.flatMap((c) => (escolhas[c.cargo] || []).map((x) => `${c.rotulo}: ${x.nome_urna} (${x.nr_candidato})`)).join(' · ');
  return (
    <div className="pagina">
      <Head>
        <title>{`Cola para a urna · ${uf} | Lume Cidadão`}</title>
        <meta name="description" content={resumo || `Cola para a urna em ${nomeUf}, 4 de outubro de 2026.`} />
        <meta property="og:title" content={`Cola para a urna · ${nomeUf}`} />
        <meta property="og:description" content={resumo || 'Eleição de 4 de outubro de 2026.'} />
        <meta name="robots" content="noindex" />
      </Head>
      <div style={{ maxWidth: '760px' }}>
        <span style={{ fontSize: '0.78rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: t.cor.ouroTexto }}>Eleição de 4 de outubro de 2026 · {nomeUf}</span>
        <h1 style={{ fontFamily: t.fonte.titulo, fontWeight: 600, fontSize: 'clamp(1.9rem,5vw,2.6rem)', lineHeight: 1.1, margin: '10px 0 12px' }}>Cola para a urna</h1>
        <p style={{ color: t.cor.tinta, fontSize: '1rem', lineHeight: 1.6, margin: '0 0 22px' }}>
          Estas são as escolhas de <strong>quem compartilhou este link</strong>, na ordem em que a urna pergunta. O Lume não guarda em
          quem cada pessoa vota: tudo o que aparece aqui veio no próprio link, e cada nome foi conferido na lista oficial de candidatos.
        </p>

        <div style={{ ...caixa, display: 'grid', gap: '10px' }}>
          {CARGOS_VOTO.map((c) => {
            const lista = escolhas[c.cargo] || [];
            return (
              <div key={c.cargo} style={{ background: t.cor.papelQuente, borderRadius: t.raio.sm, padding: '12px 14px' }}>
                <p style={{ margin: '0 0 8px', fontSize: '0.78rem', fontWeight: 800, letterSpacing: '0.04em', textTransform: 'uppercase', color: t.cor.cinza }}>
                  {c.ordem}º {c.rotulo}{c.vagas > 1 ? ' (dois votos)' : ''}
                </p>
                {lista.length === 0 ? (
                  <p style={{ margin: 0, fontSize: '0.9rem', color: t.cor.cinza }}>Sem escolha nesta cola.</p>
                ) : lista.map((x) => (
                  <div key={x.href} style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '6px' }}>
                    <Avatar nome={x.nome_urna} foto={x.foto_url} size={44} />
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <Link href={x.href} style={{ color: t.cor.tinta, fontWeight: 700, textDecoration: 'none', overflowWrap: 'anywhere' }}>{x.nome_urna}</Link>
                      <p style={{ margin: '2px 0 0', fontSize: '0.8rem', color: t.cor.cinza }}>{x.partido_sigla}</p>
                    </div>
                    {/* O número é o que se digita na urna: em destaque, com o rótulo para o leitor de tela. */}
                    <span aria-label={`número ${x.nr_candidato}`} style={{ flexShrink: 0, fontFamily: t.fonte.titulo, fontWeight: 700, fontSize: '1.5rem', letterSpacing: '0.04em', color: t.cor.verde, background: '#fff', borderRadius: t.raio.sm, padding: '4px 12px' }}>{x.nr_candidato}</span>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
        {faltou > 0 && (
          <p style={{ margin: '12px 4px 0', fontSize: '0.84rem', color: t.cor.cinza, lineHeight: 1.5 }}>
            {faltou === 1 ? 'Um nome do link não foi encontrado na lista oficial de candidatos e ficou de fora.' : `${faltou} nomes do link não foram encontrados na lista oficial de candidatos e ficaram de fora.`}
          </p>
        )}

        <div className="nao-imprimir" style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'flex-start', margin: '26px 0 0' }}>
          <Link href={`/comecar?uf=${uf}`} style={botaoPrimario} onMouseOver={(e) => realce(e, true)} onMouseOut={(e) => realce(e, false)}>Monte a sua cédula</Link>
          <BotaoCompartilhar url={url} titulo="Cola para a urna" texto={`Cola para a urna em ${nomeUf} (4 de outubro de 2026)`} rotulo="Compartilhar esta cola" claro />
          <button type="button" onClick={() => window.print()} onMouseOver={(e) => realce(e, true)} onMouseOut={(e) => realce(e, false)}
            style={{ padding: '9px 18px', fontSize: '0.9rem', fontWeight: 700, fontFamily: t.fonte.corpo, border: 'none', borderRadius: t.raio.pill, cursor: 'pointer', background: '#fff', color: t.cor.tinta, boxShadow: t.sombra.botao, transition: 'box-shadow .15s, transform .15s' }}>
            Imprimir
          </button>
        </div>
        <p style={{ margin: '18px 4px 0', fontSize: '0.82rem', color: t.cor.cinza, lineHeight: 1.55 }}>
          Na urna, você digita o número de cada candidato. Pode levar a cola em papel; o celular não pode entrar na cabine.
        </p>
      </div>
    </div>
  );
}

const ROTA = Object.fromEntries(CARGOS_VOTO.map((c) => [c.cargo, c.rota]));
const TABELA = { 'deputado-federal': 'candidatos_deputado_federal', senador: 'candidatos_senador', governador: 'candidatos_governador' };

export async function getServerSideProps({ query, req, res }) {
  const pedido = lerLinkCola(query);
  if (!pedido) return { notFound: true };
  const { uf, pedidos } = pedido;
  // Import só no servidor: a chave de serviço nunca vai para o navegador.
  const { default: supabase } = await import('../src/supabase_cliente.js');
  const { todosCandidatosEstaduais } = await import('../src/lib/candidatosEstaduais');
  const campos = 'slug, nome_urna, partido_sigla, nr_candidato, foto_url';
  const escolhas = {};

  await Promise.all(Object.entries(pedidos).map(async ([cargo, slugs]) => {
    let achados = [];
    try {
      if (TABELA[cargo]) {
        const { data } = await supabase.from(TABELA[cargo]).select(`${campos}, uf`).eq('ano_eleicao', 2026).eq('uf', uf).in('slug', slugs);
        achados = data || [];
      } else if (cargo === 'presidente') {
        const { data } = await supabase.from('candidatos_presidenciais').select(campos).eq('ano_eleicao', 2026).eq('cargo', 'Presidente').in('slug', slugs);
        achados = data || [];
      } else if (cargo === 'deputado-estadual') {
        achados = (await todosCandidatosEstaduais(uf)).filter((x) => slugs.includes(x.slug));
      }
    } catch (e) { console.error('cola:', cargo, e.message); }
    // Na ordem do link (a ordem em que a pessoa escolheu).
    escolhas[cargo] = slugs.map((s) => achados.find((x) => x.slug === s)).filter(Boolean).map((x) => ({
      href: `${ROTA[cargo]}/${x.slug}`, nome_urna: x.nome_urna, partido_sigla: x.partido_sigla || null,
      nr_candidato: x.nr_candidato != null ? String(x.nr_candidato) : '', foto_url: x.foto_url || null,
    }));
  }));

  const pedidosN = Object.values(pedidos).reduce((s, l) => s + l.length, 0);
  // O link é refeito a partir do que foi lido (req.url pode ser o endereço interno do Next).
  const qs = new URLSearchParams({ uf });
  for (const c of CAMPOS_COLA) if (pedidos[c.cargo]) qs.set(c.campo, pedidos[c.cargo].join(','));
  const proto = req.headers['x-forwarded-proto'] || 'https';
  const url = `${proto}://${req.headers.host}/cola?${qs.toString()}`;
  res.setHeader('Cache-Control', 'public, s-maxage=600, stale-while-revalidate=3600');
  return { props: { uf, escolhas, pedidos: pedidosN, url } };
}
