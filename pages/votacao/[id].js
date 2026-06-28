import { useState, useMemo } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Head from 'next/head';
import ServicoAPI from '../../src/servicos/servico_api';
import { humanizarVotacao, explicarTipo } from '../../src/lib/votacao';
import Termo from '../../components/Termo';
import CampoBusca from '../../components/CampoBusca';
import { t } from '../../src/estilo/tokens';

const ORDEM = ['Sim', 'Não', 'Abstenção', 'Obstrução'];
const corVoto = (tp) => {
  const x = (tp || '').toLowerCase();
  if (x === 'sim') return t.cor.sim;
  if (x === 'não' || x === 'nao') return t.cor.nao;
  if (x === 'obstrução') return t.cor.alertaTexto;
  return t.cor.cinza;
};
const rotulo = (tp) => (tp === 'Sim' ? 'A favor' : tp === 'Não' ? 'Contra' : tp);
const pilula = { display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '10px 18px', fontSize: '0.9rem', fontWeight: 700, fontFamily: t.fonte.corpo, borderRadius: t.raio.pill, cursor: 'pointer', textDecoration: 'none', border: 'none', background: '#fff', color: t.cor.tinta, boxShadow: t.sombra.clicavel };

export default function Votacao({ meta, votos }) {
  const router = useRouter();
  const [busca, setBusca] = useState('');
  const [abertos, setAbertos] = useState({});

  const h = humanizarVotacao(meta);
  const explicacao = explicarTipo(`${meta.descricao_votacao || ''} ${meta.proposicao_titulo || ''}`);
  const aprovado = h.status === 'Aprovado';
  const assunto = meta.ementa || h.limpo || meta.descricao_votacao;

  const contagem = useMemo(() => {
    const c = {};
    for (const v of votos) c[v.voto || 'Outro'] = (c[v.voto || 'Outro'] || 0) + 1;
    return c;
  }, [votos]);
  const tipos = useMemo(() => Array.from(new Set(votos.map((v) => v.voto || 'Outro')))
    .sort((a, b) => (ORDEM.indexOf(a) + 1 || 99) - (ORDEM.indexOf(b) + 1 || 99)), [votos]);

  const filtrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    if (!termo) return votos;
    return votos.filter((v) => (v.nome || '').toLowerCase().includes(termo) || (v.partido || '').toLowerCase().includes(termo));
  }, [votos, busca]);
  const buscando = busca.trim().length > 0;

  return (
    <>
      <Head><title>{`${(assunto || 'Votação').slice(0, 70)} — como votaram | Transparência`}</title></Head>
      <div className="pagina">
        <button onClick={() => router.back()} style={{ ...pilula, marginBottom: '20px' }}>← Voltar</button>

        <div style={{ background: t.cor.verde, color: '#fff', borderRadius: t.raio.lg, padding: 'clamp(22px,4vw,36px)' }}>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.74rem', fontWeight: 800, padding: '4px 12px', borderRadius: '6px', background: h.status ? (aprovado ? '#E7F3EC' : '#FBEAE7') : '#EEEDE8', color: h.status ? (aprovado ? t.cor.sim : t.cor.nao) : t.cor.tinta, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{h.status || 'Sem resultado'}</span>
            {meta.proposicao_titulo && <span style={{ fontSize: '0.74rem', fontWeight: 700, padding: '4px 12px', borderRadius: '6px', background: 'rgba(255,255,255,0.14)' }}>{meta.proposicao_titulo}</span>}
            <span style={{ opacity: 0.8, fontSize: '0.85rem' }}>{meta.data_voto ? new Date(meta.data_voto).toLocaleDateString('pt-BR') : ''}</span>
          </div>

          {/* ASSUNTO (ementa) */}
          <h1 style={{ fontFamily: t.fonte.titulo, fontWeight: 600, fontSize: 'clamp(1.4rem,3.5vw,2rem)', lineHeight: 1.25, margin: '0 0 10px' }}>{assunto}</h1>
          {meta.autor_nome && (
            <p style={{ margin: '0 0 16px', opacity: 0.85, fontSize: '0.95rem' }}>Proposta por <strong>{meta.autor_nome}</strong>{meta.autor_tipo ? ` · ${meta.autor_tipo}` : ''}</p>
          )}

          <div style={{ background: 'rgba(255,255,255,0.1)', borderRadius: t.raio.md, padding: '16px 18px' }}>
            <p style={{ margin: 0, fontSize: '0.7rem', fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase', color: t.cor.ouro }}>O que isso significa</p>
            <p style={{ margin: '6px 0 0', fontSize: '1rem', lineHeight: 1.55 }}><strong style={{ fontWeight: 800 }}>{explicacao.termo}:</strong> {explicacao.texto}</p>
            {(meta.resultado || h.limpo) && (
              <p style={{ margin: '10px 0 0', fontSize: '0.85rem', opacity: 0.78 }}>Decisão registrada: {meta.resultado || h.limpo}.</p>
            )}
          </div>
        </div>

        {/* Placar */}
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', margin: '20px 0' }}>
          {tipos.map((tp) => (
            <div key={tp} style={{ flex: '1 1 120px', background: t.cor.papelQuente, borderRadius: t.raio.md, padding: '14px 16px', boxShadow: t.sombra.sutil }}>
              <p style={{ margin: 0, fontFamily: t.fonte.titulo, fontWeight: 600, fontSize: '1.8rem', color: corVoto(tp) }}>{contagem[tp]}</p>
              <p style={{ margin: 0, fontSize: '0.82rem', color: t.cor.cinza }}>
                {tp === 'Sim' ? 'votaram a favor' : tp === 'Não' ? 'votaram contra' : <Termo>{tp}</Termo>}
              </p>
            </div>
          ))}
        </div>

        <div style={{ marginBottom: '18px' }}>
          <CampoBusca valor={busca} aoMudar={setBusca} placeholder="Buscar um parlamentar ou partido…" aoLabel="Buscar votante" />
        </div>

        {tipos.map((tp) => {
          const doTipo = filtrados.filter((v) => (v.voto || 'Outro') === tp);
          if (doTipo.length === 0) return null;
          const aberto = buscando || abertos[tp];
          return (
            <div key={tp} style={{ borderRadius: t.raio.md, marginBottom: '12px', overflow: 'hidden', background: '#fff', boxShadow: t.sombra.sutil }}>
              <button onClick={() => setAbertos((s) => ({ ...s, [tp]: !s[tp] }))} aria-expanded={!!aberto}
                style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px', border: 'none', background: '#fff', cursor: 'pointer', fontFamily: t.fonte.corpo }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: corVoto(tp) }} />
                  <strong style={{ fontSize: '1rem' }}>{tp === 'Sim' || tp === 'Não' ? rotulo(tp) : <Termo>{tp}</Termo>}</strong>
                  <span style={{ color: t.cor.cinza, fontSize: '0.9rem' }}>({doTipo.length})</span>
                </span>
                <span style={{ color: t.cor.cinza }}>{aberto ? '▲' : '▼'}</span>
              </button>
              {aberto && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '6px', padding: '6px', background: t.cor.papelQuente }}>
                  {doTipo.map((v, i) => (
                    <Link key={i} href={v.slug ? `/deputado/${v.slug}` : '#'} style={{ textDecoration: 'none', color: 'inherit', padding: '10px 14px', background: '#fff', borderRadius: t.raio.sm, display: 'block' }}>
                      <span style={{ display: 'block', fontWeight: 600, fontSize: '0.9rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{v.nome}</span>
                      <span style={{ fontSize: '0.78rem', color: t.cor.cinza }}>{v.partido} · {v.uf}</span>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          );
        })}
        {buscando && filtrados.length === 0 && <p style={{ color: t.cor.cinza }}>Ninguém encontrado com esse nome/partido nesta votação.</p>}
      </div>
    </>
  );
}

export async function getServerSideProps({ params }) {
  const dados = await ServicoAPI.getVotacao(params.id);
  if (!dados) return { notFound: true };
  return { props: { meta: JSON.parse(JSON.stringify(dados.meta)), votos: JSON.parse(JSON.stringify(dados.votos)) } };
}
