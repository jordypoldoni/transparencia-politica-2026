import { useState, useEffect } from 'react';
import Link from 'next/link';
import { t } from '../src/estilo/tokens';
import Avatar from './Avatar';
import Segmentado from './Segmentado';
import { Seta } from './icones';

// ELEIÇÕES NA HOME (12/10/2026, pedido do Jordy; refeito em 31/10/2026, D-101 e seguintes).
// Etapa 1 (31/10/2026): fundo quente que une o bloco e cartão do Presidente com as abas "1º turno | 2º turno".
// Desenho aprovado pelo Jordy: duelo em uma barra (cantos retos, pois não é clicável; só pílula é clicável), cada
// candidato com a mesma cor nas duas abas (1º colocado do 1º turno = âmbar, 2º = índigo), nome dentro da barra,
// manchete como título do cartão. Só fato e fonte: ordem por votos, sem rótulo de favorito.
// Os números vêm de /api/apuracao (cache de borda, nada no banco). Sem resultado do TSE, mostra `children`
// (a lista de candidatos de antes).
// Etapas seguintes (pendentes, cada uma com OK): seletor de estado e visão do estado, visão do visitante, busca de candidatos.
const fmt = (x) => Number(x || 0).toLocaleString('pt-BR');
const num = (p) => Number(String(p).replace(/\./g, '').replace(',', '.')) || 0;
const mesmo = (c, ch) => String(ch.nr_candidato) === String(c.numero);
const MINUSCULAS = new Set(['da', 'de', 'do', 'das', 'dos', 'e']);
const bonito = (n) => String(n || '').toLowerCase().split(' ').map((p, i) => (i > 0 && MINUSCULAS.has(p) ? p : p.charAt(0).toUpperCase() + p.slice(1))).join(' ');
const INDIGO = t.cor.verde; // índigo
const AMBAR = t.cor.ouro;
const pronto = (j) => (j && j.secoes && j.secoes.totalizadas > 0 && (j.candidatos || []).length >= 2 ? j : null);

function Lado({ c, chapa, cor, direita, pct, rodape }) {
  const slug = chapa?.presidente?.slug;
  const miolo = (
    <>
      <div style={{ borderRadius: '50%', boxShadow: `0 0 0 4px ${cor}`, flexShrink: 0, margin: 4 }}>
        <Avatar nome={c.nome} foto={chapa?.presidente?.foto_url} size={72} />
      </div>
      <div style={{ minWidth: 0 }}>
        <b className="elh-nome" style={{ display: 'block', fontSize: '1.05rem', color: t.cor.tinta }}>{c.nome}</b>
        <small style={{ display: 'block', color: t.cor.cinza, fontSize: '.82rem', marginTop: 2 }}>{c.partido} · {c.numero}</small>
        <span style={{ display: 'block', fontFamily: t.fonte.titulo, fontWeight: 600, fontSize: '2.6rem', lineHeight: 1, marginTop: 6, color: t.cor.tinta }}>{pct}%</span>
        <span style={{ display: 'block', color: t.cor.cinza, fontSize: '.8rem', marginTop: 4 }}>{rodape}</span>
      </div>
    </>
  );
  const estilo = { display: 'flex', alignItems: 'center', gap: 16, textDecoration: 'none', color: 'inherit', flexDirection: direita ? 'row-reverse' : 'row', textAlign: direita ? 'right' : 'left', minWidth: 0 };
  return slug
    ? <Link href={`/presidencial/${slug}`} className="elh-lado" style={estilo}>{miolo}</Link>
    : <div style={estilo}>{miolo}</div>;
}

