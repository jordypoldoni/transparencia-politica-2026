import { useState, useMemo } from 'react';
import Link from 'next/link';
import Head from 'next/head';
import ServicoAPI from '../src/servicos/servico_api';
import { humanizarVotacao, explicarTipo, agruparPorMateria, papelVotacao, situacaoCidada } from '../src/lib/votacao';
import CampoBusca from '../components/CampoBusca';
import CampoSelect from '../components/CampoSelect';
import { t } from '../src/estilo/tokens';

const hv = (v) => humanizarVotacao({ descricao_votacao: v.descricao, aprovacao: v.aprovacao });

// Resultado "principal" da matéria: o último voto de texto/redação final; senão o último voto.
function statusGrupo(g) {
  const principais = g.votacoes.filter((v) => /texto principal|reda/i.test(papelVotacao(v.descricao)));
  const alvo = principais[principais.length - 1] || g.votacoes[g.votacoes.length - 1];
  return alvo ? hv(alvo).status : null;
}

const pill = (ativo) => ({
  padding: '8px 16px', fontSize: '0.85rem', fontWeight: 700, fontFamily: t.fonte.corpo,
  borderRadius: t.raio.pill, cursor: 'pointer', border: 'none',
  background: ativo ? t.cor.verde : '#fff', color: ativo ? t.cor.ouro : t.cor.tinta,
  boxShadow: t.sombra.clicavel, transition: 'background .15s',
});

