import { useState, useMemo } from 'react';
import Link from 'next/link';
import Head from 'next/head';
import ServicoAPI from '../src/servicos/servico_api';
import { humanizarVotacao, explicarTipo } from '../src/lib/votacao';
import Termo from '../components/Termo';
import CampoBusca from '../components/CampoBusca';
import CampoSelect from '../components/CampoSelect';
import { t } from '../src/estilo/tokens';

const hv = (v) => humanizarVotacao({ descricao_votacao: v.descricao, aprovacao: v.aprovacao });

const pill = (ativo) => ({
  padding: '8px 16px', fontSize: '0.85rem', fontWeight: 700, fontFamily: t.fonte.corpo,
  borderRadius: t.raio.pill, cursor: 'pointer',
  background: ativo ? t.cor.verde : '#fff', color: ativo ? '#fff' : t.cor.tinta,
  boxShadow: t.sombra.clicavel, transition: 'background .15s',
});

const PERIODOS = [
  { valor: '', rotulo: 'Qualquer período' },
  { valor: '30', rotulo: 'Últimos 30 dias' },
  { valor: '90', rotulo: 'Últimos 90 dias' },
  { valor: '365', rotulo: 'Último ano' },
  { valor: '2026', rotulo: 'Em 2026' },
  { valor: '2025', rotulo: 'Em 2025' },
];

function passaPeriodo(v, periodo) {
  if (!periodo) return true;
  if (!v.data_voto) return false;
  const dt = new Date(v.data_voto);
  if (periodo === '2026' || periodo === '2025') return dt.getFullYear() === parseInt(periodo, 10);
  const dias = parseInt(periodo, 10);
  if (!Number.isNaN(dias)) return (Date.now() - dt.getTime()) <= dias * 86400000;
  return true;
}