export default function ResumoEleicoesHome({ chapas = [], children }) {
  const [d1, setD1] = useState(undefined); // undefined = carregando, null = sem resultado
  const [d2, setD2] = useState(undefined);
  const [aba, setAba] = useState(null);

  useEffect(() => {
    const ctrl = new AbortController();
    const buscar = (url) => fetch(url, { signal: ctrl.signal }).then((r) => (r.ok ? r.json() : null)).then(pronto);
    Promise.all([buscar('/api/apuracao?cargo=presidente'), buscar('/api/apuracao?cargo=presidente&turno=2').catch((e) => { if (e.name === 'AbortError') throw e; return null; })])
      .then(([a, b]) => { setD1(a); setD2(b); setAba(b ? 2 : 1); })
      .catch((e) => { if (e.name !== 'AbortError') { setD1(null); setD2(null); } });
    return () => ctrl.abort();
  }, []);

  if (d1 === undefined || d2 === undefined || (d1 && aba === null)) return <section style={{ padding: '8px 24px 16px', minHeight: 520 }} aria-busy="true" />;
  if (d1 === null) return children || null;

  const dados = aba === 2 && d2 ? d2 : d1;
  const turno = dados === d2 ? 2 : 1;
  // Cor de cada candidato, igual nas duas abas: 1º colocado do 1º turno em âmbar, 2º em índigo.
  const ordem1 = [...d1.candidatos].sort((a, b) => b.votos - a.votos);
  const finalistas1 = ordem1.filter((c) => c.segundoTurno);
  const dois1 = (finalistas1.length >= 2 ? finalistas1 : ordem1).slice(0, 2);
  const chave = (c) => `${c.numero}|${c.nome}`;
  const corDe = (c) => (chave(c) === chave(dois1[0]) ? AMBAR : INDIGO);
  const pct1De = (c) => (d1.candidatos.find((x) => chave(x) === chave(c)) || {}).pct;

  let dois;
  if (turno === 2) {
    dois = [...d2.candidatos].sort((a, b) => b.votos - a.votos).slice(0, 2);
  } else {
    dois = dois1;
  }
  const [a, b] = dois;
  const pa = num(a.pct);
  const pb = num(b.pct);
  const soma = pa + pb || 1;
  const larga = (pa / soma) * 100;
  const eleito = turno === 2 ? dois.find((c) => c.eleito) : null;
  const completo = Number(dados.secoes.totalizadas) >= Number(dados.secoes.total);
  const haSegundoTurno = finalistas1.length >= 2;

  let titulo;
  if (turno === 2) titulo = eleito ? `${bonito(eleito.nome)} é eleito presidente` : (completo ? 'Resultado do 2º turno' : 'Apuração do 2º turno em andamento');
  else titulo = haSegundoTurno ? 'Dois candidatos foram ao 2º turno' : (completo ? 'Resultado do 1º turno' : 'Resultado parcial do 1º turno');
  const sem50 = turno === 1 && haSegundoTurno && Math.max(pa, pb) < 50;
  const esq = turno === 1 ? '' : (eleito ? `✓ Eleito: ${bonito(eleito.nome)}` : '');
  const nota = turno === 1 && sem50 ? 'Nenhum candidato passou de 50%' : esq;
  const dataTurno = turno === 2 ? '25 de outubro' : '4 de outubro';
  const chapaDe = (c) => chapas.find((ch) => mesmo(c, ch));
  const rodapeDe = (c) => (turno === 2 ? `${fmt(c.votos)} votos · 1º turno: ${pct1De(c)}%` : `${fmt(c.votos)} votos válidos`);
  // Barra: cada lado tem a cor do candidato; o texto escuro/claro segue o contraste da cor.
  const lado = (c, larg, direita) => {
    const cor = corDe(c);
    return <div style={{ width: `${larg}%`, background: cor, color: cor === AMBAR ? t.cor.tinta : '#fff', display: 'flex', alignItems: 'center', justifyContent: direita ? 'flex-end' : 'flex-start', padding: '0 14px', fontWeight: 800, fontSize: '.82rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}><span className="elh-nl">{c.nome}</span><span className="elh-nc">{String(c.nome).split(' ')[0]}</span></div>;
  };

  return (
    <section style={{ padding: '8px 24px 16px' }}>
      <div className="elh-fundo" style={{ background: t.cor.papelQuente2, borderRadius: t.raio.lg, padding: '22px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12, flexWrap: 'wrap' }}>
          <h2 style={{ fontFamily: t.fonte.titulo, fontWeight: 600, fontSize: '1.7rem', margin: '0 0 4px' }}>Eleições</h2>
          <Link href={`/eleicoes?visao=apuracao${turno === 2 ? '&turno=2' : ''}`} style={{ fontSize: '0.85rem', fontWeight: 700, color: t.cor.ouroTexto, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '5px' }}>Ver apuração completa <Seta direcao="direita" size={14} /></Link>
        </div>
        <p style={{ color: t.cor.cinza, fontSize: '0.92rem', margin: '0 0 16px' }}>
          {d2 ? 'Resumo do 1º turno (4 de outubro) e do 2º turno (25 de outubro)' : 'Resultado do 1º turno (4 de outubro)'}, com {dados.secoes.pct_totalizadas}% das seções apuradas.
        </p>

        <div style={{ background: t.cor.papelCartao, borderRadius: t.raio.lg, padding: '20px 24px', boxShadow: t.sombra.sutil }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap', marginBottom: 18 }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '.78rem', letterSpacing: '.06em', textTransform: 'uppercase', color: t.cor.cinza, fontFamily: t.fonte.corpo, fontWeight: 700 }}>Presidente · {turno}º turno</h3>
              <p style={{ fontFamily: t.fonte.titulo, fontWeight: 600, fontSize: '1.5rem', margin: '4px 0 0' }}>{titulo}</p>
            </div>
            {d2 && (
              <Segmentado aria="Turno da eleição presidencial" itens={[
                { rotulo: '1º turno', ativo: turno === 1, aoClicar: () => setAba(1) },
                { rotulo: '2º turno', ativo: turno === 2, aoClicar: () => setAba(2) },
              ]} />
            )}
          </div>

          <div className="elh-duelo" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
            <Lado c={a} chapa={chapaDe(a)} cor={corDe(a)} pct={a.pct} rodape={rodapeDe(a)} />
            <Lado c={b} chapa={chapaDe(b)} cor={corDe(b)} pct={b.pct} rodape={rodapeDe(b)} direita />
          </div>

          <div role="img" aria-label={`${a.nome} ${a.pct}%, ${b.nome} ${b.pct}%`} style={{ display: 'flex', height: 30, borderRadius: 7, overflow: 'hidden', margin: '18px 0 6px', position: 'relative' }}>
            {lado(a, larga, false)}
            {lado(b, 100 - larga, true)}
            {turno === 2 && <span aria-hidden="true" style={{ position: 'absolute', left: '50%', top: 0, bottom: 0, width: 2, background: t.cor.tinta }} />}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', fontSize: '.8rem', color: t.cor.cinza }}>
            <span style={{ color: nota.startsWith('✓') ? t.cor.sim : undefined, fontWeight: nota.startsWith('✓') ? 800 : 400 }}>{nota}</span>
            <span>{turno}º turno · {dataTurno} · Fonte: <a href="https://resultados.tse.jus.br/" target="_blank" rel="noopener noreferrer" style={{ color: 'inherit' }}>TSE</a></span>
          </div>
        </div>

        <p style={{ margin: '14px 2px 0', fontSize: '.86rem' }}>
          <Link href="/eleicoes" style={{ color: t.cor.ouroTexto, fontWeight: 700, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '5px' }}>Ver todos os candidatos <Seta direcao="direita" size={14} /></Link>
        </p>
      </div>
      <style jsx global>{`
        .elh-lado:hover .elh-nome { text-decoration: underline; }
        .elh-nc { display: none; }
        @media (max-width: 640px) {
          .elh-nl { display: none; }
          .elh-nc { display: inline; }
          .elh-fundo { padding: 16px !important; }
          .elh-duelo { grid-template-columns: 1fr !important; gap: 14px !important; }
          .elh-duelo > * { flex-direction: row !important; text-align: left !important; }
        }
      `}</style>
    </section>
  );
}
