import { useMemo } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import ServicoAPI from '../src/servicos/servico_api';
import { humanizarVotacao, explicarTipo, papelVotacao, situacaoCidada } from '../src/lib/votacao';
import Termo from '../components/Termo';
import CampoSelect from '../components/CampoSelect';
import BuscaMunicipio from '../components/BuscaMunicipio';
import { Lupa, Pino } from '../components/icones';
import { NOMES_UF } from '../src/lib/cotas';
import { t } from '../src/estilo/tokens';

const ESTADOS = ['AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'];
const ESTADOS_OPCOES = ESTADOS.map((uf) => ({ valor: uf, rotulo: `${uf} · ${NOMES_UF[uf] || uf}`, busca: `${uf} ${NOMES_UF[uf] || ''}` }));

const botaoPilula = {
  display: 'inline-flex', alignItems: 'center', gap: '6px',
  padding: '14px 26px', fontSize: '1rem', fontWeight: 700, fontFamily: t.fonte.corpo,
  border: 'none', borderRadius: t.raio.pill, cursor: 'pointer', textDecoration: 'none',
};

// Formatação compacta de reais para os grandes números fiscais (R$ 1,45 tri / R$ 132 bi).
const brlC = (v) => {
  if (v == null) return '—';
  const n = Number(v), a = Math.abs(n);
  if (a >= 1e12) return `R$ ${(n / 1e12).toLocaleString('pt-BR', { maximumFractionDigits: 2 })} tri`;
  if (a >= 1e9) return `R$ ${(n / 1e9).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} bi`;
  if (a >= 1e6) return `R$ ${(n / 1e6).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} mi`;
  return `R$ ${n.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}`;
};

function NumHero({ rotulo, valor, destaque }) {
  return (
    <div>
      <div style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'rgba(255,255,255,0.6)' }}>{rotulo}</div>
      <div style={{ fontFamily: t.fonte.titulo, fontWeight: 600, fontSize: '1.6rem', color: destaque ? t.cor.ouro : '#fff' }}>{valor}</div>
    </div>
  );
}

// Voto "principal" de uma matéria (texto/redação final; senão o último) e seu status.
const votoPrincipal = (g) => [...g.votacoes].reverse().find((v) => /texto principal|reda/i.test(papelVotacao(v.descricao))) || g.votacoes[g.votacoes.length - 1];
const statusMateria = (g) => {
  const p = votoPrincipal(g);
  return p ? humanizarVotacao({ descricao_votacao: p.descricao, aprovacao: p.aprovacao }).status : null;
};

