import { useState } from 'react';
import Link from 'next/link';
import { t } from '../src/estilo/tokens';

// Topo do Entenda (23/10/2026, estrutura aprovada pelo Jordy): busca, duas trilhas de peso
// igual (Escolher / Cobrar) e lista de temas. Só temas que existem viram link; o que ainda
// não existe aparece como "Em breve", sem link, para não prometer página que não há.
// Regra do Jordy: nada de travessão no texto do site.
const TEMAS = [
  { id: 'cargos', trilha: 'escolher', titulo: 'O que faz cada cargo', desc: 'Vereador, deputado estadual, deputado federal e senador, sem juridiquês.', href: '#cargos' },
  { id: 'senado', trilha: 'escolher', titulo: 'Como o Senado se compõe', desc: 'Oito anos de mandato, renovação alternada e os dois votos de 2026.', href: '#senado' },
  { id: 'esq-dir', trilha: 'escolher', titulo: 'Esquerda e direita', desc: 'De onde vêm os termos e o que os dados mostram sobre os brasileiros.', href: null },
  { id: 'cota', trilha: 'cobrar', titulo: 'Cota parlamentar', desc: 'Quanto eles podem gastar, os tetos por tipo de gasto e a fonte oficial.', href: '#cotas' },
  { id: 'dados', trilha: 'cobrar', titulo: 'Como atualizamos os dados', desc: 'De onde vem cada informação do site e com que frequência ela é conferida.', href: '/entenda/atualizacao' },
];

const TRILHAS = [
  { chave: 'escolher', num: '1', titulo: 'Escolher meus representantes', texto: 'Antes do voto: o que cada cargo faz, como funciona a eleição e como os brasileiros se posicionam.', fundo: t.cor.verde, ancora: '#cargos' },
  { chave: 'cobrar', num: '2', titulo: 'Acompanhar e cobrar', texto: 'Depois do voto: quanto eles podem gastar, como votam e de onde vêm os dados.', fundo: t.cor.verdeEscuro, ancora: '#cotas' },
];

const semAcento = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

export default function EntendaTopo() {
  const [q, setQ] = useState('');
  const termo = semAcento(q.trim());
  const lista = termo ? TEMAS.filter((x) => semAcento(`${x.titulo} ${x.desc}`).includes(termo)) : TEMAS;
  const selo = (tr) => (tr === 'escolher' ? 'Escolher' : 'Cobrar');

  return (
    <section aria-labelledby="entenda-titulo" style={{ marginBottom: '40px' }}>
      <h1 id="entenda-titulo" style={{ fontFamily: t.fonte.titulo, fontWeight: 600, fontSize: 'clamp(1.8rem,4.5vw,2.6rem)', lineHeight: 1.15, margin: '0 0 10px' }}>Entenda para escolher e fiscalizar</h1>
      <p style={{ color: t.cor.cinza, fontSize: '1.05rem', maxWidth: '680px', margin: '0 0 18px' }}>
        Explicações curtas, em linguagem simples, com a fonte oficial sempre à mão.
      </p>

      <label htmlFor="entenda-busca" style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)' }}>Buscar um tema</label>
      <input
        id="entenda-busca"
        type="search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Buscar um tema"
        style={{ width: '100%', maxWidth: '560px', boxSizing: 'border-box', padding: '12px 20px', fontSize: '1rem', fontFamily: t.fonte.corpo, color: t.cor.tinta, background: t.cor.papelCartao, border: 'none', borderRadius: t.raio.pill, boxShadow: t.sombra.clicavel, outline: 'none' }}
        onFocus={(e) => { e.target.style.boxShadow = t.sombra.anelFoco; }}
        onBlur={(e) => { e.target.style.boxShadow = t.sombra.clicavel; }}
      />

      {!termo && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(300px, 100%), 1fr))', gap: '14px', margin: '22px 0' }}>
          {TRILHAS.map((tr) => (
            <div key={tr.chave} style={{ background: tr.fundo, color: '#fff', borderRadius: t.raio.md, padding: '20px 22px' }}>
              <h2 style={{ fontFamily: t.fonte.titulo, fontWeight: 600, fontSize: '1.3rem', margin: '0 0 6px' }}>{tr.num} · {tr.titulo}</h2>
              <p style={{ margin: '0 0 14px', fontSize: '0.95rem', lineHeight: 1.55, opacity: 0.9 }}>{tr.texto}</p>
              <a href={tr.ancora} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '8px 16px', fontSize: '0.85rem', fontWeight: 700, fontFamily: t.fonte.corpo, borderRadius: t.raio.pill, textDecoration: 'none', background: t.cor.ouro, color: t.cor.verdeEscuro, boxShadow: t.sombra.botao }}>
                Começar por aqui
              </a>
            </div>
          ))}
        </div>
      )}

      <h2 style={{ fontFamily: t.fonte.titulo, fontWeight: 600, fontSize: '1.3rem', margin: '0 0 12px' }}>{termo ? 'Resultados' : 'Todos os temas'}</h2>
      {lista.length === 0 ? (
        <p style={{ color: t.cor.cinza, margin: 0 }}>Nenhum tema encontrado para essa busca.</p>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(260px, 100%), 1fr))', gap: '12px' }}>
          {lista.map((x) => {
            const corpo = (
              <>
                <span style={{ display: 'inline-block', fontSize: '0.72rem', fontWeight: 700, color: t.cor.alertaTexto, background: t.cor.alertaBg, borderRadius: t.raio.pill, padding: '2px 10px', marginBottom: '8px' }}>{selo(x.trilha)}{x.href ? '' : ' · em breve'}</span>
                <h3 style={{ fontFamily: t.fonte.titulo, fontWeight: 600, fontSize: '1.1rem', margin: '0 0 4px', color: t.cor.tinta }}>{x.titulo}</h3>
                <p style={{ margin: 0, fontSize: '0.88rem', lineHeight: 1.5, color: t.cor.cinza }}>{x.desc}</p>
              </>
            );
            const estilo = { display: 'block', background: t.cor.papelCartao, borderRadius: t.raio.md, padding: '16px 18px', boxShadow: t.sombra.clicavel, textDecoration: 'none' };
            if (!x.href) return <div key={x.id} style={{ ...estilo, opacity: 0.7 }}>{corpo}</div>;
            return x.href.startsWith('#')
              ? <a key={x.id} href={x.href} style={estilo}>{corpo}</a>
              : <Link key={x.id} href={x.href} style={estilo}>{corpo}</Link>;
          })}
        </div>
      )}
    </section>
  );
}
