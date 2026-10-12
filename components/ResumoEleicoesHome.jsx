import { useState, useEffect } from 'react';
import Link from 'next/link';
import { t } from '../src/estilo/tokens';
import Avatar from './Avatar';
import { Seta } from './icones';

// RESUMO DAS ELEIÇÕES NA HOME (12/10/2026, pedido do Jordy): depois do 1º turno, a home mostra o resultado em vez da
// lista de candidatos. Fase pelo que o TSE marca no arquivo: quem tem situação "2º turno" são os finalistas; sem essa
// marca (apuração em andamento ou nada publicado), mostra os dois mais votados como parcial, ou a lista de candidatos
// de antes (`children`) se o TSE ainda não publicou nada. Os números vêm de /api/apuracao (cache de borda, nada no banco).
// Só fato e fonte: ordem por votos, sem rótulo de favorito. Depois de 25/10 este bloco passa a ler o 2º turno (pendente).
const fmt = (x) => Number(x || 0).toLocaleString('pt-BR');
const mesmo = (c, ch) => String(ch.nr_candidato) === String(c.numero);

function Finalista({ c, chapa, larg }) {
  const conteudo = (
    <>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <Avatar nome={c.nome} foto={chapa?.presidente?.foto_url} size={64} />
        <div style={{ minWidth: 0 }}>
          <p style={{ margin: 0, fontWeight: 800, fontSize: '1.05rem' }}>{c.nome}</p>
          <p style={{ margin: '2px 0 0', color: t.cor.cinza, fontSize: '.84rem' }}>{c.partido} · {c.numero}</p>
        </div>
      </div>
      <p style={{ margin: '18px 0 2px', fontFamily: t.fonte.titulo, fontWeight: 600, fontSize: '2.4rem', lineHeight: 1 }}>{c.pct}%</p>
      <p style={{ margin: 0, color: t.cor.cinza, fontSize: '.86rem' }}>{fmt(c.votos)} votos válidos</p>
      <span style={{ display: 'block', height: 8, borderRadius: 99, background: t.cor.papelQuente2, marginTop: 14 }}>
        <span style={{ display: 'block', height: 8, borderRadius: 99, width: `${larg}%`, background: t.cor.verde }} />
      </span>
    </>
  );
  const estilo = { textDecoration: 'none', color: 'inherit', display: 'block', background: t.cor.papelCartao, borderRadius: t.raio.lg, padding: '20px', boxShadow: t.sombra.clicavel };
  return chapa?.presidente?.slug
    ? <Link href={`/presidencial/${chapa.presidente.slug}`} style={estilo}>{conteudo}</Link>
    : <div style={estilo}>{conteudo}</div>;
}

const Numero = ({ r, v }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12, padding: '9px 0', boxShadow: `inset 0 -1px 0 ${t.cor.papelQuente2}` }}>
    <span style={{ color: t.cor.cinza, fontSize: '.9rem' }}>{r}</span>
    <b style={{ fontSize: '1.02rem' }}>{v}%</b>
  </div>
);

export default function ResumoEleicoesHome({ chapas = [], children }) {
  const [dados, setDados] = useState(undefined); // undefined = carregando, null = sem resultado

  useEffect(() => {
    const ctrl = new AbortController();
    fetch('/api/apuracao?cargo=presidente', { signal: ctrl.signal })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => setDados(j && j.secoes && j.secoes.totalizadas > 0 && (j.candidatos || []).length >= 2 ? j : null))
      .catch((e) => { if (e.name !== 'AbortError') setDados(null); });
    return () => ctrl.abort();
  }, []);

  if (dados === undefined) return <section style={{ padding: '8px 24px 16px', minHeight: 330 }} aria-busy="true" />;
  if (dados === null) return children || null;

  const ordem = [...dados.candidatos].sort((a, b) => b.votos - a.votos);
  const finalistas = ordem.filter((c) => c.segundoTurno);
  const dois = (finalistas.length >= 2 ? finalistas : ordem).slice(0, 2);
  const totalmente = Number(dados.secoes.totalizadas) >= Number(dados.secoes.total);
  const linha = finalistas.length >= 2
    ? `Dois candidatos à Presidência avançaram ao 2º turno, em 25 de outubro. Resultado do 1º turno (4 de outubro), com ${dados.secoes.pct_totalizadas}% das seções apuradas.`
    : `Resultado ${totalmente ? 'do' : 'parcial do'} 1º turno para Presidente, com ${dados.secoes.pct_totalizadas}% das seções apuradas.`;
  const maior = Math.max(...dois.map((c) => Number(String(c.pct).replace(/\./g, '').replace(',', '.')) || 0), 1);

  return (
    <section style={{ padding: '8px 24px 16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '12px', flexWrap: 'wrap' }}>
        <h2 style={{ fontFamily: t.fonte.titulo, fontWeight: 600, fontSize: '1.7rem', margin: '0 0 4px' }}>Eleições 2026</h2>
        <Link href="/candidatos-2026?visao=apuracao" style={{ fontSize: '0.85rem', fontWeight: 700, color: t.cor.ouroTexto, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '5px' }}>Ver apuração completa <Seta direcao="direita" size={14} /></Link>
      </div>
      <p style={{ color: t.cor.cinza, fontSize: '0.92rem', margin: '0 0 16px' }}>{linha}</p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(260px, 100%), 1fr))', gap: 12, alignItems: 'stretch' }}>
        {dois.map((c) => {
          const p = Number(String(c.pct).replace(/\./g, '').replace(',', '.')) || 0;
          return <Finalista key={`${c.numero}|${c.nome}`} c={c} chapa={chapas.find((ch) => mesmo(c, ch))} larg={Math.min(100, p)} />;
        })}
        <div style={{ background: t.cor.papelCartao, borderRadius: t.raio.lg, padding: '16px 20px', boxShadow: t.sombra.sutil, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <Numero r="Comparecimento" v={dados.eleitorado.pct_comparecimento} />
          <Numero r="Abstenção" v={dados.eleitorado.pct_abstencao} />
          <Numero r="Votos em branco" v={dados.votos.pct_brancos} />
          <Numero r="Votos nulos" v={dados.votos.pct_nulos} />
          <p style={{ margin: '10px 0 0', color: t.cor.cinza, fontSize: '.78rem' }}>Fonte: <a href="https://resultados.tse.jus.br/" target="_blank" rel="noopener noreferrer" style={{ color: 'inherit' }}>TSE</a></p>
        </div>
      </div>
      <p style={{ margin: '12px 0 0', fontSize: '.86rem' }}>
        <Link href="/candidatos-2026" style={{ color: t.cor.ouroTexto, fontWeight: 700, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '5px' }}>Ver todos os candidatos <Seta direcao="direita" size={14} /></Link>
      </p>
    </section>
  );
}