export default function Votacoes({ votacoes, temas = [] }) {
  const [busca, setBusca] = useState('');
  const [filtro, setFiltro] = useState('todas'); // todas | aprovadas | rejeitadas
  const [periodo, setPeriodo] = useState('');
  const [tema, setTema] = useState('');

  const kwsTema = useMemo(() => {
    const m = {};
    for (const c of temas) m[c.nome_categoria] = (c.palavras_chave || []).map((k) => String(k).toLowerCase());
    return m;
  }, [temas]);

  const lista = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    const kws = tema ? (kwsTema[tema] || []) : null;
    return votacoes.filter((v) => {
      const h = hv(v);
      if (filtro === 'aprovadas' && h.status !== 'Aprovado') return false;
      if (filtro === 'rejeitadas' && h.status !== 'Rejeitado') return false;
      if (!passaPeriodo(v, periodo)) return false;
      const alvo = [v.ementa, v.descricao, v.proposicao_titulo, v.autor_nome, v.keywords].filter(Boolean).join(' ').toLowerCase();
      if (kws && kws.length && !kws.some((k) => alvo.includes(k))) return false;
      if (termo && !alvo.includes(termo)) return false;
      return true;
    });
  }, [votacoes, busca, filtro, periodo, tema, kwsTema]);

  const temFiltro = busca || periodo || tema || filtro !== 'todas';

  return (
    <>
      <Head><title>Todas as votações da Câmara — busca por assunto, tema e período | Transparência</title></Head>
      <div className="pagina">
        <h1 style={{ fontFamily: t.fonte.titulo, fontWeight: 600, fontSize: 'clamp(1.6rem,4vw,2.2rem)', margin: '0 0 6px' }}>Todas as votações</h1>
        <p style={{ color: t.cor.cinza, margin: '0 0 22px', maxWidth: '640px' }}>Busque por <strong>assunto</strong>, pela proposta (ex.: "PEC 6") ou por <strong>quem propôs</strong>. Filtre por <strong>tema</strong> e <strong>período</strong>. Cobrimos os <strong>votos nominais da Câmara e do Senado</strong>.</p>

        <div style={{ marginBottom: '12px' }}>
          <CampoBusca valor={busca} aoMudar={setBusca} placeholder="Buscar por assunto, proposta ou autor… (ex.: saúde, imposto, PEC 45)" aoLabel="Buscar votações" />
        </div>

        {/* Período + status */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ flex: '0 1 220px', minWidth: '180px' }}>
            <CampoSelect opcoes={PERIODOS} valor={periodo} aoSelecionar={setPeriodo} placeholder="Qualquer período" aoLabel="Filtrar por período" buscavel={false} />
          </div>
          <button onClick={() => setFiltro('todas')} style={pill(filtro === 'todas')}>Todas</button>
          <button onClick={() => setFiltro('aprovadas')} style={pill(filtro === 'aprovadas')}>Aprovadas</button>
          <button onClick={() => setFiltro('rejeitadas')} style={pill(filtro === 'rejeitadas')}>Rejeitadas</button>
          <span style={{ marginLeft: 'auto', alignSelf: 'center', fontSize: '0.85rem', color: t.cor.cinza }}>{lista.length} votaç{lista.length === 1 ? 'ão' : 'ões'}</span>
        </div>

        {/* Temas — filtragem rápida */}
        {temas.length > 0 && (
          <div style={{ display: 'flex', gap: '8px', marginBottom: '22px', flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={{ fontSize: '0.8rem', color: t.cor.cinza, fontWeight: 700 }}>Tema:</span>
            <button onClick={() => setTema('')} style={pill(tema === '')}>Todos</button>
            {temas.map((c) => (
              <button key={c.nome_categoria} onClick={() => setTema(tema === c.nome_categoria ? '' : c.nome_categoria)} style={pill(tema === c.nome_categoria)}>
                {c.nome_categoria}
              </button>
            ))}
          </div>
        )}

        {votacoes.length === 0 ? (
          <p style={{ color: t.cor.cinza }}>Ainda não há votações com metadados coletados. Rode o coletor de votos para popular o assunto e o autor.</p>
        ) : lista.length === 0 ? (
          <p style={{ color: t.cor.cinza }}>Nenhuma votação encontrada{temFiltro ? ' com esses filtros' : ''}. Tente afrouxar a busca, o tema ou o período.</p>
        ) : (
          <div style={{ display: 'grid', gap: '10px' }}>
            {lista.map((v, i) => {
              const h = hv(v);
              const aprovado = h.status === 'Aprovado';
              const exp = explicarTipo(`${v.descricao || ''} ${v.proposicao_titulo || ''}`);
              return (
                <Link key={i} href={`/votacao/${v.votacao_id_externa}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                  <div style={{ background: t.cor.papelCartao, borderRadius: t.raio.md, padding: '16px 18px', cursor: 'pointer', boxShadow: t.sombra.clicavel, transition: 'box-shadow .15s, transform .15s' }}
                    onMouseOver={(e) => { e.currentTarget.style.boxShadow = t.sombra.hover; e.currentTarget.style.transform = 'translateY(-1px)'; }}
                    onMouseOut={(e) => { e.currentTarget.style.boxShadow = t.sombra.clicavel; e.currentTarget.style.transform = 'none'; }}>
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '8px', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '0.72rem', fontWeight: 800, padding: '4px 10px', borderRadius: '6px', background: h.status ? (aprovado ? '#E7F3EC' : '#FBEAE7') : '#EEEDE8', color: h.status ? (aprovado ? t.cor.sim : t.cor.nao) : t.cor.cinza, textTransform: 'uppercase', letterSpacing: '0.03em' }}>{h.status || 'Sem resultado'}</span>
                      {v.proposicao_titulo && <span style={{ fontSize: '0.72rem', fontWeight: 700, color: t.cor.cinza, background: t.cor.papelQuente2, padding: '3px 8px', borderRadius: '6px' }}>{v.proposicao_titulo}</span>}
                      <span style={{ fontSize: '0.78rem', color: t.cor.cinza }}>{v.data_voto ? new Date(v.data_voto).toLocaleDateString('pt-BR') : ''}</span>
                    </div>
                    <p style={{ margin: '0 0 4px', fontSize: '1rem', fontWeight: 600, lineHeight: 1.4 }}>{v.ementa || h.limpo || v.descricao}</p>
                    {v.ementa && (v.resultado || h.limpo) && (
                      <p style={{ margin: '0 0 6px', fontSize: '0.82rem', color: t.cor.tinta }}>Nesta votação: <strong style={{ fontWeight: 600 }}>{v.resultado || h.limpo}</strong></p>
                    )}
                    <p style={{ margin: '0 0 6px', fontSize: '0.85rem', color: t.cor.cinza, lineHeight: 1.45 }}><strong style={{ color: t.cor.tinta, fontWeight: 700 }}>{exp.termo}:</strong> {exp.texto}</p>
                    {v.autor_nome && <p style={{ margin: '0 0 8px', fontSize: '0.78rem', color: t.cor.cinza }}>Proposta por <strong style={{ fontWeight: 600 }}>{v.autor_nome}</strong></p>}
                    <span style={{ fontSize: '0.8rem', fontWeight: 700, color: t.cor.ouroTexto }}>ver quem votou →</span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}

export async function getServerSideProps() {
  let votacoes = [], temas = [];
  try {
    [votacoes, temas] = await Promise.all([ServicoAPI.listarVotacoes(), ServicoAPI.listarTemas()]);
  } catch (e) { console.error('Votacoes:', e.message); }
  return { props: { votacoes: JSON.parse(JSON.stringify(votacoes)), temas: JSON.parse(JSON.stringify(temas)) } };
}
