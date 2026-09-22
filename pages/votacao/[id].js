import { useState, useMemo } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Head from 'next/head';
import ServicoAPI from '../../src/servicos/servico_api';
import { humanizarVotacao, explicarTipo } from '../../src/lib/votacao';
import { casaDaVotacao } from '../../src/lib/casa';
import Termo from '../../components/Termo';
import CampoBusca from '../../components/CampoBusca';
import { t } from '../../src/estilo/tokens';
import BotaoVoltar from '../../components/BotaoVoltar';

const ORDEM = ['Sim', 'Não', 'Abstenção', 'Obstrução'];
const corVoto = (tp) => {
  const x = (tp || '').toLowerCase();
  if (x === 'sim') return t.cor.sim;
  if (x === 'não' || x === 'nao') return t.cor.nao;
  if (x === 'obstrução') return t.cor.alertaTexto;
  return t.cor.cinza;
};
const rotuloVoto = (tp) => (tp === 'Sim' ? 'A favor' : tp === 'Não' ? 'Contra' : tp);
// Rótulo de camada dentro do cartão escuro. Existe em três lugares agora (resumo, ementa
// oficial, tipo de votação), então vira estilo único em vez de três cópias que divergem.
// Âmbar sobre a caixa translúcida: 4,80:1, passa AA.
const rotulo = { margin: 0, fontSize: '0.7rem', fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase', color: t.cor.ouro };
const pilula = { display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '10px 18px', fontSize: '0.9rem', fontWeight: 700, fontFamily: t.fonte.corpo, borderRadius: t.raio.pill, cursor: 'pointer', textDecoration: 'none', border: 'none', background: '#fff', color: t.cor.tinta, boxShadow: t.sombra.clicavel };

export default function Votacao({ meta, votos }) {
  const router = useRouter();
  const [busca, setBusca] = useState('');
  const [abertos, setAbertos] = useState({});
  const [verMais, setVerMais] = useState(false);

  const h = humanizarVotacao(meta);
  // A casa entra na explicacao do tipo: sem ela, uma votacao da Assembleia do RS era
  // descrita como decisao do plenario da Camara. Ver a nota em src/lib/votacao.js.
  const casaDesta = casaDaVotacao(meta);
  const explicacao = explicarTipo(`${meta.descricao_votacao || ''} ${meta.proposicao_titulo || ''}`, casaDesta);
  const aprovado = h.status === 'Aprovado';
  const assunto = meta.ementa || h.limpo || meta.descricao_votacao;

  // CAMADA ZERO (14/09/2026). Até aqui o <h1> era a ementa jurídica, ou seja o texto MAIS
  // DIFÍCIL da tela aparecia no MAIOR tamanho dela, e o leitor comum desistia antes de chegar
  // na explicação que já existia mais abaixo. Agora o resumo em português comum assume o
  // destaque e a ementa desce um nível, com rótulo próprio.
  //
  // NADA FOI REMOVIDO: a ementa oficial continua na tela, sem clique, logo abaixo do resumo.
  // Os dois ficam rotulados justamente para que nenhum se passe pelo outro, que foi a
  // preocupação do Jordy ao decidir isto: um resumo escrito por IA não pode ser confundido
  // com a palavra do documento.
  //
  // Enquanto o lote não termina, boa parte das votações ainda não tem resumo. Sem resumo a
  // tela volta a ser exatamente a de antes (a ementa vira o título), sem buraco nem "em breve".
  const resumo = meta.explicacao_cidada || null;
  const titulo = resumo || assunto;
  const temContexto = !!meta.contexto_extra;

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
      <Head><title>{`${(assunto || 'Votação').slice(0, 70)}: como votaram | Lume`}</title></Head>
      <div className="pagina">
        <BotaoVoltar />

        <div style={{ background: t.cor.verde, color: '#fff', borderRadius: t.raio.lg, padding: 'clamp(22px,4vw,36px)' }}>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.74rem', fontWeight: 800, padding: '4px 12px', borderRadius: '6px', background: h.status ? (aprovado ? '#E7F3EC' : '#FBEAE7') : '#EEEDE8', color: h.status ? (aprovado ? t.cor.sim : t.cor.nao) : t.cor.tinta, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{h.status || 'Sem resultado'}</span>
            {meta.proposicao_titulo && <span style={{ fontSize: '0.74rem', fontWeight: 700, padding: '4px 12px', borderRadius: '6px', background: 'rgba(255,255,255,0.14)' }}>{meta.proposicao_titulo}</span>}
            <span style={{ opacity: 0.8, fontSize: '0.85rem' }}>{meta.data_voto ? new Date(meta.data_voto).toLocaleDateString('pt-BR') : ''}</span>
          </div>

          {/* TÍTULO: o resumo em linguagem comum quando existe; a ementa quando ainda não. */}
          {resumo && <p style={rotulo}>Resumo em linguagem comum</p>}
          <h1 style={{ fontFamily: t.fonte.titulo, fontWeight: 600, fontSize: 'clamp(1.4rem,3.5vw,2rem)', lineHeight: 1.25, margin: resumo ? '6px 0 10px' : '0 0 10px' }}>{titulo}</h1>

          {/* O botão mora colado no texto que ele expande, não no fim do cartão. */}
          {temContexto && (
            <div style={{ margin: '0 0 16px' }}>
              <button
                onClick={() => setVerMais((v) => !v)}
                aria-expanded={verMais}
                aria-controls="contexto-votacao"
                onMouseOver={(e) => { e.currentTarget.style.boxShadow = t.sombra.hover; }}
                onMouseOut={(e) => { e.currentTarget.style.boxShadow = t.sombra.clicavel; }}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: '8px', minHeight: '44px',
                  padding: '10px 20px', borderRadius: t.raio.pill, border: 'none', cursor: 'pointer',
                  fontFamily: t.fonte.corpo, fontSize: '0.88rem', fontWeight: 700,
                  // Cartão escuro: índigo sobre índigo não existe. Inativo é branco translúcido,
                  // ativo é âmbar com texto índigo (6,43:1). Regra das Diretrizes de Design.
                  background: verMais ? t.cor.ouro : 'rgba(255,255,255,0.14)',
                  color: verMais ? t.cor.verde : '#fff',
                  boxShadow: t.sombra.clicavel,
                  transition: 'box-shadow .15s ease, background .15s ease',
                }}>
                {verMais ? 'Ocultar' : 'Quero entender melhor'}
                <span aria-hidden="true" style={{ fontSize: '0.7rem' }}>{verMais ? '▲' : '▼'}</span>
              </button>

              {verMais && (
                <div id="contexto-votacao" style={{ marginTop: '12px', background: 'rgba(255,255,255,0.1)', borderRadius: t.raio.md, padding: '16px 18px' }}>
                  <p style={{ margin: 0, fontSize: '1rem', lineHeight: 1.6 }}>{meta.contexto_extra}</p>
                  {/* PROCEDÊNCIA À VISTA (regra do Jordy: a limitação do dado aparece na tela,
                      não só no código). É aqui que explicacao_modelo e explicacao_gerada_em
                      deixam de ser peso morto no banco. */}
                  <p style={{ margin: '12px 0 0', fontSize: '0.78rem', lineHeight: 1.5, opacity: 0.72 }}>
                    {resumo ? 'Resumo e contexto escritos' : 'Contexto escrito'} por inteligência artificial
                    {meta.explicacao_modelo ? ` (modelo ${meta.explicacao_modelo})` : ''}
                    {meta.explicacao_gerada_em ? `, em ${new Date(meta.explicacao_gerada_em).toLocaleDateString('pt-BR')}` : ''}
                    , a partir da ementa oficial. Descrevem o que o texto faz, sem opinar sobre mérito.
                    {meta.url_inteiro_teor ? ' Em caso de dúvida, vale o documento.' : ''}
                  </p>
                </div>
              )}
            </div>
          )}

          {meta.autor_nome && (
            <p style={{ margin: '0 0 16px', opacity: 0.85, fontSize: '0.95rem' }}>Proposta por <strong>{meta.autor_nome}</strong>{meta.autor_tipo ? ` · ${meta.autor_tipo}` : ''}</p>
          )}

          {/* EMENTA OFICIAL: desceu de título para camada, mas continua visível sem clique.
              Só aparece separada quando o <h1> é o resumo, senão seria a mesma frase duas vezes. */}
          {resumo && meta.ementa && (
            <div style={{ background: 'rgba(255,255,255,0.1)', borderRadius: t.raio.md, padding: '16px 18px', marginBottom: '12px' }}>
              <p style={rotulo}>Ementa oficial</p>
              <p style={{ margin: '6px 0 0', fontSize: '0.95rem', lineHeight: 1.55, opacity: 0.92 }}>{meta.ementa}</p>
              {meta.url_inteiro_teor && (
                <a href={meta.url_inteiro_teor} target="_blank" rel="noopener noreferrer"
                   style={{ display: 'inline-block', marginTop: '10px', fontSize: '0.85rem', fontWeight: 700, color: t.cor.ouro }}>
                  Ler o documento na íntegra
                </a>
              )}
            </div>
          )}

          {/* Este bloco NÃO explica esta votação, explica o INSTRUMENTO (o que é um requerimento
              de urgência, uma PEC). O rótulo antigo dizia "o que isso significa" e prometia o
              específico entregando o genérico. Agora o rótulo diz o que ele é de verdade. */}
          <div style={{ background: 'rgba(255,255,255,0.1)', borderRadius: t.raio.md, padding: '16px 18px' }}>
            <p style={rotulo}>Que tipo de votação é esta</p>
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
                  <strong style={{ fontSize: '1rem' }}>{tp === 'Sim' || tp === 'Não' ? rotuloVoto(tp) : <Termo>{tp}</Termo>}</strong>
                  <span style={{ color: t.cor.cinza, fontSize: '0.9rem' }}>({doTipo.length})</span>
                </span>
                <span style={{ color: t.cor.cinza }}>{aberto ? '▲' : '▼'}</span>
              </button>
              {aberto && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(240px, 100%), 1fr))', gap: '6px', padding: '6px', background: t.cor.papelQuente }}>
                  {doTipo.map((v, i) => (
                    <Link key={i} href={v.slug ? `/${v.rota || 'deputado'}/${v.slug}` : '#'} style={{ textDecoration: 'none', color: 'inherit', padding: '10px 14px', background: '#fff', borderRadius: t.raio.sm, display: 'block' }}>
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
