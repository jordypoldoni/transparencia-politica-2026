import { useState, useEffect, useLayoutEffect, useMemo, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { t } from '../src/estilo/tokens';
import { NOMES_UF } from '../src/lib/cotas';
import { MAPA_BRASIL } from '../src/lib/mapaBrasilGeo';
import Segmentado from './Segmentado';

// MAPA DO BRASIL NA APURAÇÃO (12/10/2026, D-026). Presidente por estado, lido de /api/apuracao-estados.
// Só é montado quando o usuário abre a opção "por estados": o que ele carrega (27 arquivos do TSE, em cache) não
// pesa na tela normal. Regras do Jordy: a cor do estado marca a REGIÃO (só para identificar; nunca partido, nunca as
// cores do site); o resultado aparece no hover, igual para todos; clique fixa o estado ao lado; clicar num candidato
// mostra em que estados ele foi melhor (uma cor neutra, em intensidade). Neutralidade: ordem por votos, sem rótulos.
const REGIOES = {
  N: { nome: 'Norte', cor: '#2F7D6B' },
  NE: { nome: 'Nordeste', cor: '#C07A3C' },
  CO: { nome: 'Centro-Oeste', cor: '#8A8F3A' },
  SE: { nome: 'Sudeste', cor: '#5B6FA8' },
  S: { nome: 'Sul', cor: '#8E5C9A' },
};
const ORDEM_REGIOES = ['N', 'NE', 'CO', 'SE', 'S'];
const SEM_DADOS = '#D9D6CE';
const FOCO_CLARO = '#E4E8EE';
const FOCO_ESCURO = '#334155';
const AREA_MINIMA_ROTULO = 1500; // estados menores não levam a sigla dentro; ganham alvo de mouse maior
const VB = MAPA_BRASIL.viewBox.split(' ').map(Number);

const fmt = (x) => Number(x || 0).toLocaleString('pt-BR');
const numPct = (s) => { const v = Number(String(s ?? '0').replace(/\./g, '').replace(',', '.')); return Number.isFinite(v) ? v : 0; };
const fmtPct = (v) => v.toFixed(2).replace('.', ',');
const chaveCand = (c) => `${c.numero}|${c.nome}`;

function hexRgb(h) { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
function misturar(a, b, p) {
  const x = hexRgb(a); const y = hexRgb(b);
  return `rgb(${x.map((v, i) => Math.round(v + (y[i] - v) * p)).join(',')})`;
}
const escurecer = (hex, p) => misturar(hex, '#000000', p);

// Quadro de um estado: usado no flutuante (hover) e no painel fixo (clique). `interativo` deixa os candidatos clicáveis.
// `agregado` ({ nome, regiao, e, nEstados }) troca o estado por uma região inteira, com os números já somados.
function Quadro({ uf, dados, foco, aoFocar, interativo, agregado }) {
  const e = agregado ? agregado.e : dados.estados[uf];
  const geo = agregado ? null : MAPA_BRASIL.estados.find((x) => x.uf === uf);
  const reg = REGIOES[agregado ? agregado.regiao : geo.regiao];
  const titulo = agregado ? agregado.nome : (NOMES_UF[uf] || uf);
  if (!e) {
    return (
      <div className="mapa-quadro-corpo">
        <div className="mapa-quadro-cab"><strong>{titulo}</strong><span className="mapa-sigla-uf">{uf}</span></div>
        <p className="mapa-mudo">O TSE ainda não publicou o resultado deste estado.</p>
      </div>
    );
  }
  const maxPct = 100;
  return (
    <div className="mapa-quadro-corpo">
      <div className="mapa-quadro-cab">
        <strong style={{ fontFamily: t.fonte.titulo, fontSize: '1.18rem', fontWeight: 600 }}>{titulo}</strong>
        <span className="mapa-regiao"><i style={{ background: reg.cor }} />{agregado ? `${agregado.nEstados} ${agregado.nEstados === 1 ? 'estado' : 'estados'}` : reg.nome}</span>
      </div>
      <p className="mapa-sub">
        Seções apuradas: <b>{fmt(e.secoes.totalizadas)}</b> de <b>{fmt(e.secoes.total)}</b> ({e.secoes.pct_totalizadas}%)
      </p>
      <ol className="mapa-lista">
        {e.candidatos.map((c, i) => {
          const p = numPct(c.pct);
          const emFoco = foco === chaveCand(c);
          const linha = (
            <>
              <span className="mapa-pos">{i + 1}º</span>
              <span className="mapa-nome">
                <b className={i === 0 ? 'mapa-lider' : ''}>{c.nome}</b>
                <small>{c.partido}</small>
              </span>
              <b className="mapa-pct">{c.pct}%</b>
              <span className="mapa-trilho"><span className="mapa-barra" style={{ width: `${Math.max(0.6, (p / maxPct) * 100)}%`, background: reg.cor, '--i': i }} /></span>
              <small className="mapa-votos">{fmt(c.votos)}</small>
            </>
          );
          return (
            <li key={chaveCand(c)} className={emFoco ? 'mapa-em-foco' : ''}>
              {interativo ? (
                <button type="button" className="mapa-linha mapa-linha-btn" aria-pressed={emFoco} onClick={() => aoFocar(emFoco ? null : chaveCand(c))} title="Colorir o mapa com a votação deste candidato em cada estado">
                  {linha}
                </button>
              ) : <div className="mapa-linha">{linha}</div>}
            </li>
          );
        })}
      </ol>
      <p className="mapa-rodape-quadro">
        Brancos: <b>{fmt(e.votos.brancos)}</b> ({e.votos.pct_brancos}%) · Nulos: <b>{fmt(e.votos.nulos)}</b> ({e.votos.pct_nulos}%)
      </p>
      <p className="mapa-rodape-quadro">Porcentagens sobre os votos válidos, como o TSE publica.</p>
    </div>
  );
}

// Dica do hover: curta de propósito (nome, região e os 3 mais votados). Os 12 completos ficam no painel ao clicar.
function Dica({ uf, dados, foco }) {
  const e = dados.estados[uf];
  const geo = MAPA_BRASIL.estados.find((x) => x.uf === uf);
  const reg = REGIOES[geo.regiao];
  return (
    <div className="mapa-quadro-corpo">
      <div className="mapa-quadro-cab">
        <strong style={{ fontFamily: t.fonte.titulo, fontSize: '1.1rem', fontWeight: 600 }}>{NOMES_UF[uf] || uf}</strong>
        <span className="mapa-regiao"><i style={{ background: reg.cor }} />{reg.nome}</span>
      </div>
      {!e ? <p className="mapa-mudo">O TSE ainda não publicou o resultado deste estado.</p> : (
        <>
          <ol className="mapa-lista mapa-lista-curta">
            {e.candidatos.slice(0, 3).map((c, i) => (
              <li key={chaveCand(c)} className="mapa-linha">
                <span className="mapa-pos">{i + 1}º</span>
                <span className="mapa-nome"><b className={i === 0 ? 'mapa-lider' : ''}>{c.nome}</b><small>{c.partido}</small></span>
                <b className="mapa-pct">{c.pct}%</b>
                <span className="mapa-trilho"><span className="mapa-barra" style={{ width: `${Math.max(0.6, numPct(c.pct))}%`, background: reg.cor }} /></span>
              </li>
            ))}
          </ol>
          {foco && (() => {
            const i = e.candidatos.findIndex((c) => chaveCand(c) === foco);
            if (i < 3) return null;
            const c = e.candidatos[i];
            return <p className="mapa-foco-linha">{c.nome}: <b>{i + 1}º</b>, {c.pct}%</p>;
          })()}
          <p className="mapa-rodape-quadro">Clique para fixar e ver os {e.candidatos.length} candidatos.</p>
        </>
      )}
    </div>
  );
}

export default function MapaBrasilApuracao({ turno = 1 }) {
  const [dados, setDados] = useState(null);
  const [erro, setErro] = useState(null);
  const [nacional, setNacional] = useState(null);
  const [hover, setHover] = useState(null);
  const [fixo, setFixo] = useState(null);
  const [regiao, setRegiao] = useState(null); // região escolhida (filtro): soma os estados dela
  const [foco, setFoco] = useState(null); // chave do candidato em foco
  const [pulso, setPulso] = useState(null);
  const caixaRef = useRef(null);
  const svgRef = useRef(null);
  const dicaRef = useRef(null);
  const elRefs = useRef({});

  // Carrega só ao montar (= ao abrir a opção "por estados").
  useEffect(() => {
    const ctrl = new AbortController();
    const q = turno === 2 ? '?turno=2' : '';
    fetch(`/api/apuracao-estados${q}`, { signal: ctrl.signal })
      .then(async (r) => {
        if (r.status === 404) throw new Error('nao_publicou');
        if (!r.ok) throw new Error('falhou');
        return r.json();
      })
      .then((j) => setDados(j))
      .catch((e) => { if (e.name !== 'AbortError') setErro(e.message === 'nao_publicou' ? 'nao_publicou' : 'falhou'); });
    // Total nacional (existente), só para a nota sobre o voto no exterior.
    fetch(`/api/apuracao?cargo=presidente${turno === 2 ? '&turno=2' : ''}`, { signal: ctrl.signal })
      .then((r) => (r.ok ? r.json() : null)).then((j) => setNacional(j)).catch(() => {});
    return () => ctrl.abort();
  }, [turno]);

  // Ordem de entrada: de oeste para leste.
  const ordemEntrada = useMemo(() => {
    const o = {}; [...MAPA_BRASIL.estados].sort((a, b) => a.cx - b.cx).forEach((e, i) => { o[e.uf] = i; }); return o;
  }, []);

  // Soma da região escolhida (12/10/2026): votos de cada candidato, válidos, brancos, nulos e seções dos estados da região.
  // A porcentagem é sobre os votos válidos da região; brancos e nulos sobre o total de votos (como o TSE faz por estado).
  // Estado da região que o TSE ainda não publicou fica de fora e a lista `faltam` avisa que o total é parcial.
  const agregado = useMemo(() => {
    if (!regiao || !dados) return null;
    const ufs = MAPA_BRASIL.estados.filter((g) => g.regiao === regiao).map((g) => g.uf);
    const com = ufs.filter((u) => dados.estados[u]);
    const faltam = ufs.filter((u) => !dados.estados[u]);
    const por = new Map(); let validos = 0; let brancos = 0; let nulos = 0; let tot = 0; let total = 0;
    for (const u of com) {
      const e = dados.estados[u];
      validos += e.votos.validos; brancos += e.votos.brancos; nulos += e.votos.nulos;
      tot += e.secoes.totalizadas; total += e.secoes.total;
      for (const c of e.candidatos) {
        const k = chaveCand(c); const a = por.get(k);
        if (a) a.votos += c.votos; else por.set(k, { numero: c.numero, nome: c.nome, partido: c.partido, votos: c.votos });
      }
    }
    if (!com.length) return { regiao, nome: REGIOES[regiao].nome, nEstados: 0, faltam, e: null };
    const todos = validos + brancos + nulos;
    const candidatos = [...por.values()].sort((a, b) => b.votos - a.votos)
      .map((c) => ({ ...c, pct: fmtPct(validos ? (c.votos / validos) * 100 : 0) }));
    return {
      regiao, nome: REGIOES[regiao].nome, nEstados: com.length, faltam,
      e: {
        secoes: { totalizadas: tot, total, pct_totalizadas: fmtPct(total ? (tot / total) * 100 : 0) },
        votos: { validos, brancos, nulos, pct_brancos: fmtPct(todos ? (brancos / todos) * 100 : 0), pct_nulos: fmtPct(todos ? (nulos / todos) * 100 : 0) },
        candidatos,
      },
    };
  }, [regiao, dados]);

  // Escala do candidato em foco: menor e maior % entre os estados (só os da região, se uma estiver escolhida).
  const escala = useMemo(() => {
    if (!foco || !dados) return null;
    const por = {}; let min = Infinity; let max = -Infinity;
    for (const [uf, e] of Object.entries(dados.estados)) {
      if (regiao && (MAPA_BRASIL.estados.find((g) => g.uf === uf) || {}).regiao !== regiao) continue;
      const c = e.candidatos.find((x) => chaveCand(x) === foco);
      if (!c) continue;
      const p = numPct(c.pct); por[uf] = p; min = Math.min(min, p); max = Math.max(max, p);
    }
    const cand = dados.candidatos.find((x) => chaveCand(x) === foco);
    return Number.isFinite(min) ? { por, min, max, nome: cand ? cand.nome : '' } : null;
  }, [foco, dados, regiao]);

  const corDoEstado = (geo) => {
    const tem = dados && dados.estados[geo.uf];
    if (!tem) return SEM_DADOS;
    if (escala) {
      const p = escala.por[geo.uf];
      const f = escala.max > escala.min ? (p - escala.min) / (escala.max - escala.min) : 1;
      return misturar(FOCO_CLARO, FOCO_ESCURO, 0.08 + f * 0.92);
    }
    return REGIOES[geo.regiao].cor;
  };
  const opacidadeDe = (geo) => (regiao && geo.regiao !== regiao ? 0.22 : 1);

  // Posição do quadro flutuante: direto no DOM, sem re-render a cada movimento do mouse.
  // O quadro é fixo na janela (portal no body): nunca é cortado pela borda da página. Fica à direita do mouse, vai
  // para a esquerda se faltar espaço, e é empurrado para dentro da janela na vertical.
  const posicionar = useCallback((x, y) => {
    const d = dicaRef.current; if (!d) return;
    const w = d.offsetWidth || 380; const h = d.offsetHeight || 500;
    const vw = window.innerWidth; const vh = window.innerHeight;
    const esq = x + 24 + w > vw - 8;
    const left = Math.max(8, esq ? x - 24 - w : x + 24);
    const top = Math.min(Math.max(8, y - 28), Math.max(8, vh - h - 8));
    d.style.transform = `translate(${left}px, ${top}px)`;
  }, []);
  const ultimo = useRef({ x: 0, y: 0 });
  const aoMover = (ev) => { ultimo.current = { x: ev.clientX, y: ev.clientY }; posicionar(ev.clientX, ev.clientY); };
  // Ao trocar de estado o quadro muda de altura: reposiciona já com o tamanho novo (senão ele sai pela borda da janela).
  useLayoutEffect(() => { if (hover) posicionar(ultimo.current.x, ultimo.current.y); }, [hover, posicionar]);
  const posicaoDoFoco = (geo) => {
    const s = svgRef.current; if (!s) return;
    const r = s.getBoundingClientRect();
    ultimo.current = { x: r.left + ((geo.cx - VB[0]) / VB[2]) * r.width, y: r.top + ((geo.cy - VB[1]) / VB[3]) * r.height };
    posicionar(ultimo.current.x, ultimo.current.y);
  };

  const escolher = (uf) => { setRegiao(null); setFixo((a) => (a === uf ? null : uf)); };
  const escolherRegiao = (k) => { setFixo(null); setRegiao((r) => (r === k ? null : k)); };
  const vizinho = (uf, dx, dy) => {
    const a = MAPA_BRASIL.estados.find((e) => e.uf === uf); let melhor = null; let ms = Infinity;
    for (const b of MAPA_BRASIL.estados) {
      if (b.uf === uf) continue;
      const vx = b.cx - a.cx; const vy = b.cy - a.cy; const d = Math.hypot(vx, vy); const cos = (vx * dx + vy * dy) / d;
      if (cos < 0.35) continue;
      const s = d * (1 + 2 * (1 - cos)); if (s < ms) { ms = s; melhor = b.uf; }
    }
    return melhor;
  };
  const teclas = (ev, geo) => {
    const mapa = { ArrowRight: [1, 0], ArrowLeft: [-1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
    if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); escolher(geo.uf); return; }
    if (ev.key === 'Escape') { setFixo(null); setRegiao(null); setFoco(null); return; }
    if (mapa[ev.key]) {
      ev.preventDefault(); const n = vizinho(geo.uf, ...mapa[ev.key]);
      if (n && elRefs.current[n]) elRefs.current[n].focus();
    }
  };

  // Limpar volta ao mapa como ele abre: sem estado, sem região e sem candidato em foco.
  const limparTudo = () => { setFixo(null); setRegiao(null); setFoco(null); };

  if (erro) {
    return (
      <div className="mapa-cartao mapa-aviso" role="status">
        {erro === 'nao_publicou'
          ? 'O TSE ainda não publicou o resultado por estado.'
          : 'Não foi possível carregar o resultado dos estados agora. Tente de novo em alguns minutos ou consulte direto no portal de resultados do TSE.'}
        <Estilos />
      </div>
    );
  }
  if (!dados) {
    return (
      <div className="mapa-cartao mapa-aviso" role="status" aria-live="polite">
        <span className="mapa-carregando"><i /><i /><i /></span> Carregando o resultado dos 27 estados…
        <Estilos />
      </div>
    );
  }

  const ativo = hover; // quadro flutuante
  const somaValidosUF = Object.values(dados.estados).reduce((n, e) => n + e.votos.validos, 0);
  const exterior = nacional && nacional.votos && nacional.votos.validos > somaValidosUF ? nacional.votos.validos - somaValidosUF : null;
  const datas = [...new Set(Object.values(dados.estados).map((e) => String(e.gerado_em || '').split(' ')[0]).filter(Boolean))];

  return (
    <div className="mapa-raiz">
      <div className="mapa-grade">
        <section className="mapa-lado mapa-lado-mapa" aria-label="Mapa do Brasil: presidente por estado">
          {/* Filtro por região: escolha excludente, então segmented control. Clicar de novo desmarca. */}
          <div className="mapa-controles">
            <Segmentado className="seg-compacto" aria="Somar os estados de uma região" itens={ORDEM_REGIOES.map((k) => ({ chave: k, rotulo: REGIOES[k].nome, cor: REGIOES[k].cor, ativo: regiao === k, aoClicar: () => escolherRegiao(k) }))} />
          </div>

          <div className="mapa-caixa" ref={caixaRef} onMouseMove={aoMover} onMouseLeave={() => setHover(null)}>
            <svg ref={svgRef} viewBox={MAPA_BRASIL.viewBox} className="mapa-svg" role="group" aria-label="Estados do Brasil. Use Tab ou as setas, Enter para fixar o resultado de um estado.">
              <g>
                {MAPA_BRASIL.estados.map((geo) => (
                  <path
                    key={geo.uf} ref={(el) => { elRefs.current[geo.uf] = el; }} d={geo.d}
                    className={`mapa-uf${fixo === geo.uf ? ' mapa-fixo' : ''}`}
                    style={{ fill: corDoEstado(geo), fillOpacity: opacidadeDe(geo), '--i': ordemEntrada[geo.uf] }}
                    tabIndex={0} role="button" aria-pressed={fixo === geo.uf}
                    aria-label={`${NOMES_UF[geo.uf]}, ${REGIOES[geo.regiao].nome}. Enter para fixar o resultado.`}
                    onMouseEnter={() => setHover(geo.uf)} onMouseLeave={() => setHover(null)}
                    onFocus={(ev) => { if (ev.currentTarget.matches(':focus-visible')) { setHover(geo.uf); posicaoDoFoco(geo); } }} onBlur={() => setHover(null)}
                    onClick={() => escolher(geo.uf)} onKeyDown={(ev) => teclas(ev, geo)}
                  />
                ))}
              </g>
              {/* Camada de destaque: o estado sob o mouse e o fixo sobem (SVG não tem z-index, então são copiados por cima). */}
              <g style={{ pointerEvents: 'none' }}>
                {[...new Set([fixo, ativo].filter(Boolean))].map((uf) => {
                  const geo = MAPA_BRASIL.estados.find((e) => e.uf === uf);
                  const base = corDoEstado(geo);
                  return (
                    <path key={`${uf}-${uf === pulso ? 'p' : ''}`} d={geo.d}
                      className={`mapa-realce${uf === fixo ? ' mapa-realce-fixo' : ''}${uf === pulso ? ' mapa-pulso' : ''}`}
                      style={{ fill: dados.estados[uf] ? (escala ? base : escurecer(REGIOES[geo.regiao].cor, 0.16)) : SEM_DADOS, transformOrigin: `${geo.cx}px ${geo.cy}px` }} />
                  );
                })}
              </g>
              <g style={{ pointerEvents: 'none' }} aria-hidden="true">
                {MAPA_BRASIL.estados.filter((g) => g.area >= AREA_MINIMA_ROTULO).map((geo) => (
                  <text key={geo.uf} x={geo.cx} y={geo.cy} className="mapa-sigla" style={{ opacity: opacidadeDe(geo) }}>{geo.uf}</text>
                ))}
              </g>
              {/* Alvos maiores para os estados pequenos (DF, SE, AL...): mesmo comportamento dos estados. */}
              <g>
                {MAPA_BRASIL.estados.filter((g) => g.area < AREA_MINIMA_ROTULO).map((geo) => (
                  <circle key={geo.uf} cx={geo.cx} cy={geo.cy} r={9} className="mapa-alvo" aria-hidden="true"
                    onMouseEnter={() => setHover(geo.uf)} onMouseLeave={() => setHover(null)} onClick={() => escolher(geo.uf)} />
                ))}
              </g>
            </svg>

          </div>
          {createPortal(
            <div ref={dicaRef} className={`mapa-dica${ativo ? ' mapa-dica-on' : ''}`} aria-hidden="true">
              {ativo && <Dica key={ativo} uf={ativo} dados={dados} foco={foco} />}
            </div>, document.body)}

          <p className="mapa-nota">
            {exterior != null && <>Os votos de brasileiros no exterior ({fmt(exterior)} válidos) não aparecem no mapa, mas estão no total do Brasil. </>}
            A cor do mapa marca só a região, não o resultado. Clique em uma região para ver o total dela. Fonte: <a href="https://resultados.tse.jus.br/" target="_blank" rel="noopener noreferrer">TSE</a>, arquivos por estado{datas.length === 1 ? ` gerados em ${datas[0]}` : ''}. Malha dos estados: IBGE.
          </p>
        </section>

        <aside className="mapa-lado mapa-painel" aria-live="polite" aria-label="Resultado do estado fixado">
          {agregado ? (
            <>
              <div className="mapa-painel-topo">
                <span className="mapa-fixado">Região selecionada</span>
                <button type="button" className="mapa-pilula" onClick={limparTudo}>Limpar</button>
              </div>
              {escala && (
                <div className="mapa-foco-banner" role="status">
                  <p><b>Mapa colorido por {escala.nome}</b></p>
                  <p>Cada estado mostra a % de votos válidos que {escala.nome} teve nele{regiao ? `, só nos estados da região ${REGIOES[regiao].nome}` : ''}. Quanto mais escuro, mais votos. Não é o total do país.</p>
                  <span className="mapa-gradiente" style={{ background: `linear-gradient(to right, ${FOCO_CLARO}, ${FOCO_ESCURO})` }} />
                  <span className="mapa-extremos"><b>{fmtPct(escala.min)}%</b><b>{fmtPct(escala.max)}%</b></span>
                  <button type="button" className="mapa-pilula" onClick={() => setFoco(null)}>Voltar às cores das regiões</button>
                </div>
              )}
              {agregado.e ? (
                <Quadro key={`reg-${regiao}`} agregado={agregado} dados={dados} foco={foco} aoFocar={setFoco} interativo />
              ) : (
                <p className="mapa-mudo">O TSE ainda não publicou o resultado dos estados desta região.</p>
              )}
              {agregado.faltam.length > 0 && agregado.e && (
                <p className="mapa-aviso-parcial">Total parcial: o TSE ainda não publicou {agregado.faltam.join(', ')}.</p>
              )}
              <p className="mapa-dica-painel">Soma dos votos de todos os estados da região. Clique em um candidato para colorir o mapa com a votação dele em cada estado da região.</p>
            </>
          ) : fixo ? (
            <>
              <div className="mapa-painel-topo">
                <span className="mapa-fixado">Estado fixado</span>
                <button type="button" className="mapa-pilula" onClick={limparTudo}>Limpar</button>
              </div>
              {escala && (
                <div className="mapa-foco-banner" role="status">
                  <p><b>Mapa colorido por {escala.nome}</b></p>
                  <p>Cada estado mostra a % de votos válidos que {escala.nome} teve nele{regiao ? `, só nos estados da região ${REGIOES[regiao].nome}` : ''}. Quanto mais escuro, mais votos. Não é o total do país.</p>
                  <span className="mapa-gradiente" style={{ background: `linear-gradient(to right, ${FOCO_CLARO}, ${FOCO_ESCURO})` }} />
                  <span className="mapa-extremos"><b>{fmtPct(escala.min)}%</b><b>{fmtPct(escala.max)}%</b></span>
                  <button type="button" className="mapa-pilula" onClick={() => setFoco(null)}>Voltar às cores das regiões</button>
                </div>
              )}
              <Quadro key={fixo} uf={fixo} dados={dados} foco={foco} aoFocar={setFoco} interativo />
              <p className="mapa-dica-painel">Clique em um candidato para colorir o mapa com a votação dele em cada estado.</p>
            </>
          ) : (
            <div className="mapa-vazio">
              <svg width="44" height="44" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2a7 7 0 0 0-7 7c0 5 7 13 7 13s7-8 7-13a7 7 0 0 0-7-7zm0 9.5A2.5 2.5 0 1 1 12 6.5a2.5 2.5 0 0 1 0 5z" fill="#CC7A22" /></svg>
              <strong>Escolha um estado ou uma região</strong>
              <ul>
                <li>Passe o mouse para ver quanto cada candidato teve.</li>
                <li>Clique para fixar o resultado aqui e comparar com outro estado.</li>
                <li>Depois de fixar, clique num candidato para colorir o mapa com a votação dele em cada estado.</li>
                <li>Clique em uma região, acima do mapa, para ver o total dela.</li>
                <li>Use Tab e as setas para navegar pelo teclado.</li>
              </ul>
            </div>
          )}
        </aside>
      </div>
      <Estilos />
    </div>
  );
}

function Estilos() {
  return (
    <style jsx global>{`
      .mapa-raiz { margin-top: 4px; }
      .mapa-grade { display: grid; grid-template-columns: minmax(0, 1.55fr) minmax(300px, 1fr); gap: 0; align-items: start; background: ${t.cor.papelCartao}; border-radius: ${t.raio.lg}; box-shadow: ${t.sombra.sutil}; padding: 20px; }
      .mapa-lado { position: relative; min-width: 0; }
      .mapa-lado-mapa { padding-right: 24px; }
      .mapa-cartao { background: ${t.cor.papelCartao}; border-radius: ${t.raio.lg}; box-shadow: ${t.sombra.sutil}; padding: 20px; position: relative; min-width: 0; }
      .mapa-aviso { color: ${t.cor.tinta}; display: flex; align-items: center; gap: 12px; line-height: 1.5; }
      .mapa-controles { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 10px 14px; margin-bottom: 8px; position: relative; z-index: 5; }
            .seg-compacto .seg-op { padding: 6px 9px; font-size: .84rem; }
      .seg-compacto .seg-ponto { margin-right: 6px; }

      .mapa-caixa { position: relative; }
      .mapa-svg { width: 100%; height: auto; max-height: max(560px, calc(100vh - 120px)); display: block; overflow: visible; margin: 0 auto; }
      .mapa-uf { stroke: #fff; stroke-width: 1; stroke-linejoin: round; cursor: pointer; outline: none; opacity: 0; animation: mapa-entra .55s cubic-bezier(.2,.8,.2,1) both; animation-delay: calc(var(--i) * 26ms); transition: fill .45s ease, fill-opacity .3s ease; }
      .mapa-uf:focus-visible { stroke: ${t.cor.tinta}; stroke-width: 2.4; }
      .mapa-realce { stroke: #fff; stroke-width: 1.4; stroke-linejoin: round; transform: scale(1.035) translateY(-2px); filter: drop-shadow(0 6px 7px rgba(20,16,10,.38)); animation: mapa-sobe-estado .22s ease both; }
      .mapa-realce-fixo { stroke: ${t.cor.tinta}; stroke-width: 2.2; }
      .mapa-pulso { animation: mapa-sobe-estado .22s ease both, mapa-pulsa 1.2s ease-out .2s 1 both; }
      .mapa-sigla { font: 600 9.5px ${t.fonte.corpo}; fill: #fff; text-anchor: middle; dominant-baseline: middle; paint-order: stroke; stroke: rgba(0,0,0,.28); stroke-width: 2px; stroke-linejoin: round; transition: opacity .3s; }
      .mapa-alvo { fill: transparent; cursor: pointer; }

      .mapa-dica { position: fixed; left: 0; top: 0; z-index: 1000; width: 340px; pointer-events: none; opacity: 0; transition: opacity .12s ease; background: #fff; border-radius: ${t.raio.md}; box-shadow: 0 14px 40px rgba(40,30,15,.28), 0 2px 6px rgba(40,30,15,.12); padding: 16px 16px 12px; }
      .mapa-dica-on { opacity: 1; }

      .mapa-lista-curta { margin-top: 8px; }
      .mapa-lista-curta .mapa-nome b { white-space: normal; overflow: visible; text-overflow: clip; }
      .mapa-foco-linha { margin: 6px 0 0; font-size: .8rem; color: ${t.cor.tinta}; }
      .mapa-quadro-cab { display: flex; align-items: baseline; justify-content: space-between; gap: 10px; }
      .mapa-regiao { display: inline-flex; align-items: center; gap: 7px; font-size: .78rem; color: ${t.cor.tinta}; background: ${t.cor.papelQuente}; padding: 3px 10px; border-radius: ${t.raio.pill}; white-space: nowrap; }
      .mapa-sub { margin: 4px 0 10px; font-size: .8rem; color: ${t.cor.cinza}; }
      .mapa-sub b { color: ${t.cor.tinta}; }
      .mapa-lista { list-style: none; margin: 0; padding: 0; display: grid; gap: 1px; }
      .mapa-lista li { border-radius: ${t.raio.sm}; transition: background .2s; }
      .mapa-em-foco { background: ${t.cor.papelQuente2}; box-shadow: ${t.sombra.clicavel}; }
      .mapa-linha { display: grid; grid-template-columns: 26px minmax(0, 1fr) auto; grid-template-rows: auto auto; column-gap: 8px; row-gap: 2px; align-items: center; padding: 3px 8px; width: 100%; text-align: left; font: inherit; color: ${t.cor.tinta}; background: transparent; border: 0; border-radius: ${t.raio.sm}; }
      .mapa-linha-btn { cursor: pointer; transition: background .15s, box-shadow .15s; }
      .mapa-linha-btn:hover { background: ${t.cor.papelQuente}; box-shadow: ${t.sombra.clicavel}; }
      .mapa-pos { font-size: .78rem; color: ${t.cor.cinza}; }
      .mapa-nome { display: flex; align-items: baseline; gap: 6px; min-width: 0; font-size: .88rem; }
      .mapa-nome b { font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      .mapa-nome b.mapa-lider { font-weight: 800; }
      .mapa-nome small { color: ${t.cor.cinza}; font-size: .72rem; white-space: nowrap; }
      .mapa-pct { font-size: .88rem; justify-self: end; font-variant-numeric: tabular-nums; }
      .mapa-votos { color: ${t.cor.cinza}; font-size: .7rem; justify-self: end; font-variant-numeric: tabular-nums; }
      .mapa-trilho { grid-column: 2; height: 6px; background: ${t.cor.papelQuente2}; border-radius: ${t.raio.pill}; overflow: hidden; }
      .mapa-barra { display: block; height: 100%; border-radius: ${t.raio.pill}; transform-origin: left center; animation: mapa-cresce .7s cubic-bezier(.2,.8,.2,1) both; animation-delay: calc(var(--i) * 40ms + 60ms); }
      .mapa-rodape-quadro { margin: 8px 0 0; font-size: .76rem; color: ${t.cor.cinza}; }
      .mapa-rodape-quadro b { color: ${t.cor.tinta}; }
      .mapa-mudo { margin: 10px 0 0; color: ${t.cor.cinza}; font-size: .9rem; }

      .mapa-legenda { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; margin-top: 14px; }
      .mapa-foco-banner { margin: 6px 0 12px; padding: 12px 14px; background: ${t.cor.papelQuente}; border-radius: ${t.raio.md}; display: grid; gap: 6px; justify-items: start; animation: mapa-sobe .25s ease both; }
      .mapa-foco-banner p { margin: 0; font-size: .82rem; color: ${t.cor.tinta}; line-height: 1.45; }
      .mapa-foco-banner .mapa-gradiente { width: 100%; }
      .mapa-foco-banner .mapa-extremos { width: 100%; }
      .mapa-regioes { display: grid; gap: 8px; justify-items: start; margin-top: 14px; }
      .mapa-aviso-parcial { margin: 8px 0 0; font-size: .8rem; color: ${t.cor.alertaTexto}; }
      .mapa-pilula { display: inline-flex; align-items: center; gap: 8px; padding: 8px 16px; font: 600 .84rem ${t.fonte.corpo}; color: ${t.cor.tinta}; background: #fff; border: 0; border-radius: ${t.raio.pill}; cursor: pointer; box-shadow: ${t.sombra.clicavel}; transition: box-shadow .2s ease, transform .2s ease, background .2s; }
      .mapa-pilula:hover { box-shadow: ${t.sombra.hover}; transform: translateY(-1px); }
      .mapa-pilula-on { background: ${t.cor.papelQuente2}; box-shadow: ${t.sombra.hover}; }
      .mapa-dica-legenda { font-size: .78rem; color: ${t.cor.cinza}; margin-left: 4px; }
      .mapa-legenda-foco { display: grid; gap: 6px; margin-top: 14px; font-size: .84rem; color: ${t.cor.tinta}; justify-items: start; animation: mapa-sobe .25s ease both; }
      .mapa-gradiente { display: block; width: min(360px, 100%); height: 10px; border-radius: ${t.raio.pill}; }
      .mapa-extremos { width: min(360px, 100%); display: flex; justify-content: space-between; font-size: .78rem; }
      .mapa-nota { margin: 14px 0 0; font-size: .78rem; color: ${t.cor.cinza}; line-height: 1.5; }
      .mapa-nota a { color: ${t.cor.ouroTexto}; font-weight: 700; }

      .mapa-painel { position: sticky; top: 16px; min-height: 260px; max-height: calc(100vh - 72px); padding-left: 24px; box-shadow: inset 1px 0 0 ${t.cor.papelQuente2}; overflow-y: auto; overscroll-behavior: contain; scrollbar-width: thin; }
      .mapa-painel-topo { display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; }
      .mapa-fixado { font-size: .72rem; letter-spacing: .06em; text-transform: uppercase; color: ${t.cor.cinza}; font-weight: 700; }
      .mapa-dica-painel { margin: 12px 0 0; font-size: .78rem; color: ${t.cor.cinza}; }
      .mapa-vazio { display: grid; gap: 10px; justify-items: start; color: ${t.cor.tinta}; animation: mapa-sobe .3s ease both; }
      .mapa-vazio ul { margin: 0; padding-left: 18px; color: ${t.cor.cinza}; font-size: .86rem; line-height: 1.55; }
      .mapa-quadro-corpo { animation: mapa-sobe .22s ease both; }

      .mapa-carregando i { display: inline-block; width: 8px; height: 8px; margin-right: 4px; border-radius: 50%; background: #CC7A22; animation: mapa-pisca 1s ease-in-out infinite; }
      .mapa-carregando i:nth-child(2) { animation-delay: .15s; } .mapa-carregando i:nth-child(3) { animation-delay: .3s; }

      @keyframes mapa-entra { from { opacity: 0; transform: scale(.94); } to { opacity: 1; transform: scale(1); } }
      @keyframes mapa-sobe { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
      @keyframes mapa-sobe-estado { from { transform: scale(1); filter: drop-shadow(0 0 0 rgba(20,16,10,0)); } }
      @keyframes mapa-cresce { from { transform: scaleX(0); } to { transform: scaleX(1); } }
      @keyframes mapa-pulsa { 0% { stroke-width: 1.4; } 40% { stroke-width: 6; stroke: #CC7A22; } 100% { stroke-width: 2.2; } }
      @keyframes mapa-pisca { 0%, 100% { opacity: .25; } 50% { opacity: 1; } }
      @media (max-width: 1000px) { .mapa-grade { grid-template-columns: minmax(0, 1fr); } .mapa-lado-mapa { padding-right: 0; } .mapa-painel { position: static; max-height: none; padding: 18px 0 0; margin-top: 18px; box-shadow: inset 0 1px 0 ${t.cor.papelQuente2}; } }
    `}</style>
  );
}
