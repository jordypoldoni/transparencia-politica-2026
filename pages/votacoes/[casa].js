// /votacoes/[casa] — a lista de UMA casa. (19/09/2026)
//
// Nasceu da quebra da /votacoes, que misturava Câmara, Senado e Assembleia do RS numa lista só
// de 1.054 cartões, sem dizer de qual casa era cada um. Aqui a casa é a própria página: não
// precisa de selo em cada cartão, e o leitor sabe onde está pelo título.
//
// DUAS CORREÇÕES DE PADRÃO QUE VIERAM JUNTO:
//
//  1. "Todas / Aprovadas / Rejeitadas" viraram SEGMENTED CONTROL. Eram três pílulas soltas com
//     sombra, e as Diretrizes de Design fixaram em 12/09/2026 que escolha entre opções
//     excludentes vai num TRILHO, com sombra só na opção ativa: pílula solta não comunica que
//     escolher uma desliga as outras.
//
//  2. A lista carrega de 20 em 20, em vez de tudo. Mesmo princípio dos rankings de 11/09
//     (expandir de 10 em 10 em vez de embutir 50 no payload), e o motivo aqui foi medido:
//     a /votacoes antiga renderizava 1.054 cartões de uma vez, cada um com linha do tempo.

import { useState, useMemo } from 'react';
import Link from 'next/link';
import Head from 'next/head';
import ServicoAPI from '../../src/servicos/servico_api';
import { humanizarVotacao, explicarTipo, agruparPorMateria, papelVotacao, situacaoCidada } from '../../src/lib/votacao';
import { CASAS_VOTACAO, casaVotacaoPorChave } from '../../src/lib/casa';
import CampoBusca from '../../components/CampoBusca';
import CampoSelect from '../../components/CampoSelect';
import { t } from '../../src/estilo/tokens';

const POR_PAGINA = 20;

const hv = (v) => humanizarVotacao({ descricao_votacao: v.descricao, aprovacao: v.aprovacao });
const dataBR = (d) => (d ? new Date(d).toLocaleDateString('pt-BR') : '');

function statusGrupo(g) {
  const principais = g.votacoes.filter((v) => /texto principal|reda/i.test(papelVotacao(v.descricao)));
  const alvo = principais[principais.length - 1] || g.votacoes[g.votacoes.length - 1];
  return alvo ? hv(alvo).status : null;
}

const badgeStatus = (status) => ({
  fontSize: '0.72rem', fontWeight: 800, padding: '4px 10px', borderRadius: '6px',
  textTransform: 'uppercase', letterSpacing: '0.03em',
  background: status ? (status === 'Aprovado' ? '#E7F3EC' : '#FBEAE7') : '#EEEDE8',
  color: status ? (status === 'Aprovado' ? t.cor.sim : t.cor.nao) : t.cor.cinza,
});

