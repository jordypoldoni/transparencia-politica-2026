import { useState, useMemo } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import ServicoAPI from '../src/servicos/servico_api';
import { humanizarVotacao, explicarTipo } from '../src/lib/votacao';
import Termo from '../components/Termo';
import CampoSelect from '../components/CampoSelect';
import { Lupa, Pino } from '../components/icones';
import { NOMES_UF } from '../src/lib/cotas';
import { t } from '../src/estilo/tokens';

const ESTADOS = ['AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'];
const ESTADOS_OPCOES = ESTADOS.map((uf) => ({ valor: uf, rotulo: `${uf} · ${NOMES_UF[uf] || uf}`, busca: `${uf} ${NOMES_UF[uf] || ''}` }));
const brl = (v) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(v || 0);

const botaoPilula = {
  display: 'inline-flex', alignItems: 'center', gap: '6px',
  padding: '14px 26px', fontSize: '1rem', fontWeight: 700, fontFamily: t.fonte.corpo,
  border: 'none', borderRadius: t.raio.pill, cursor: 'pointer', textDecoration: 'none',
};

export default function Home({ radarCamara, radarSenado, votacoes, parlamentares = [] }) {
  const router = useRouter();
  const [casa, setCasa] = useState('Câmara');
  const radar = casa === 'Senado' ? radarSenado : radarCamara;

  const parlOpcoes = useMemo(() => parlamentares.map((p) => ({
    valor: p.slug,
    rotulo: `${p.nome} · ${p.partido}${p.uf ? '-' + p.uf : ''}`,
    busca: `${p.nome} ${p.partido} ${p.uf}`,
  })), [parlamentares]);

  const togglePilula = (ativo) => ({
    padding: '7px 16px', fontSize: '0.82rem', fontWeight: 700, fontFamily: t.fonte.corpo,
    borderRadius: t.raio.pill, cursor: 'pointer', border: 'none',
    background: ativo ? t.cor.ouro : 'rgba(255,255,255,0.12)', color: ativo ? t.cor.tinta : '#fff',
  });

  return (
    <div>
      {/* HERO */}
      <section className="surgir pagina">
        <div className="hero-grid">
          <div>
            <span style={{ display: 'inline-block', fontSize: '0.78rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: t.cor.ouroTexto }}>
              Dados oficiais · em português claro
            </span>
            <h1 style={{ fontFamily: t.fonte.titulo, fontWeight: 600, fontSize: 'clamp(2.4rem, 5vw, 3.6rem)', lineHeight: 1.04, letterSpacing: '-0.02em', margin: '14px 0 14px' }}>
              Você elegeu.<br />Agora <span style={{ color: t.cor.ouroTexto }}>fiscalize</span>.
            </h1>
            <p style={{ fontSize: '1.1rem', color: t.cor.cinza, maxWidth: '46ch', lineHeight: 1.5, margin: '0 0 24px' }}>
              Traduzimos o que cada deputado e senador vota e gasta — com a fonte oficial do lado. Você confere e entende em 1 minuto.
            </p>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'flex-start' }}>
              <div style={{ flex: '2 1 320px', minWidth: 0 }}>
                <CampoSelect
                  opcoes={parlOpcoes} placeholder="Buscar deputado ou senador…" aoLabel="Buscar parlamentar" limite={60}
                  icone={<Lupa />}
                  aoSelecionar={(slug) => router.push(`/deputado/${slug}`)} />
              </div>
              <div style={{ flex: '1 1 220px', minWidth: '180px' }}>
                <CampoSelect
                  opcoes={ESTADOS_OPCOES} placeholder="Seu estado" aoLabel="Escolha seu estado"
                  icone={<Pino />}
                  aoSelecionar={(uf) => router.push(`/estado/${uf}`)} />
              </div>
            </div>
          </div>

          {/* Atalhos — card único e alinhado */}
          <aside style={{ background: t.cor.papelCartao, borderRadius: t.raio.lg, overflow: 'hidden', boxShadow: t.sombra.media }}>
            <p style={{ margin: 0, padding: '15px 22px', fontWeight: 700, color: t.cor.cinza, fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.07em', background: t.cor.papelQuente }}>Ir direto para</p>
            {[
              { href: '/deputados?casa=Câmara', titulo: 'Deputados', desc: '513 federais' },
              { href: '/deputados?casa=Senado', titulo: 'Senadores', desc: '81 no total' },
              { href: '/comecar', titulo: 'Montar minha página', desc: 'responda 2 perguntas', destaque: true },
            ].map((c, i) => (
              <Link key={c.href} href={c.href}
                style={{ textDecoration: 'none', color: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', padding: '18px 22px', background: c.destaque ? t.cor.alertaBg : (i % 2 === 1 ? t.cor.papelQuente : '#fff'), transition: 'background .15s' }}
                onMouseOver={(e) => { e.currentTarget.style.background = c.destaque ? '#F8E9D3' : t.cor.papelQuente2; }}
                onMouseOut={(e) => { e.currentTarget.style.background = c.destaque ? t.cor.alertaBg : (i % 2 === 1 ? t.cor.papelQuente : '#fff'); }}>
                <div style={{ minWidth: 0 }}>
                  <p style={{ margin: '0 0 2px', fontFamily: t.fonte.titulo, fontWeight: 600, fontSize: '1.2rem', color: t.cor.tinta }}>{c.titulo}</p>
                  <p style={{ margin: 0, color: t.cor.cinza, fontSize: '0.84rem' }}>{c.desc}</p>
                </div>
                <span aria-hidden style={{ fontSize: '1.25rem', color: t.cor.ouroTexto, fontWeight: 800, flexShrink: 0 }}>→</span>
              </Link>
            ))}
          </aside>
        </div>
      </section>

      {/* COMO FUNCIONA — logo no topo, para orientar */}
      <section style={{ padding: '8px 24px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
          {[
            { n: '01', tit: 'Busque seu representante', txt: 'Pelo nome ou pelo estado. Sem cadastro.' },
            { n: '02', tit: 'Entenda em 1 minuto', txt: 'Traduzimos votos e gastos pra qualquer pessoa — sem juridiquês.' },
            { n: '03', tit: 'Confira na fonte', txt: 'Cada número tem o link do documento oficial. Não confie na gente: confira.' },
          ].map((c) => (
            <div key={c.n} style={{ background: t.cor.papelCartao, borderRadius: t.raio.md, padding: '22px', boxShadow: t.sombra.sutil }}>
              <span style={{ fontFamily: t.fonte.titulo, fontSize: '1.4rem', color: t.cor.ouroTexto, fontWeight: 600 }}>{c.n}</span>
              <h3 style={{ margin: '8px 0 6px', fontSize: '1.05rem' }}>{c.tit}</h3>
              <p style={{ margin: 0, color: t.cor.cinza, fontSize: '0.9rem', lineHeight: 1.5 }}>{c.txt}</p>
            </div>
          ))}
        </div>
      </section>

      {/* RADAR DA COTA — por casa */}
      <section style={{ padding: '16px 24px' }}>
        <div style={{ background: t.cor.verde, borderRadius: t.raio.lg, padding: 'clamp(24px,4vw,40px)', color: '#fff' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
            <h2 style={{ fontFamily: t.fonte.titulo, fontWeight: 600, fontSize: 'clamp(1.4rem,3vw,2rem)', margin: 0 }}>
              Quem mais usou a verba pública
            </h2>
            <div style={{ display: 'flex', gap: '8px' }} role="tablist">
              <button onClick={() => setCasa('Câmara')} style={togglePilula(casa === 'Câmara')}>Deputados</button>
              <button onClick={() => setCasa('Senado')} style={togglePilula(casa === 'Senado')}>Senadores</button>
            </div>
          </div>
          <p style={{ color: 'rgba(255,255,255,0.82)', maxWidth: '62ch', lineHeight: 1.5, margin: '10px 0 22px', fontSize: '0.96rem' }}>
            {casa === 'Senado'
              ? 'Senadores que mais usaram a cota (CEAPS) em 2026.'
              : 'Deputados que mais usaram a cota parlamentar em 2026.'}{' '}Toque para ver <em>em quê</em>. O <strong style={{ color: t.cor.ouro }}>teto da cota muda por estado e é diferente entre Câmara e Senado</strong> — por isso as listas são separadas. Fonte: {casa === 'Senado' ? 'Senado Federal' : 'Câmara dos Deputados'}.
          </p>
          <ol style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: '8px' }}>
            {radar.map((p, i) => (
              <li key={p.id}>
                <Link href={`/deputado/${p.slug}`} style={{ textDecoration: 'none', color: 'inherit', display: 'flex', alignItems: 'center', gap: '14px', background: 'rgba(255,255,255,0.07)', borderRadius: '6px', padding: '12px 16px' }}>
                  <span style={{ flexShrink: 0, width: '26px', fontFamily: t.fonte.titulo, fontWeight: 600, color: t.cor.ouro, fontSize: '1.2rem' }}>{i + 1}</span>
                  <img src={p.foto_url || 'https://via.placeholder.com/80'} alt={p.nome_urna} loading="lazy" style={{ width: '44px', height: '44px', borderRadius: '50%', objectFit: 'cover', objectPosition: 'top', flexShrink: 0, background: '#fff2' }} />
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ display: 'block', fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.nome_urna}</span>
                    <span style={{ fontSize: '0.82rem', opacity: 0.75 }}>{p.partido_atual} · {p.uf_sede} · em {p.n_notas} notas</span>
                  </span>
                  <span style={{ flexShrink: 0, textAlign: 'right' }}>
                    <span style={{ display: 'block', fontWeight: 800, fontSize: '1.05rem' }}>{brl(p.total)}</span>
                    <span style={{ fontSize: '0.72rem', opacity: 0.7 }}>ver no quê →</span>
                  </span>
                </Link>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* VOTAÇÕES — em linguagem clara */}
      <section style={{ padding: '16px 24px 24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '12px', flexWrap: 'wrap' }}>
          <h2 style={{ fontFamily: t.fonte.titulo, fontWeight: 600, fontSize: '1.7rem', margin: '0 0 4px' }}>O que os deputados decidiram</h2>
          <Link href="/votacoes" style={{ fontSize: '0.85rem', fontWeight: 700, color: t.cor.ouroTexto, textDecoration: 'none' }}>Ver todas as votações →</Link>
        </div>
        <p style={{ color: t.cor.cinza, fontSize: '0.92rem', margin: '0 0 18px' }}>Votações recentes no plenário da Câmara — o assunto, quem propôs e o que foi decidido. Fonte: Câmara dos Deputados.</p>
        {votacoes && votacoes.length > 0 ? (
          <div style={{ display: 'grid', gap: '10px' }}>
            {votacoes.slice(0, 6).map((v, i) => {
              const h = humanizarVotacao(v);
              const aprovado = h.status === 'Aprovado';
              const exp = explicarTipo(`${v.descricao_votacao || ''} ${v.proposicao_titulo || ''}`);
              return (
                <Link key={i} href={`/votacao/${v.votacao_id_externa}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                  <div style={{ background: t.cor.papelCartao, borderRadius: t.raio.md, padding: '16px 18px', cursor: 'pointer', boxShadow: t.sombra.clicavel, transition: 'transform .15s, box-shadow .15s' }}
                    onMouseOver={(e) => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = t.sombra.hover; }}
                    onMouseOut={(e) => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = t.sombra.clicavel; }}>
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '8px', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '0.72rem', fontWeight: 800, padding: '4px 10px', borderRadius: '6px', background: h.status ? (aprovado ? '#E7F3EC' : '#FBEAE7') : '#EEEDE8', color: h.status ? (aprovado ? t.cor.sim : t.cor.nao) : t.cor.cinza, textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                        {h.status || 'Sem resultado'}
                      </span>
                      {v.proposicao_titulo && <span style={{ fontSize: '0.72rem', fontWeight: 700, color: t.cor.cinza, background: t.cor.papelQuente2, padding: '3px 8px', borderRadius: '6px' }}>{v.proposicao_titulo}</span>}
                      <span style={{ fontSize: '0.78rem', color: t.cor.cinza }}>{v.data_voto ? new Date(v.data_voto).toLocaleDateString('pt-BR') : ''}</span>
                    </div>
                    <p style={{ margin: '0 0 4px', fontSize: '1rem', fontWeight: 600, lineHeight: 1.4, color: t.cor.tinta }}>{v.ementa || h.limpo || v.descricao_votacao}</p>
                    <p style={{ margin: '0 0 6px', fontSize: '0.85rem', color: t.cor.cinza, lineHeight: 1.45 }}><strong style={{ color: t.cor.tinta, fontWeight: 700 }}>{exp.termo}:</strong> {exp.texto}</p>
                    {v.autor_nome && <p style={{ margin: '0 0 10px', fontSize: '0.78rem', color: t.cor.cinza }}>Proposta por <strong style={{ fontWeight: 600 }}>{v.autor_nome}</strong></p>}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      {h.sim != null ? (
                        <span style={{ fontSize: '0.82rem', color: t.cor.cinza }}>
                          <strong style={{ color: t.cor.sim }}>{h.sim}</strong> a favor · <strong style={{ color: t.cor.nao }}>{h.nao}</strong> contra{h.abs != null ? <> · <Termo>{h.abs} abstenções</Termo></> : null}
                        </span>
                      ) : <span />}
                      <span style={{ fontSize: '0.8rem', fontWeight: 700, color: t.cor.ouroTexto }}>ver quem votou →</span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        ) : (
          <p style={{ color: t.cor.cinza }}>Sem votações nominais recentes coletadas.</p>
        )}
      </section>
    </div>
  );
}

export async function getServerSideProps() {
  let radarCamara = [], radarSenado = [], votacoes = [], parlamentares = [];
  try {
    [radarCamara, radarSenado, votacoes, parlamentares] = await Promise.all([
      ServicoAPI.getRadarGastos(2026, 6, 'Câmara'),
      ServicoAPI.getRadarGastos(2026, 6, 'Senado'),
      ServicoAPI.getVotacoesRecentes(10),
      ServicoAPI.listarDeputados(),
    ]);
  } catch (e) {
    console.error('Home:', e.message);
  }
  const parlamentaresSlim = (parlamentares || [])
    .filter((p) => p.slug)
    .map((p) => ({ slug: p.slug, nome: p.nome, partido: p.partido, uf: p.uf }));
  return {
    props: {
      radarCamara: JSON.parse(JSON.stringify(radarCamara)),
      radarSenado: JSON.parse(JSON.stringify(radarSenado)),
      votacoes: JSON.parse(JSON.stringify(votacoes)),
      parlamentares: JSON.parse(JSON.stringify(parlamentaresSlim)),
    },
  };
}
