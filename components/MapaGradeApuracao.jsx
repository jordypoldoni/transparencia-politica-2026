import { useState, useEffect, useRef } from 'react';
import { t } from '../src/estilo/tokens';
import { NOMES_UF } from '../src/lib/cotas';
import { REGIOES, ORDEM_REGIOES, REGIAO_DE } from '../src/lib/mapaRegioes';

// GRADE DE ESTADOS PARA O CELULAR (13/10/2026, D-032). O mapa de verdade (MapaBrasilApuracao) depende de hover e tem estados
// minúsculos (RN, PB, AL, SE, ES, RJ, DF), por isso fica só no computador. No celular cada estado é um quadrado do mesmo
// tamanho (44 px), na posição aproximada do mapa; tocar abre o resultado do estado logo abaixo. Mesmos dados do mapa
// (/api/apuracao-estados), mesma cor por REGIÃO (nunca partido), ordem só por votos. Não tem filtro por região nem
// "Ver no mapa": isso é só do computador por enquanto.
const GRADE = [
  '. RR . AP . . .',
  '. AM . PA MA CE RN',
  'AC . MT TO PI PE PB',
  '. RO . GO BA AL .',
  '. . MS DF MG SE .',
  '. . . SP RJ ES .',
  '. . . PR . . .',
  '. . . SC . . .',
  '. . . RS . . .',
].map((l) => l.split(' '));
const SEM_DADOS = '#D9D6CE';
const TEXTO_ESCURO = new Set(['NE', 'CO']); // fundo mais claro: sigla em tinta (contraste), nas outras em branco

const fmt = (x) => Number(x || 0).toLocaleString('pt-BR');
const numPct = (s) => { const v = Number(String(s ?? '0').replace(/\./g, '').replace(',', '.')); return Number.isFinite(v) ? v : 0; };
const chaveCand = (c) => `${c.numero}|${c.nome}`;
const TOPO = 5;

function PainelEstado({ uf, e }) {
  const [todos, setTodos] = useState(false);
  const reg = REGIOES[REGIAO_DE[uf]];
  const nome = NOMES_UF[uf] || uf;
  if (!e) {
    return (
      <div>
        <div className="mg-cab"><strong>{nome}</strong><span><i style={{ background: reg.cor }} />{reg.nome}</span></div>
        <p className="mg-mudo">O TSE ainda não publicou o resultado deste estado.</p>
      </div>
    );
  }
  const lista = todos ? e.candidatos : e.candidatos.slice(0, TOPO);
  return (
    <div>
      <div className="mg-cab"><strong>{nome}</strong><span><i style={{ background: reg.cor }} />{reg.nome}</span></div>
      <p className="mg-sub">Seções apuradas: <b>{fmt(e.secoes.totalizadas)}</b> de {fmt(e.secoes.total)} ({e.secoes.pct_totalizadas}%)</p>
      <ol className="mg-lista">
        {lista.map((c, i) => (
          <li key={chaveCand(c)}>
            <span className="mg-pos">{i + 1}º</span>
            <span className="mg-nome">
              <b>{c.nome}</b>{c.segundoTurno && <em>2º turno</em>}
              <small>{c.partido} · {fmt(c.votos)} votos</small>
            </span>
            <b className="mg-pct">{c.pct}%</b>
            <span className="mg-trilho"><span style={{ width: `${Math.max(0.6, numPct(c.pct))}%`, background: reg.cor }} /></span>
          </li>
        ))}
      </ol>
      {e.candidatos.length > TOPO && (
        <button type="button" className="mg-pilula" aria-expanded={todos} onClick={() => setTodos((v) => !v)}>
          {todos ? 'Ver só os 5 mais votados' : `Ver os ${e.candidatos.length} candidatos`}
        </button>
      )}
      <p className="mg-rodape">
        Brancos: <b>{fmt(e.votos.brancos)}</b> ({e.votos.pct_brancos}%) · Nulos: <b>{fmt(e.votos.nulos)}</b> ({e.votos.pct_nulos}%)
      </p>
      <p className="mg-rodape">Porcentagens sobre os votos válidos, como o TSE publica.</p>
    </div>
  );
}