export default function Home({ votacoes, parlamentares = [], uniao = null, estados = [] }) {
  const router = useRouter();

  const estadoOpcoes = useMemo(() => estados.map((e) => ({ valor: String(e.cod_ibge), rotulo: e.ente, busca: e.ente })), [estados]);

  const parlOpcoes = useMemo(() => parlamentares.map((p) => ({
    valor: p.slug,
    rotulo: `${p.nome} · ${p.partido}${p.uf ? '-' + p.uf : ''}`,
    busca: `${p.nome} ${p.partido} ${p.uf}`,
  })), [parlamentares]);

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
              Política não se aceita. Se verifica. Votos e gastos dos seus representantes, em português claro, com o documento oficial do lado. Nós trazemos os dados — você decide.
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

      {/* PANORAMA FISCAL — União, estados, DF, municípios (SICONFI) */}
      <section style={{ padding: '16px 24px' }}>
        <h2 style={{ fontFamily: t.fonte.titulo, fontWeight: 600, fontSize: '1.7rem', margin: '0 0 4px' }}>Para onde vai o dinheiro público</h2>
        <p style={{ color: t.cor.cinza, fontSize: '0.92rem', margin: '0 0 18px', lineHeight: 1.5, maxWidth: '70ch' }}>
          Quanto a União, os estados, o DF e os municípios <strong>arrecadam e gastam</strong> — em linguagem clara, direto da fonte oficial (<a href="https://siconfi.tesouro.gov.br/" target="_blank" rel="noopener noreferrer" style={{ color: t.cor.ouroTexto, fontWeight: 700 }}>SICONFI/Tesouro</a>). Números acumulados de {uniao?.resumo?.ano || '2026'}.
        </p>

        {uniao?.resumo && (
          <Link href="/ente/1" style={{ textDecoration: 'none', color: '#fff', display: 'block', background: t.cor.verde, borderRadius: t.raio.lg, padding: 'clamp(20px,3vw,32px)', marginBottom: '14px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '10px', flexWrap: 'wrap', marginBottom: '16px' }}>
              <span style={{ fontFamily: t.fonte.titulo, fontWeight: 600, fontSize: '1.4rem' }}>União · Governo Federal</span>
              <span style={{ color: t.cor.ouro, fontWeight: 700, fontSize: '0.85rem' }}>ver detalhe →</span>
            </div>
            <div style={{ display: 'flex', gap: '24px 44px', flexWrap: 'wrap' }}>
              <NumHero rotulo="Arrecadou" valor={brlC(uniao.resumo.receita_total)} />
              <NumHero rotulo="Gastou" valor={brlC(uniao.resumo.despesa_total)} destaque />
            </div>
          </Link>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px,1fr))', gap: '12px', marginBottom: '16px' }}>
          <div style={{ background: t.cor.papelCartao, borderRadius: t.raio.md, padding: '18px', boxShadow: t.sombra.sutil }}>
            <p style={{ margin: '0 0 10px', fontWeight: 700, fontSize: '0.9rem' }}>Orçamento do seu estado</p>
            <CampoSelect opcoes={estadoOpcoes} placeholder="Escolha o estado" aoLabel="Estado" icone={<Pino />} aoSelecionar={(cod) => router.push(`/ente/${cod}`)} />
          </div>
          <div style={{ background: t.cor.papelCartao, borderRadius: t.raio.md, padding: '18px', boxShadow: t.sombra.sutil }}>
            <p style={{ margin: '0 0 10px', fontWeight: 700, fontSize: '0.9rem' }}>Orçamento do seu município</p>
            <BuscaMunicipio />
          </div>
        </div>

        <Link href="/gastos-publicos" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '12px 24px', fontWeight: 700, fontSize: '0.95rem', borderRadius: t.raio.pill, background: t.cor.verde, color: t.cor.ouro, textDecoration: 'none', boxShadow: t.sombra.clicavel }}>
          Explorar gastos públicos →
        </Link>
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
            {votacoes.slice(0, 6).map((g) => {
              const status = statusMateria(g);
              const aprovado = status === 'Aprovado';
              const exp = explicarTipo(`${g.titulo || ''} ${g.ementa || ''}`);
              const sit = situacaoCidada(g.situacao);
              const urgencia = /urg[êe]ncia/i.test(g.regime || '');
              const p = votoPrincipal(g);
              const h = humanizarVotacao({ descricao_votacao: p?.descricao, aprovacao: p?.aprovacao });
              const dataTxt = p?.data_voto ? new Date(p.data_voto).toLocaleDateString('pt-BR') : '';
              return (
                <Link key={g.chave} href={`/votacao/${p?.votacao_id_externa}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                  <div style={{ background: t.cor.papelCartao, borderRadius: t.raio.md, padding: '16px 18px', cursor: 'pointer', boxShadow: t.sombra.clicavel, transition: 'transform .15s, box-shadow .15s' }}
                    onMouseOver={(e) => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = t.sombra.hover; }}
                    onMouseOut={(e) => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = t.sombra.clicavel; }}>
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '8px', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '0.72rem', fontWeight: 800, padding: '4px 10px', borderRadius: '6px', background: status ? (aprovado ? '#E7F3EC' : '#FBEAE7') : '#EEEDE8', color: status ? (aprovado ? t.cor.sim : t.cor.nao) : t.cor.cinza, textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                        {status || 'Sem resultado'}
                      </span>
                      {g.titulo && <span style={{ fontSize: '0.72rem', fontWeight: 700, color: t.cor.cinza, background: t.cor.papelQuente2, padding: '3px 8px', borderRadius: '6px' }}>{g.titulo}</span>}
                      <span style={{ fontSize: '0.78rem', color: t.cor.cinza }}>{dataTxt}</span>
                      {g.n > 1 && <span style={{ fontSize: '0.72rem', color: t.cor.ouroTexto, fontWeight: 700 }}>{g.n} votações no processo</span>}
                    </div>
                    <p style={{ margin: '0 0 4px', fontSize: '1rem', fontWeight: 600, lineHeight: 1.4, color: t.cor.tinta }}>{g.ementa || h.limpo || p?.descricao}</p>
                    <p style={{ margin: '0 0 6px', fontSize: '0.85rem', color: t.cor.cinza, lineHeight: 1.45 }}><strong style={{ color: t.cor.tinta, fontWeight: 700 }}>{exp.termo}:</strong> {exp.texto}</p>
                    <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center', marginBottom: '6px' }}>
                      {sit && <span style={{ fontSize: '0.74rem', fontWeight: 700, padding: '3px 10px', borderRadius: '6px', background: /virou lei/i.test(sit) ? '#E7F3EC' : t.cor.papelQuente2, color: /virou lei/i.test(sit) ? t.cor.sim : t.cor.tinta }}>Situação: {sit}</span>}
                      {urgencia && <span style={{ fontSize: '0.74rem', color: t.cor.ouroTexto, fontWeight: 700 }}>⚡ Urgência</span>}
                      {g.autor_nome && <span style={{ fontSize: '0.78rem', color: t.cor.cinza }}>Proposta por <strong style={{ fontWeight: 600, color: t.cor.tinta }}>{g.autor_nome}</strong></span>}
                    </div>
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
  const settled = await Promise.allSettled([
    ServicoAPI.getVotacoesRecentes(10),
    ServicoAPI.listarDeputados(),
    ServicoAPI.getPanoramaUniao(),
    ServicoAPI.listarEstadosFiscais(),
  ]);
  const get = (i) => (settled[i].status === 'fulfilled' ? settled[i].value : []);
  const votacoes      = get(0);
  const parlamentares = get(1);
  const uniao         = settled[2].status === 'fulfilled' ? settled[2].value : null;
  const estados       = get(3);
  const parlamentaresSlim = (parlamentares || [])
    .filter((p) => p.slug)
    .map((p) => ({ slug: p.slug, nome: p.nome, partido: p.partido, uf: p.uf }));
  return {
    props: {
      votacoes: JSON.parse(JSON.stringify(votacoes)),
      parlamentares: JSON.parse(JSON.stringify(parlamentaresSlim)),
      uniao: JSON.parse(JSON.stringify(uniao)),
      estados: JSON.parse(JSON.stringify(estados)),
    },
  };
}