const badgeStatus = (status) => ({
  fontSize: '0.72rem', fontWeight: 800, padding: '4px 10px', borderRadius: '6px',
  textTransform: 'uppercase', letterSpacing: '0.03em',
  background: status ? (status === 'Aprovado' ? '#E7F3EC' : '#FBEAE7') : '#EEEDE8',
  color: status ? (status === 'Aprovado' ? t.cor.sim : t.cor.nao) : t.cor.cinza,
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

const dataBR = (d) => (d ? new Date(d).toLocaleDateString('pt-BR') : '');

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

  // Filtra as votações (nível voto) e depois agrupa por matéria.
  const grupos = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    const kws = tema ? (kwsTema[tema] || []) : null;
    const filtradas = votacoes.filter((v) => {
      if (!passaPeriodo(v, periodo)) return false;
      const alvo = [v.ementa, v.descricao, v.proposicao_titulo, v.autor_nome, v.keywords].filter(Boolean).join(' ').toLowerCase();
      if (kws && kws.length && !kws.some((k) => alvo.includes(k))) return false;
      if (termo && !alvo.includes(termo)) return false;
      return true;
    });
    let gs = agruparPorMateria(filtradas);
    if (filtro === 'aprovadas') gs = gs.filter((g) => statusGrupo(g) === 'Aprovado');
    if (filtro === 'rejeitadas') gs = gs.filter((g) => statusGrupo(g) === 'Rejeitado');
    return gs;
  }, [votacoes, busca, filtro, periodo, tema, kwsTema]);

  const temFiltro = busca || periodo || tema || filtro !== 'todas';
  const totalVotos = grupos.reduce((s, g) => s + g.n, 0);

  return (
    <>
      <Head><title>Votações da Câmara e do Senado — agrupadas por matéria | Transparência</title></Head>
      <div className="pagina">
        <h1 style={{ fontFamily: t.fonte.titulo, fontWeight: 600, fontSize: 'clamp(1.6rem,4vw,2.2rem)', margin: '0 0 6px' }}>Votações por matéria</h1>
        <p style={{ color: t.cor.cinza, margin: '0 0 22px', maxWidth: '660px' }}>
          Cada matéria (um PL, PEC ou MP) reúne <strong>todas as votações do seu processo</strong> — urgência, destaques, texto, redação final — em ordem. Busque por <strong>assunto</strong>, pela proposta (ex.: "PEC 6") ou por <strong>quem propôs</strong>. Câmara e Senado.
        </p>

        <div style={{ marginBottom: '12px' }}>
          <CampoBusca valor={busca} aoMudar={setBusca} placeholder="Buscar por assunto, proposta ou autor… (ex.: saúde, imposto, PEC 45)" aoLabel="Buscar votações" />
        </div>

        <div style={{ display: 'flex', gap: '8px', marginBottom: '22px', flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ flex: '0 1 200px', minWidth: '160px' }}>
            <CampoSelect opcoes={PERIODOS} valor={periodo} aoSelecionar={setPeriodo} placeholder="Qualquer período" aoLabel="Filtrar por período" buscavel={false} />
          </div>
          {temas.length > 0 && (
            <div style={{ flex: '0 1 220px', minWidth: '170px' }}>
              <CampoSelect
                opcoes={[{ valor: '', rotulo: 'Qualquer tema' }, ...temas.map((c) => ({ valor: c.nome_categoria, rotulo: c.nome_categoria }))]}
                valor={tema} aoSelecionar={setTema} placeholder="Qualquer tema" aoLabel="Filtrar por tema" buscavel={false}
              />
            </div>
          )}
          <button onClick={() => setFiltro('todas')} style={pill(filtro === 'todas')}>Todas</button>
          <button onClick={() => setFiltro('aprovadas')} style={pill(filtro === 'aprovadas')}>Aprovadas</button>
          <button onClick={() => setFiltro('rejeitadas')} style={pill(filtro === 'rejeitadas')}>Rejeitadas</button>
          <span style={{ marginLeft: 'auto', alignSelf: 'center', fontSize: '0.85rem', color: t.cor.cinza }}>
            {grupos.length} matéria{grupos.length === 1 ? '' : 's'} · {totalVotos} votaç{totalVotos === 1 ? 'ão' : 'ões'}
          </span>
        </div>

        {votacoes.length === 0 ? (
          <p style={{ color: t.cor.cinza }}>Ainda não há votações com metadados coletados. Rode o backfill de votações.</p>
        ) : grupos.length === 0 ? (
          <p style={{ color: t.cor.cinza }}>Nenhuma matéria encontrada{temFiltro ? ' com esses filtros' : ''}. Tente afrouxar a busca, o tema ou o período.</p>
        ) : (
          <div style={{ display: 'grid', gap: '14px' }}>
            {grupos.map((g) => {
              const status = statusGrupo(g);
              const exp = explicarTipo(`${g.titulo || ''} ${g.ementa || ''}`);
              const varias = g.votacoes.length > 1;
              const urgencia = /urg[êe]ncia/i.test(g.regime || '') || g.votacoes.some((v) => /urg[êe]ncia/i.test(papelVotacao(v.descricao)));
              const sitCidada = situacaoCidada(g.situacao);
              const virouLei = /virou lei/i.test(sitCidada || '');
              const inicio = dataBR(g.votacoes[0]?.data_voto);
              const fim = dataBR(g.votacoes[g.votacoes.length - 1]?.data_voto);
              const periodoTxt = inicio === fim ? fim : `${inicio} – ${fim}`;
              const tituloExib = g.ementa || g.votacoes[0]?.descricao || 'Votação';
              return (
                <div key={g.chave} style={{ background: t.cor.papelCartao, borderRadius: t.raio.md, padding: '18px 20px', boxShadow: t.sombra.sutil }}>
                  <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '8px', flexWrap: 'wrap' }}>
                    <span style={badgeStatus(status)}>{status || 'Sem resultado'}</span>
                    {g.titulo && <span style={{ fontSize: '0.72rem', fontWeight: 700, color: t.cor.cinza, background: t.cor.papelQuente2, padding: '3px 8px', borderRadius: '6px' }}>{g.titulo}</span>}
                    <span style={{ fontSize: '0.78rem', color: t.cor.cinza }}>{periodoTxt}</span>
                    {varias && <span style={{ fontSize: '0.72rem', color: t.cor.ouroTexto, fontWeight: 700 }}>{g.votacoes.length} votações no processo</span>}
                  </div>

                  <p style={{ margin: '0 0 6px', fontSize: '1.02rem', fontWeight: 600, lineHeight: 1.4, color: t.cor.tinta }}>{tituloExib}</p>
                  <p style={{ margin: '0 0 6px', fontSize: '0.84rem', color: t.cor.cinza, lineHeight: 1.45 }}><strong style={{ color: t.cor.tinta, fontWeight: 700 }}>{exp.termo}:</strong> {exp.texto}</p>
                  {g.ementa_detalhada && <p style={{ margin: '0 0 6px', fontSize: '0.82rem', color: t.cor.tinta, lineHeight: 1.45 }}>{g.ementa_detalhada}</p>}
                  {g.keywords && g.keywords.trim() && (
                    <p style={{ margin: '0 0 6px', fontSize: '0.8rem', color: t.cor.cinza, lineHeight: 1.5 }}>
                      <strong style={{ color: t.cor.tinta, fontWeight: 600 }}>Assuntos:</strong> {g.keywords.split(',').map((k) => k.trim()).filter(Boolean).slice(0, 8).join(' · ')}
                    </p>
                  )}
                  <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center', margin: '0 0 8px' }}>
                    {sitCidada && (
                      <span style={{ fontSize: '0.75rem', fontWeight: 700, padding: '3px 10px', borderRadius: '6px', background: virouLei ? '#E7F3EC' : t.cor.papelQuente2, color: virouLei ? t.cor.sim : t.cor.tinta }}>Situação: {sitCidada}</span>
                    )}
                    {urgencia && <span style={{ fontSize: '0.75rem', color: t.cor.ouroTexto, fontWeight: 700 }}>⚡ Tramitou em urgência</span>}
                    {g.autor_nome && <span style={{ fontSize: '0.78rem', color: t.cor.cinza }}>Proposta por <strong style={{ fontWeight: 600, color: t.cor.tinta }}>{g.autor_nome}</strong></span>}
                    {g.url_inteiro_teor && <a href={g.url_inteiro_teor} target="_blank" rel="noopener noreferrer" style={{ fontSize: '0.76rem', color: t.cor.ouroTexto, fontWeight: 700, textDecoration: 'underline dotted' }}>texto completo →</a>}
                  </div>

                  {/* Linha do tempo do processo */}
                  <div style={{ marginTop: '10px', borderTop: `1px solid ${t.cor.papelQuente2}`, paddingTop: '10px', display: 'grid', gap: '4px' }}>
                    {g.votacoes.map((v, i) => {
                      const h = hv(v);
                      const papel = papelVotacao(v.descricao);
                      const aprov = h.status === 'Aprovado';
                      return (
                        <Link key={i} href={`/votacao/${v.votacao_id_externa}`} style={{ textDecoration: 'none', color: 'inherit', display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 10px', borderRadius: t.raio.sm, background: t.cor.papelQuente, transition: 'background .12s' }}
                          onMouseOver={(e) => { e.currentTarget.style.background = t.cor.papelQuente2; }}
                          onMouseOut={(e) => { e.currentTarget.style.background = t.cor.papelQuente; }}>
                          <span style={{ flexShrink: 0, width: '8px', height: '8px', borderRadius: '50%', background: h.status ? (aprov ? t.cor.sim : t.cor.nao) : t.cor.cinza }} />
                          <span style={{ flexShrink: 0, fontSize: '0.8rem', fontWeight: 700, color: t.cor.tinta, minWidth: '96px' }}>{papel}</span>
                          <span style={{ flex: 1, minWidth: 0, fontSize: '0.8rem', color: h.status ? (aprov ? t.cor.sim : t.cor.nao) : t.cor.cinza, fontWeight: 600 }}>
                            {h.status || '—'}{h.sim != null ? ` · ${h.sim}×${h.nao}` : ''}
                          </span>
                          <span style={{ flexShrink: 0, fontSize: '0.74rem', color: t.cor.cinza }}>{dataBR(v.data_voto)}</span>
                          <span style={{ flexShrink: 0, fontSize: '0.74rem', fontWeight: 700, color: t.cor.ouroTexto }}>quem votou →</span>
                        </Link>
                      );
                    })}
                  </div>
                </div>
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