// SEGMENTED CONTROL. O trilho é uma superfície recuada; só a pastilha ativa tem sombra, que é
// a exceção explícita à regra "todo botão com sombra": dentro de um trilho, sombra em tudo
// vira ruído e apaga qual está escolhida.
const trilho = {
  display: 'inline-flex', gap: '2px', padding: '3px',
  background: t.cor.papelQuente2, borderRadius: t.raio.pill,
};
const pastilha = (ativo) => ({
  padding: '7px 16px', fontSize: '0.84rem', fontWeight: 700, fontFamily: t.fonte.corpo,
  borderRadius: t.raio.pill, cursor: 'pointer', border: 'none',
  background: ativo ? t.cor.papelCartao : 'transparent',
  color: ativo ? t.cor.tinta : t.cor.cinza,
  boxShadow: ativo ? t.sombra.clicavel : 'none',
  transition: 'background .15s',
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

export default function VotacoesDaCasa({ casa, votacoes, temas = [] }) {
  const [busca, setBusca] = useState('');
  const [filtro, setFiltro] = useState('todas');
  const [periodo, setPeriodo] = useState('');
  const [tema, setTema] = useState('');
  const [mostrando, setMostrando] = useState(POR_PAGINA);

  const kwsTema = useMemo(() => {
    const m = {};
    for (const c of temas) m[c.nome_categoria] = (c.palavras_chave || []).map((k) => String(k).toLowerCase());
    return m;
  }, [temas]);

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

  // Mexeu em qualquer filtro, a paginação volta ao começo: senão a pessoa filtra, a lista
  // encolhe para 8 resultados e o botão "ver mais" continua na tela sem nada para mostrar.
  const aoFiltrar = (setter) => (valor) => { setter(valor); setMostrando(POR_PAGINA); };

  const visiveis = grupos.slice(0, mostrando);
  const temFiltro = busca || periodo || tema || filtro !== 'todas';

  return (
    <>
      <Head>
        <title>{`Votações: ${casa.nome} | Lume`}</title>
        <meta name="description" content={`${votacoes.length} votações em plenário ${casa.chave === 'rs' ? 'da' : casa.chave === 'senado' ? 'do' : 'da'} ${casa.nome}, com o resultado e quem votou.`} />
      </Head>

      <div className="pagina">
        <Link href="/votacoes" style={{ fontSize: '0.82rem', fontWeight: 700, color: t.cor.ouroTexto, textDecoration: 'none' }}>
          ← todas as casas
        </Link>

        <h1 style={{ fontFamily: t.fonte.titulo, fontWeight: 600, fontSize: 'clamp(1.5rem,4vw,2.1rem)', margin: '8px 0 6px' }}>
          Votações {casa.chave === 'senado' ? 'do' : 'da'} {casa.nome}
        </h1>
        <p style={{ color: t.cor.cinza, margin: '0 0 20px', maxWidth: '680px', lineHeight: 1.5 }}>
          Cada matéria reúne <strong>todas as votações do seu processo</strong> (urgência, destaques,
          texto, redação final) em ordem. Busque por assunto, pela proposta (ex.: "PEC 6") ou por
          quem propôs.
        </p>

        <div style={{ marginBottom: '12px' }}>
          <CampoBusca valor={busca} aoMudar={aoFiltrar(setBusca)} placeholder="Buscar por assunto, proposta ou autor… (ex.: saúde, imposto, PEC 45)" aoLabel="Buscar votações" />
        </div>

        <div style={{ display: 'flex', gap: '10px', marginBottom: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ flex: '0 1 200px', minWidth: '160px' }}>
            <CampoSelect opcoes={PERIODOS} valor={periodo} aoSelecionar={aoFiltrar(setPeriodo)} placeholder="Qualquer período" aoLabel="Filtrar por período" buscavel={false} />
          </div>
          {temas.length > 0 && (
            <div style={{ flex: '0 1 220px', minWidth: '170px' }}>
              <CampoSelect
                opcoes={[{ valor: '', rotulo: 'Qualquer tema' }, ...temas.map((c) => ({ valor: c.nome_categoria, rotulo: c.nome_categoria }))]}
                valor={tema} aoSelecionar={aoFiltrar(setTema)} placeholder="Qualquer tema" aoLabel="Filtrar por tema" buscavel={false}
              />
            </div>
          )}
          <div style={trilho} role="group" aria-label="Filtrar por resultado">
            <button onClick={() => aoFiltrar(setFiltro)('todas')} style={pastilha(filtro === 'todas')} aria-pressed={filtro === 'todas'}>Todas</button>
            <button onClick={() => aoFiltrar(setFiltro)('aprovadas')} style={pastilha(filtro === 'aprovadas')} aria-pressed={filtro === 'aprovadas'}>Aprovadas</button>
            <button onClick={() => aoFiltrar(setFiltro)('rejeitadas')} style={pastilha(filtro === 'rejeitadas')} aria-pressed={filtro === 'rejeitadas'}>Rejeitadas</button>
          </div>
        </div>

        {/* O número que descreve o conjunto não é controle: fica no cabeçalho da lista, não no
            meio dos botões (Diretrizes de Design). */}
        <p style={{ margin: '0 0 6px', fontSize: '0.85rem', color: t.cor.cinza }}>
          {grupos.length.toLocaleString('pt-BR')} matéria{grupos.length === 1 ? '' : 's'}
          {grupos.length > mostrando ? `, mostrando ${mostrando}` : ''}
        </p>

        {votacoes.length === 0 ? (
          <p style={{ color: t.cor.cinza }}>Ainda não há votações coletadas nesta casa.</p>
        ) : grupos.length === 0 ? (
          <p style={{ color: t.cor.cinza }}>Nenhuma matéria encontrada{temFiltro ? ' com esses filtros' : ''}. Tente afrouxar a busca, o tema ou o período.</p>
        ) : (
          <div style={{ display: 'grid', gap: '14px' }}>
            <p style={{ margin: 0, fontSize: '0.82rem', lineHeight: 1.5, color: t.cor.cinza }}>
              Quando existe, o título abaixo é um resumo em linguagem comum escrito por
              inteligência artificial a partir da ementa oficial. Onde ele ainda não existe,
              aparece a ementa oficial. A ementa na íntegra está na página de cada votação.
            </p>

            {visiveis.map((g) => {
              const status = statusGrupo(g);
              const exp = explicarTipo(`${g.titulo || ''} ${g.ementa || ''}`, casa);
              const varias = g.votacoes.length > 1;
              const urgencia = /urg[êe]ncia/i.test(g.regime || '') || g.votacoes.some((v) => /urg[êe]ncia/i.test(papelVotacao(v.descricao)));
              const sitCidada = situacaoCidada(g.situacao);
              const virouLei = /virou lei/i.test(sitCidada || '');
              const inicio = dataBR(g.votacoes[0]?.data_voto);
              const fim = dataBR(g.votacoes[g.votacoes.length - 1]?.data_voto);
              const periodoTxt = inicio === fim ? fim : `${inicio} a ${fim}`;
              const tituloExib = g.explicacao_cidada || g.ementa || g.votacoes[0]?.descricao || 'Votação';
              return (
                <div key={g.chave} style={{ background: t.cor.papelCartao, borderRadius: t.raio.md, padding: '18px 20px', boxShadow: t.sombra.sutil }}>
                  <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '8px', flexWrap: 'wrap' }}>
                    <span style={badgeStatus(status)}>{status || 'Sem resultado'}</span>
                    {g.titulo && <span style={{ fontSize: '0.72rem', fontWeight: 700, color: t.cor.tinta, background: t.cor.papelQuente2, padding: '3px 8px', borderRadius: '6px' }}>{g.titulo}</span>}
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

                  <div style={{ marginTop: '10px', borderTop: `1px solid ${t.cor.papelQuente2}`, paddingTop: '10px', display: 'grid', gap: '4px' }}>
                    {g.votacoes.map((v, i) => {
                      const h = hv(v);
                      const papel = papelVotacao(v.descricao);
                      const aprov = h.status === 'Aprovado';
                      return (
                        <Link key={i} href={`/votacao/${v.votacao_id_externa}`} className="etapa-linha" style={{ textDecoration: 'none', color: 'inherit', padding: '8px 10px', borderRadius: t.raio.sm, background: t.cor.papelQuente, transition: 'background .12s' }}
                          onMouseOver={(e) => { e.currentTarget.style.background = t.cor.papelQuente2; }}
                          onMouseOut={(e) => { e.currentTarget.style.background = t.cor.papelQuente; }}>
                          <span style={{ flexShrink: 0, width: '8px', height: '8px', borderRadius: '50%', background: h.status ? (aprov ? t.cor.sim : t.cor.nao) : t.cor.cinza }} />
                          <span style={{ flexShrink: 0, fontSize: '0.8rem', fontWeight: 700, color: t.cor.tinta, minWidth: '96px' }} className="etapa-papel">{papel}</span>
                          <span style={{ flex: 1, minWidth: 0, fontSize: '0.8rem', color: h.status ? (aprov ? t.cor.sim : t.cor.nao) : t.cor.cinza, fontWeight: 600 }}>
                            {h.status || 'Sem resultado'}{h.sim != null ? ` · ${h.sim}×${h.nao}` : ''}
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

            {grupos.length > mostrando && (
              <button
                onClick={() => setMostrando((m) => m + POR_PAGINA)}
                style={{
                  justifySelf: 'center', marginTop: '6px',
                  padding: '11px 26px', borderRadius: t.raio.pill, border: 'none',
                  background: t.cor.verde, color: t.cor.ouro,
                  fontSize: '0.88rem', fontWeight: 700, fontFamily: t.fonte.corpo,
                  cursor: 'pointer', boxShadow: t.sombra.clicavel,
                }}
              >
                Ver mais {Math.min(POR_PAGINA, grupos.length - mostrando)} de {(grupos.length - mostrando).toLocaleString('pt-BR')}
              </button>
            )}
          </div>
        )}
      </div>
    </>
  );
}

export async function getServerSideProps({ params }) {
  const casa = casaVotacaoPorChave(String(params.casa || '').toLowerCase());
  if (!casa) return { notFound: true };

  let votacoes = [], temas = [];
  try {
    [votacoes, temas] = await Promise.all([
      ServicoAPI.listarVotacoesDaCasa(casa.chave),
      ServicoAPI.listarTemas(),
    ]);
  } catch (e) { console.error(`VotacoesDaCasa(${casa.chave}):`, e.message); }

  return {
    props: {
      casa,
      votacoes: JSON.parse(JSON.stringify(votacoes)),
      temas: JSON.parse(JSON.stringify(temas)),
    },
  };
}
