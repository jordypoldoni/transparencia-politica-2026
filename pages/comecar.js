import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import ServicoAPI from '../src/servicos/servico_api';
import { t } from '../src/estilo/tokens';

const UFS = ['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'];

const pilula = (ativo) => ({
  padding: '9px 16px', fontSize: '0.9rem', fontWeight: 700, fontFamily: t.fonte.corpo,
  borderRadius: t.raio.pill, cursor: 'pointer',
  background: ativo ? t.cor.verde : '#fff', color: ativo ? '#fff' : t.cor.tinta,
  boxShadow: t.sombra.clicavel, transition: 'background .15s',
});

export default function Comecar({ modo, temasDisponiveis, ufSel, temasSel, deputados, votacoes }) {
  const router = useRouter();
  const [uf, setUf] = useState(ufSel || '');
  const [temas, setTemas] = useState(temasSel || []);

  // Prefill com preferência salva (sem IA — só o que o usuário escolheu antes)
  useEffect(() => {
    if (modo === 'quiz') {
      try {
        const p = JSON.parse(localStorage.getItem('prefs') || '{}');
        if (p.uf) setUf(p.uf);
        if (Array.isArray(p.temas)) setTemas(p.temas);
      } catch (e) {}
    }
  }, [modo]);

  // Salva preferência ao ver o resultado
  useEffect(() => {
    if (modo === 'resultado') {
      try { localStorage.setItem('prefs', JSON.stringify({ uf: ufSel, temas: temasSel })); } catch (e) {}
    }
  }, [modo, ufSel, temasSel]);

  const alternarTema = (nome) => setTemas((arr) => arr.includes(nome) ? arr.filter((x) => x !== nome) : [...arr, nome]);
  const enviar = () => {
    if (!uf && temas.length === 0) return;
    router.push(`/comecar?uf=${uf}&temas=${encodeURIComponent(temas.join(','))}`);
  };

  // ----- RESULTADO -----
  if (modo === 'resultado') {
    return (
      <div className="pagina">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '28px' }}>
          <div>
            <span style={{ fontSize: '0.78rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: t.cor.ouroTexto }}>Feito pra você</span>
            <h1 style={{ fontFamily: t.fonte.titulo, fontWeight: 600, fontSize: 'clamp(1.7rem,4vw,2.4rem)', margin: '6px 0 0' }}>
              {ufSel ? `Seu estado: ${ufSel}` : 'Seus temas'}{temasSel.length ? ` · ${temasSel.join(', ')}` : ''}
            </h1>
          </div>
          <Link href="/comecar" style={{ textDecoration: 'none', color: t.cor.tinta, fontWeight: 700, fontSize: '0.9rem', padding: '9px 16px', borderRadius: t.raio.pill, background: '#fff', boxShadow: t.sombra.clicavel }}>✎ editar</Link>
        </div>

        {ufSel && (
          <section style={{ marginBottom: '40px' }}>
            <h2 style={{ fontFamily: t.fonte.titulo, fontWeight: 600, fontSize: '1.5rem', margin: '0 0 16px' }}>Seus deputados ({ufSel})</h2>
            {deputados.length > 0 ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px,1fr))', gap: '12px' }}>
                {deputados.map((d) => (
                  <Link key={d.id} href={`/deputado/${d.slug}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                    <div style={{ background: '#fff', borderRadius: t.raio.md, padding: '14px', display: 'flex', gap: '12px', alignItems: 'center', boxShadow: t.sombra.clicavel, transition: 'box-shadow .15s, transform .15s' }}
                      onMouseOver={(e) => { e.currentTarget.style.boxShadow = t.sombra.hover; e.currentTarget.style.transform = 'translateY(-1px)'; }}
                      onMouseOut={(e) => { e.currentTarget.style.boxShadow = t.sombra.clicavel; e.currentTarget.style.transform = 'none'; }}>
                      <img src={d.foto_url || 'https://via.placeholder.com/80'} alt={d.nome} loading="lazy" style={{ width: '48px', height: '48px', borderRadius: '50%', objectFit: 'cover', objectPosition: 'top' }} />
                      <div style={{ minWidth: 0 }}>
                        <p style={{ margin: '0 0 2px', fontWeight: 700, fontSize: '0.95rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{d.nome}</p>
                        <p style={{ margin: 0, color: t.cor.cinza, fontSize: '0.8rem' }}>{d.partido} · {d.uf}</p>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            ) : <p style={{ color: t.cor.cinza }}>Nenhum deputado encontrado para {ufSel}.</p>}
          </section>
        )}

        {temasSel.length > 0 && (
          <section>
            <h2 style={{ fontFamily: t.fonte.titulo, fontWeight: 600, fontSize: '1.5rem', margin: '0 0 4px' }}>Votações sobre seus temas</h2>
            <p style={{ color: t.cor.cinza, fontSize: '0.88rem', margin: '0 0 16px' }}>Votações recentes ligadas a: {temasSel.join(', ')}. Fonte: Câmara.</p>
            {votacoes.length > 0 ? (
              <div style={{ display: 'grid', gap: '10px' }}>
                {votacoes.map((v, i) => (
                  <div key={i} style={{ background: '#fff', borderRadius: t.raio.md, padding: '16px 18px', display: 'flex', gap: '14px', alignItems: 'flex-start', boxShadow: t.sombra.sutil }}>
                    <span style={{ flexShrink: 0, fontSize: '0.72rem', fontWeight: 800, padding: '4px 12px', borderRadius: '6px', background: v.aprovacao === 1 ? '#E7F3EC' : '#FBEAE7', color: v.aprovacao === 1 ? t.cor.sim : t.cor.nao }}>
                      {v.aprovacao === 1 ? 'Aprovado' : v.aprovacao === 0 ? 'Rejeitado' : '—'}
                    </span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ margin: '0 0 4px', fontSize: '0.95rem', lineHeight: 1.45 }}>{v.descricao_votacao}</p>
                      <span style={{ fontSize: '0.78rem', color: t.cor.cinza }}>{v.data_voto ? new Date(v.data_voto).toLocaleDateString('pt-BR') : ''}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : <p style={{ color: t.cor.cinza }}>Ainda não encontramos votações nominais recentes sobre esses temas. Volte em breve.</p>}
          </section>
        )}
      </div>
    );
  }

  // ----- QUESTIONÁRIO -----
  return (
    <div className="surgir pagina">
      <span style={{ fontSize: '0.78rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: t.cor.ouroTexto }}>2 perguntas rápidas</span>
      <h1 style={{ fontFamily: t.fonte.titulo, fontWeight: 600, fontSize: 'clamp(1.9rem,5vw,2.8rem)', lineHeight: 1.1, margin: '10px 0 10px' }}>
        Vamos mostrar o que importa <span style={{ color: t.cor.ouroTexto }}>pra você</span>.
      </h1>
      <p style={{ color: t.cor.cinza, fontSize: '1.05rem', margin: '0 0 36px', lineHeight: 1.5 }}>
        Sem cadastro, sem IA te vigiando. Você escolhe — a gente direciona. Dá pra mudar quando quiser.
      </p>

      <div style={{ marginBottom: '32px' }}>
        <h2 style={{ fontSize: '1.1rem', margin: '0 0 14px' }}>1. Qual é o seu estado?</h2>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
          {UFS.map((u) => (
            <button key={u} onClick={() => setUf(uf === u ? '' : u)} style={pilula(uf === u)}>{u}</button>
          ))}
        </div>
      </div>

      <div style={{ marginBottom: '40px' }}>
        <h2 style={{ fontSize: '1.1rem', margin: '0 0 14px' }}>2. Quais temas te importam? <span style={{ color: t.cor.cinza, fontWeight: 400, fontSize: '0.9rem' }}>(pode marcar vários)</span></h2>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
          {temasDisponiveis.map((tema) => (
            <button key={tema} onClick={() => alternarTema(tema)} style={pilula(temas.includes(tema))}>{tema}</button>
          ))}
        </div>
      </div>

      <button onClick={enviar} disabled={!uf && temas.length === 0}
        style={{ padding: '16px 30px', fontSize: '1.05rem', fontWeight: 700, fontFamily: t.fonte.corpo, color: '#fff', background: (!uf && temas.length === 0) ? t.cor.cinza : t.cor.verde, border: 'none', borderRadius: t.raio.pill, cursor: (!uf && temas.length === 0) ? 'not-allowed' : 'pointer', boxShadow: (!uf && temas.length === 0) ? 'none' : t.sombra.clicavel }}>
        Ver o que importa pra mim →
      </button>
    </div>
  );
}

export async function getServerSideProps({ query }) {
  const temasDisponiveis = (await ServicoAPI.listarTemas()).map((c) => c.nome_categoria);
  const ufSel = query.uf || '';
  const temasSel = query.temas ? String(query.temas).split(',').map((s) => s.trim()).filter(Boolean) : [];

  if (!ufSel && temasSel.length === 0) {
    return { props: { modo: 'quiz', temasDisponiveis, ufSel: '', temasSel: [], deputados: [], votacoes: [] } };
  }

  let deputados = [], votacoes = [];
  if (ufSel) {
    const todos = await ServicoAPI.listarDeputados();
    deputados = todos.filter((d) => d.uf === ufSel);
  }
  if (temasSel.length > 0) {
    votacoes = await ServicoAPI.getVotacoesPorTemas(temasSel, 8);
  }

  return {
    props: {
      modo: 'resultado', temasDisponiveis, ufSel, temasSel,
      deputados: JSON.parse(JSON.stringify(deputados)),
      votacoes: JSON.parse(JSON.stringify(votacoes)),
    },
  };
}