export default function MapaGradeApuracao({ turno = 1 }) {
  const [dados, setDados] = useState(null);
  const [erro, setErro] = useState(null);
  const [sel, setSel] = useState(null);
  const painelRef = useRef(null);

  // Só busca no celular (até 640px, mesmo corte do `so-celular`): no computador quem aparece é o mapa de verdade e esta
  // grade fica escondida, então não vale gastar uma segunda busca. Girar o aparelho liga e desliga sozinho.
  const [celular, setCelular] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 640px)');
    const atualiza = () => setCelular(mq.matches);
    atualiza();
    mq.addEventListener('change', atualiza);
    return () => mq.removeEventListener('change', atualiza);
  }, []);

  useEffect(() => {
    if (!celular) return undefined;
    const ctrl = new AbortController();
    fetch(`/api/apuracao-estados${turno === 2 ? '?turno=2' : ''}`, { signal: ctrl.signal })
      .then(async (r) => {
        if (r.status === 404) throw new Error('nao_publicou');
        if (!r.ok) throw new Error('falhou');
        return r.json();
      })
      .then((j) => setDados(j))
      .catch((e) => { if (e.name !== 'AbortError') setErro(e.message === 'nao_publicou' ? 'nao_publicou' : 'falhou'); });
    return () => ctrl.abort();
  }, [turno, celular]);

  // O painel fica abaixo da grade: depois do toque, leva a tela até ele só se ele estiver fora da vista.
  const escolher = (uf) => {
    setSel(uf);
    setTimeout(() => {
      const el = painelRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      if (r.top > window.innerHeight * 0.6 || r.top < 0) {
        const reduz = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        el.scrollIntoView({ behavior: reduz ? 'auto' : 'smooth', block: 'start' });
      }
    }, 60);
  };

  if (erro) {
    return (
      <p style={{ color: t.cor.alertaTexto, lineHeight: 1.5 }}>
        {erro === 'nao_publicou'
          ? 'O TSE ainda não publicou o resultado por estado.'
          : 'Não foi possível carregar o resultado por estado agora.'}{' '}
        Você também pode consultar direto no{' '}
        <a href="https://resultados.tse.jus.br/" target="_blank" rel="noopener noreferrer" style={{ color: t.cor.ouroTexto, fontWeight: 700 }}>portal de resultados do TSE</a>.
      </p>
    );
  }
  if (!dados) return <p style={{ color: t.cor.cinza }}>Carregando o resultado dos 27 estados…</p>;

  return (
    <div className="mg-raiz">
      <ul className="mg-legenda" aria-label="Cores por região">
        {ORDEM_REGIOES.map((k) => <li key={k}><i style={{ background: REGIOES[k].cor }} />{REGIOES[k].nome}</li>)}
      </ul>
      <div className="mg-grade" role="group" aria-label="Estados do Brasil. Toque em um estado para ver o resultado de presidente nele.">
        {GRADE.map((linha, r) => linha.map((uf, c) => {
          if (uf === '.') return <i key={`${r}-${c}`} className="mg-vazio" aria-hidden="true" />;
          const regiao = REGIAO_DE[uf];
          const tem = !!dados.estados[uf];
          return (
            <button
              key={uf} type="button"
              className={`mg-tile${sel === uf ? ' mg-sel' : ''}${TEXTO_ESCURO.has(regiao) && tem ? ' mg-esc' : ''}`}
              style={{ background: tem ? REGIOES[regiao].cor : SEM_DADOS }}
              aria-pressed={sel === uf}
              aria-label={`${NOMES_UF[uf] || uf}, ${REGIOES[regiao].nome}${tem ? '' : ', sem resultado ainda'}`}
              onClick={() => escolher(uf)}
            >{uf}</button>
          );
        }))}
      </div>

      <section ref={painelRef} className="mg-painel" aria-live="polite" aria-label="Resultado do estado escolhido">
        {sel ? <PainelEstado key={sel} uf={sel} e={dados.estados[sel]} /> : (
          <div className="mg-vazio-painel">
            <svg width="40" height="40" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2a7 7 0 0 0-7 7c0 5 7 13 7 13s7-8 7-13a7 7 0 0 0-7-7zm0 9.5A2.5 2.5 0 1 1 12 6.5a2.5 2.5 0 0 1 0 5z" fill="#CC7A22" /></svg>
            <p><b>Toque em um estado</b><br />para ver quem foi mais votado nele.</p>
          </div>
        )}
      </section>

      <style jsx global>{`
        .mg-raiz { margin-top: 4px; }
        .mg-legenda { list-style: none; margin: 0 0 12px; padding: 0; display: flex; flex-wrap: wrap; gap: 4px 12px; font-size: 0.8rem; color: ${t.cor.tinta}; }
        .mg-legenda i, .mg-cab i { display: inline-block; width: 9px; height: 9px; border-radius: 50%; margin-right: 5px; vertical-align: 0; }
        .mg-grade { display: grid; grid-template-columns: repeat(7, minmax(0, 1fr)); gap: 5px; margin-bottom: 16px; }
        .mg-vazio { height: 44px; }
        .mg-tile { height: 44px; padding: 0; border: none; border-radius: 11px; color: #fff; font: inherit; font-size: 0.9rem; font-weight: 800; cursor: pointer; box-shadow: 0 1px 3px rgba(0,0,0,0.22); transition: transform 0.15s ease, box-shadow 0.15s ease; -webkit-tap-highlight-color: transparent; }
        .mg-tile.mg-esc { color: ${t.cor.tinta}; }
        .mg-tile:active { transform: scale(0.96); }
        .mg-tile:focus-visible { outline: none; box-shadow: ${t.sombra.anelFoco}, 0 1px 3px rgba(0,0,0,0.22); }
        .mg-tile.mg-sel { transform: scale(1.07); position: relative; z-index: 1; box-shadow: 0 0 0 3px ${t.cor.papel}, 0 0 0 5px ${t.cor.verde}, 0 6px 12px rgba(36,30,82,0.35); }
        .mg-painel { background: ${t.cor.papelCartao}; border-radius: ${t.raio.md}; box-shadow: ${t.sombra.sutil}; padding: 16px; scroll-margin-top: 12px; }
        .mg-vazio-painel { text-align: center; color: ${t.cor.cinza}; font-size: 0.92rem; padding: 8px 0; }
        .mg-vazio-painel p { margin: 6px 0 0; line-height: 1.45; }
        .mg-vazio-painel b { color: ${t.cor.tinta}; }
        .mg-cab { display: flex; justify-content: space-between; align-items: baseline; gap: 10px; }
        .mg-cab strong { font-family: ${t.fonte.titulo}; font-weight: 600; font-size: 1.2rem; }
        .mg-cab span { font-size: 0.8rem; color: ${t.cor.cinza}; white-space: nowrap; }
        .mg-sub { margin: 6px 0 12px; font-size: 0.84rem; color: ${t.cor.tinta}; }
        .mg-mudo { margin: 8px 0 0; color: ${t.cor.cinza}; }
        .mg-lista { list-style: none; margin: 0; padding: 0; display: grid; gap: 12px; }
        .mg-lista li { display: grid; grid-template-columns: 26px minmax(0, 1fr) auto; column-gap: 8px; align-items: center; }
        .mg-pos { font-size: 0.8rem; color: ${t.cor.cinza}; font-weight: 700; }
        .mg-nome b { font-size: 0.94rem; }
        .mg-nome em { font-style: normal; font-size: 0.68rem; font-weight: 800; background: ${t.cor.ouro}; color: ${t.cor.tinta}; border-radius: ${t.raio.pill}; padding: 1px 8px; margin-left: 6px; white-space: nowrap; }
        .mg-nome small { display: block; font-size: 0.78rem; color: ${t.cor.cinza}; }
        .mg-pct { font-size: 1rem; }
        .mg-trilho { grid-column: 2 / 4; height: 6px; background: ${t.cor.papelQuente2}; border-radius: 99px; overflow: hidden; margin-top: 5px; }
        .mg-trilho span { display: block; height: 100%; border-radius: 99px; }
        .mg-pilula { margin-top: 16px; width: 100%; padding: 11px 16px; border: none; border-radius: ${t.raio.pill}; background: ${t.cor.verde}; color: ${t.cor.ouro}; font: inherit; font-weight: 700; font-size: 0.94rem; cursor: pointer; box-shadow: ${t.sombra.botao}; transition: box-shadow 0.18s ease, transform 0.18s ease; }
        .mg-pilula:hover { box-shadow: ${t.sombra.botaoHover}; transform: translateY(-1px); }
        .mg-pilula:focus-visible { outline: none; box-shadow: ${t.sombra.botao}, ${t.sombra.anelFoco}; }
        .mg-rodape { margin: 10px 0 0; font-size: 0.78rem; color: ${t.cor.cinza}; line-height: 1.45; }
        @media (prefers-reduced-motion: reduce) { .mg-tile, .mg-pilula { transition: none; } .mg-tile.mg-sel { transform: none; } .mg-tile:active { transform: none; } }
      `}</style>
    </div>
  );
}
