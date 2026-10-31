import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { t } from '../src/estilo/tokens';
import Avatar from './Avatar';
import Segmentado from './Segmentado';
import CampoSelect from './CampoSelect';
import CampoBusca from './CampoBusca';
import { Seta, Pino } from './icones';
import { NOMES_UF } from '../src/lib/cotas';
import { ufLocal, EVENTO_UF } from '../src/lib/perfilUsuario';
import { SEGUNDO_TURNO } from '../src/lib/turnos';
import { hrefTodos } from '../src/lib/buscaCandidatosHome';
import { nomeBonito as bonito, pctNum as num, cadeirasPorPartido, cadeirasDeContagem, governoNoPrimeiroTurno, chaveFoto, fotoDe } from '../src/lib/eleicoesHome';

// ELEIÇÕES NA HOME (12/10/2026, pedido do Jordy; refeito em 31/10/2026, D-101 e D-102).
// Etapa 1 (31/10/2026): fundo quente que une o bloco e cartão do Presidente com as abas "1º turno | 2º turno".
// Desenho aprovado pelo Jordy: duelo em uma barra (cantos retos, pois não é clicável; só pílula é clicável), cada
// candidato com a mesma cor nas duas abas (1º colocado do 1º turno = âmbar, 2º = índigo), nome dentro da barra,
// manchete como título do cartão. Só fato e fonte: ordem por votos, sem rótulo de favorito.
// Etapa 2 (31/10/2026): seletor de estado e visão do estado. O estado inicial é o do perfil (que desce para o navegador
// pela sincronização) ou o salvo neste navegador (`ufLocal`). Trocar no seletor vale SÓ para esta visita: não grava no
// perfil nem nas outras telas (decisão do Jordy); só o perfil muda o estado do site. Com estado: governador, senadores e
// cadeiras por partido da Câmara e da Assembleia; na aba 2º turno, o governador do 2º turno (se o estado teve) e uma faixa
// dizendo que não houve 2º turno para os demais cargos (sem popup). "Todo o Brasil" = sem estado (a visão do visitante é a etapa 3, feita em 31/10/2026: cadeiras por partido da Câmara e do Senado no país + os 27 governadores; na aba 2º turno, os governos que foram ao 2º turno; cada estado é um botão que mostra o estado só nesta visita).
// Os números vêm de /api/apuracao (cache de borda, nada no banco). Sem resultado do TSE, mostra `children`
// (a lista de candidatos de antes).
// Etapa 4 (31/10/2026): campo de busca de candidatos (BuscaCandidatos) ao lado do seletor.
const fmt = (x) => Number(x || 0).toLocaleString('pt-BR');
const mesmo = (c, ch) => String(ch.nr_candidato) === String(c.numero);
const INDIGO = t.cor.verde; // índigo
const AMBAR = t.cor.ouro;
const pronto = (j) => (j && j.secoes && j.secoes.totalizadas > 0 && (j.candidatos || []).length >= 2 ? j : null);
const UFS = ['AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'];
const OPCOES_UF = [{ valor: '', rotulo: 'Todo o Brasil', busca: 'todo brasil' }].concat(UFS.map((uf) => ({ valor: uf, rotulo: `${uf} · ${NOMES_UF[uf] || uf}`, busca: `${uf} ${NOMES_UF[uf] || ''}` })));
const rotuloCaixa = { margin: 0, fontSize: '.78rem', letterSpacing: '.06em', textTransform: 'uppercase', color: t.cor.cinza, fontFamily: t.fonte.corpo, fontWeight: 700 };
const linkOuro = { fontSize: '0.85rem', fontWeight: 700, color: t.cor.ouroTexto, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '5px' };

function Lado({ nome, partido, numero, foto, href, cor, direita, pct, rodape }) {
  const miolo = (
    <>
      <div style={{ borderRadius: '50%', boxShadow: `0 0 0 4px ${cor}`, flexShrink: 0, margin: 4 }}>
        <Avatar nome={nome} foto={foto} size={72} />
      </div>
      <div style={{ minWidth: 0 }}>
        <b className="elh-nome" style={{ display: 'block', fontSize: '1.05rem', color: t.cor.tinta }}>{nome}</b>
        <small style={{ display: 'block', color: t.cor.cinza, fontSize: '.82rem', marginTop: 2 }}>{partido}{numero ? ` · ${numero}` : ''}</small>
        <span style={{ display: 'block', fontFamily: t.fonte.titulo, fontWeight: 600, fontSize: '2.6rem', lineHeight: 1, marginTop: 6, color: t.cor.tinta }}>{pct}%</span>
        <span style={{ display: 'block', color: t.cor.cinza, fontSize: '.8rem', marginTop: 4 }}>{rodape}</span>
      </div>
    </>
  );
  const estilo = { display: 'flex', alignItems: 'center', gap: 16, textDecoration: 'none', color: 'inherit', flexDirection: direita ? 'row-reverse' : 'row', textAlign: direita ? 'right' : 'left', minWidth: 0 };
  return href
    ? <Link href={href} className="elh-lado" style={estilo}>{miolo}</Link>
    : <div style={estilo}>{miolo}</div>;
}

// Faixa do duelo: cada lado com a cor do candidato; texto escuro ou claro conforme o contraste da cor.
function Faixa({ a, b, corA, corB, larga, marca }) {
  const lado = (c, cor, larg, direita) => (
    <div style={{ width: `${larg}%`, background: cor, color: cor === AMBAR ? t.cor.tinta : '#fff', display: 'flex', alignItems: 'center', justifyContent: direita ? 'flex-end' : 'flex-start', padding: '0 14px', fontWeight: 800, fontSize: '.82rem', whiteSpace: 'nowrap', overflow: 'hidden' }}>
      <span className="elh-nl">{c.nome}</span><span className="elh-nc">{String(c.nome).split(' ')[0]}</span>
    </div>
  );
  return (
    <div role="img" aria-label={`${a.nome} ${a.pct}%, ${b.nome} ${b.pct}%`} style={{ display: 'flex', height: 30, borderRadius: 7, overflow: 'hidden', margin: '18px 0 6px', position: 'relative' }}>
      {lado(a, corA, larga, false)}
      {lado(b, corB, 100 - larga, true)}
      {marca && <span aria-hidden="true" style={{ position: 'absolute', left: '50%', top: 0, bottom: 0, width: 2, background: t.cor.tinta }} />}
    </div>
  );
}

function Pessoa({ nome, partido, cargo, pct, foto, href }) {
  const miolo = (
    <>
      <Avatar nome={nome} foto={foto} size={46} />
      <div style={{ minWidth: 0, flex: 1 }}>
        <b className="elh-nome" style={{ display: 'block', fontSize: '.95rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{bonito(nome)}</b>
        <small style={{ color: t.cor.cinza, fontSize: '.8rem' }}>{partido} · {cargo}</small>
      </div>
      {pct != null && <b style={{ fontSize: '1rem', flexShrink: 0 }}>{pct}%</b>}
    </>
  );
  const estilo = { display: 'flex', alignItems: 'center', gap: 12, padding: '6px 0', minWidth: 0, textDecoration: 'none', color: 'inherit' };
  return href ? <Link href={href} className="elh-lado" style={estilo}>{miolo}</Link> : <div style={estilo}>{miolo}</div>;
}

function Bloco({ titulo, contagem, children, estilo }) {
  return (
    <div style={{ background: t.cor.papelCartao, borderRadius: t.raio.md, padding: '16px 18px', boxShadow: t.sombra.sutil, minWidth: 0, ...estilo }}>
      <h3 style={{ ...rotuloCaixa, marginBottom: 10, display: 'flex', justifyContent: 'space-between', gap: 8 }}><span>{titulo}</span><span>{contagem}</span></h3>
      {children}
    </div>
  );
}

// Cadeiras por partido: barras de cantos retos (não são clicáveis), as maiores primeiro e "Outros partidos" no fim.
function Cadeiras({ eleitos, contagem }) {
  const c = contagem ? cadeirasDeContagem(contagem, 6) : cadeirasPorPartido(eleitos, 6);
  const linha = (nome, qtd, suave) => (
    <div key={nome} style={{ display: 'grid', gridTemplateColumns: 'minmax(70px, 120px) 1fr 34px', gap: 10, alignItems: 'center', fontSize: '.84rem', padding: '3px 0' }}>
      <span style={{ fontWeight: suave ? 400 : 600, color: suave ? t.cor.cinza : t.cor.tinta, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{nome}</span>
      <span style={{ height: 8, background: t.cor.papelQuente2, borderRadius: 2, display: 'block' }}>
        <span style={{ display: 'block', height: 8, borderRadius: 2, width: `${(qtd / c.maior) * 100}%`, background: suave ? '#B9B3D6' : INDIGO }} />
      </span>
      <b style={{ textAlign: 'right' }}>{qtd}</b>
    </div>
  );
  return (
    <div>
      {c.linhas.map((l) => linha(l.partido, l.qtd, false))}
      {c.outros > 0 && linha('Outros partidos', c.outros, true)}
    </div>
  );
}

function Governo({ gov, uf, fotos }) {
  const g = governoNoPrimeiroTurno(gov.candidatos);
  const ficha = (c) => { const f = fotoDe(fotos, 'governador', uf, c.numero); return { foto: f?.foto, href: f?.slug ? `/candidato-governador/${f.slug}` : null }; };
  if (g.eleito) {
    return <Bloco titulo="Governador" contagem="1 eleito"><Pessoa nome={g.eleito.nome} partido={g.eleito.partido} cargo="Governador" pct={g.eleito.pct} {...ficha(g.eleito)} /></Bloco>;
  }
  if (g.finalistas.length) {
    return (
      <Bloco titulo="Governador" contagem="2º turno">
        {g.finalistas.map((c) => <Pessoa key={`${c.numero}|${c.nome}`} nome={c.nome} partido={c.partido} cargo="foi ao 2º turno" pct={c.pct} {...ficha(c)} />)}
      </Bloco>
    );
  }
  return null;
}

function EleitosDoEstado({ uf, d, fotos }) {
  const nome = NOMES_UF[uf] || uf;
  const sen = d.sen?.eleitos || [];
  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12, flexWrap: 'wrap', margin: '22px 2px 10px' }}>
        <h3 style={rotuloCaixa}>{nome} · eleitos no 1º turno</h3>
        <Link href={`/estado/${uf}`} style={linkOuro}>Ver tudo de {nome} <Seta direcao="direita" size={14} /></Link>
      </div>
      <div className="elh-g3" style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 12 }}>
        {d.gov && <Governo gov={d.gov} uf={uf} fotos={fotos} />}
        {sen.length > 0 && (
          <Bloco titulo="Senado" contagem={`${sen.length} ${sen.length === 1 ? 'eleito' : 'eleitos'}`}>
            <div className="elh-sen" style={{ display: 'grid', gridTemplateColumns: sen.length > 1 ? '1fr 1fr' : '1fr', gap: 18 }}>
              {sen.map((c) => { const f = fotoDe(fotos, 'senador', uf, c.numero); return <Pessoa key={`${c.numero}|${c.nome}`} nome={c.nome} partido={c.partido} cargo="Senador" pct={c.pct} foto={f?.foto} href={f?.slug ? `/candidato-senador/${f.slug}` : null} />; })}
            </div>
          </Bloco>
        )}
      </div>
      <div className="elh-g2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 12 }}>
        {d.df?.eleitos?.length > 0 && <Bloco titulo="Câmara dos Deputados" contagem={`${d.df.eleitos.length} eleitos`}><Cadeiras eleitos={d.df.eleitos} /></Bloco>}
        {d.de?.eleitos?.length > 0 && <Bloco titulo="Assembleia Legislativa" contagem={`${d.de.eleitos.length} eleitos`}><Cadeiras eleitos={d.de.eleitos} /></Bloco>}
      </div>
    </>
  );
}

// Visão do país (etapa 3): quem não tem estado vê o resumo do Brasil. Cadeiras por partido (Câmara e Senado) e os 27
// governadores; cada estado é um botão que mostra aquele estado só nesta visita.
function GovernadoresDoPais({ lista, aoEscolher, fotos }) {
  return (
    <Bloco titulo="Governadores" contagem="27 estados" estilo={{ marginTop: 12 }}>
      <div className="elh-gp" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '2px 18px' }}>
        {lista.map((g) => {
          const f = g.eleito;
          const detalhe = f ? `${bonito(f.nome)} · ${f.partido}` : (g.finalistas.length ? '2º turno' : 'apuração em andamento');
          return (
            <button key={g.uf} type="button" className="elh-gov" onClick={() => aoEscolher(g.uf)} aria-label={`Ver ${NOMES_UF[g.uf] || g.uf}`}
              style={{ display: 'flex', alignItems: 'baseline', gap: 10, textAlign: 'left', border: 'none', background: 'none', padding: '6px 4px', borderRadius: 6, cursor: 'pointer', font: 'inherit', color: 'inherit', minWidth: 0 }}>
              <b style={{ width: 26, flexShrink: 0, fontSize: '.8rem' }}>{g.uf}</b>
              <span style={{ alignSelf: 'center', display: 'flex', width: 26, height: 26, flexShrink: 0 }}>{f && <Avatar nome={f.nome} foto={fotoDe(fotos, 'governador', g.uf, f.numero)?.foto} size={26} />}</span>
              <span style={{ fontSize: '.84rem', color: f ? t.cor.tinta : t.cor.ouroTexto, fontWeight: f ? 400 : 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{detalhe}</span>
            </button>
          );
        })}
      </div>
    </Bloco>
  );
}

function PaisPrimeiroTurno({ p, aoEscolher, fotos }) {
  return (
    <>
      <div style={{ margin: '22px 2px 10px' }}><h3 style={rotuloCaixa}>Brasil · eleitos no 1º turno</h3></div>
      <div className="elh-g2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <Bloco titulo="Câmara dos Deputados" contagem={`${p.camara.total} eleitos`}><Cadeiras contagem={p.camara.contagem} /></Bloco>
        <Bloco titulo="Senado" contagem={`${p.senado.total} eleitos`}><Cadeiras contagem={p.senado.contagem} /></Bloco>
      </div>
      <GovernadoresDoPais lista={p.governadores} aoEscolher={aoEscolher} fotos={fotos} />
    </>
  );
}

function PaisSegundoTurno({ p, aoEscolher, fotos }) {
  const lista = p.governadores.filter((g) => g.segundo);
  if (!lista.length) return null;
  return (
    <>
      <div style={{ margin: '22px 2px 10px', display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <h3 style={rotuloCaixa}>Governadores no 2º turno</h3>
        <span style={{ ...rotuloCaixa, fontWeight: 400 }}>{lista.length} estados</span>
      </div>
      <div className="elh-g3b" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
        {lista.map((g) => (
          <button key={g.uf} type="button" className="elh-gov" onClick={() => aoEscolher(g.uf)} aria-label={`Ver ${NOMES_UF[g.uf] || g.uf}`}
            style={{ textAlign: 'left', border: 'none', cursor: 'pointer', font: 'inherit', color: 'inherit', background: t.cor.papelCartao, borderRadius: t.raio.md, padding: '14px 16px', boxShadow: t.sombra.sutil, minWidth: 0 }}>
            <b style={{ ...rotuloCaixa, display: 'block', marginBottom: 6 }}>{NOMES_UF[g.uf] || g.uf}</b>
            {g.segundo.candidatos.map((c) => (
              <span key={c.nome} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, fontSize: '.88rem', padding: '3px 0', fontWeight: c.eleito ? 800 : 400, color: c.eleito ? t.cor.sim : t.cor.tinta }}>
                <Avatar nome={c.nome} foto={fotoDe(fotos, 'governador', g.uf, c.numero)?.foto} size={28} />
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{c.eleito ? '✓ ' : ''}{bonito(c.nome)} · {c.partido}</span>
                <span>{c.pct}%</span>
              </span>
            ))}
          </button>
        ))}
      </div>
    </>
  );
}

function GovernoSegundoTurno({ uf, g2, fotos }) {
  const lado = (c) => { const f = fotoDe(fotos, 'governador', uf, c.numero); return { foto: f?.foto, href: f?.slug ? `/candidato-governador/${f.slug}` : null }; };
  const nome = NOMES_UF[uf] || uf;
  const [a, b] = [...g2.candidatos].sort((x, y) => y.votos - x.votos).slice(0, 2);
  const pa = num(a.pct); const pb = num(b.pct);
  const larga = (pa / ((pa + pb) || 1)) * 100;
  const eleito = [a, b].find((c) => c.eleito);
  const titulo = eleito ? `${bonito(eleito.nome)} é eleito governador` : (Number(g2.secoes.totalizadas) >= Number(g2.secoes.total) ? 'Resultado do 2º turno' : 'Apuração do 2º turno em andamento');
  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12, flexWrap: 'wrap', margin: '22px 2px 10px' }}>
        <h3 style={rotuloCaixa}>{nome} · governador no 2º turno</h3>
        <Link href={`/eleicoes?visao=apuracao&cargo=governador&uf=${uf}&turno=2`} style={linkOuro}>Ver apuração de {nome} <Seta direcao="direita" size={14} /></Link>
      </div>
      <div style={{ background: t.cor.papelCartao, borderRadius: t.raio.lg, padding: '20px 24px', boxShadow: t.sombra.sutil }}>
        <p style={{ fontFamily: t.fonte.titulo, fontWeight: 600, fontSize: '1.5rem', margin: '0 0 18px' }}>{titulo}</p>
        <div className="elh-duelo" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
          <Lado nome={a.nome} partido={a.partido} cor={INDIGO} pct={a.pct} rodape={`${fmt(a.votos)} votos`} {...lado(a)} />
          <Lado nome={b.nome} partido={b.partido} cor={AMBAR} pct={b.pct} rodape={`${fmt(b.votos)} votos`} direita {...lado(b)} />
        </div>
        <Faixa a={a} b={b} corA={INDIGO} corB={AMBAR} larga={larga} marca />
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', fontSize: '.8rem', color: t.cor.cinza }}>
          <span style={{ color: eleito ? t.cor.sim : undefined, fontWeight: eleito ? 800 : 400 }}>{eleito ? `✓ Eleito: ${bonito(eleito.nome)}` : ''}</span>
          <span>2º turno · 25 de outubro · Fonte: <a href="https://resultados.tse.jus.br/" target="_blank" rel="noopener noreferrer" style={{ color: 'inherit' }}>TSE</a></span>
        </div>
      </div>
    </>
  );
}

// Busca de candidatos (etapa 4, 31/10/2026): só quem foi candidato em 2026. A lista abre sobre o resumo; clicar leva à
// ficha do candidato; "Ver todos os resultados" leva à página Eleições com a busca preenchida. Deputado estadual só
// entra com estado escolhido (a fonte só lista por estado).
function BuscaCandidatos({ uf }) {
  const [q, setQ] = useState('');
  const [res, setRes] = useState(null); // null = nada pedido; { grupos, estadual } | { falhou }
  const [carregando, setCarregando] = useState(false);
  const [aberta, setAberta] = useState(true);
  const caixa = useRef(null);
  const termo = q.trim();

  useEffect(() => {
    if (termo.length < 2 && !/^\d+$/.test(termo)) { setRes(null); setCarregando(false); return undefined; }
    setCarregando(true);
    const ctrl = new AbortController();
    const id = setTimeout(() => {
      fetch(`/api/buscar-candidatos?q=${encodeURIComponent(termo)}${uf ? `&uf=${uf}` : ''}`, { signal: ctrl.signal })
        .then((r) => (r.ok ? r.json() : { falhou: true })).then((j) => { setRes(j); setCarregando(false); })
        .catch((e) => { if (e.name !== 'AbortError') { setRes({ falhou: true }); setCarregando(false); } });
    }, 250);
    return () => { clearTimeout(id); ctrl.abort(); };
  }, [termo, uf]);

  useEffect(() => {
    const fora = (e) => { if (caixa.current && !caixa.current.contains(e.target)) setAberta(false); };
    document.addEventListener('mousedown', fora);
    return () => document.removeEventListener('mousedown', fora);
  }, []);

  const mostrar = aberta && termo && (carregando || res);
  const grupos = res?.grupos || [];
  return (
    <div ref={caixa} className="elh-busca" style={{ position: 'relative', flex: '1 1 260px', minWidth: 0 }}
      onKeyDown={(e) => { if (e.key === 'Escape') setAberta(false); }}>
      <CampoBusca valor={q} aoMudar={(v) => { setQ(v); setAberta(true); }} placeholder="Buscar candidato por nome, partido ou número…" aoLabel="Buscar candidato das eleições de 2026" />
      {mostrar && (
        <div role="region" aria-label="Resultados da busca de candidatos" style={{ position: 'absolute', zIndex: 20, left: 0, right: 0, top: 'calc(100% + 8px)', background: t.cor.papelCartao, borderRadius: t.raio.md, boxShadow: '0 12px 32px rgba(36,30,82,.18)', padding: '10px 14px 12px', maxHeight: 420, overflowY: 'auto' }}>
          {carregando && !res && <p style={{ margin: '6px 2px', color: t.cor.cinza, fontSize: '.9rem' }}>Buscando…</p>}
          {res?.falhou && <p style={{ margin: '6px 2px', color: t.cor.cinza, fontSize: '.9rem' }}>Não foi possível buscar agora. Tente de novo em instantes.</p>}
          {res && !res.falhou && !grupos.length && !carregando && <p style={{ margin: '6px 2px', color: t.cor.cinza, fontSize: '.9rem' }}>Nenhum candidato encontrado para “{termo}”.</p>}
          {grupos.map((g) => (
            <div key={g.cargo}>
              <h4 style={{ ...rotuloCaixa, margin: '10px 2px 2px', display: 'flex', justifyContent: 'space-between' }}><span>{g.rotulo}</span><span style={{ fontWeight: 400 }}>{g.total} {g.total === 1 ? 'resultado' : 'resultados'}</span></h4>
              {g.itens.map((c) => (
                <Link key={c.slug} href={`${g.hrefBase}/${c.slug}`} className="elh-res" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '6px 4px', borderRadius: 8, textDecoration: 'none', color: 'inherit' }}>
                  <Avatar nome={c.nome} foto={c.foto} size={38} />
                  <span style={{ minWidth: 0, flex: 1 }}>
                    <b style={{ display: 'block', fontSize: '.92rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{bonito(c.nome)}</b>
                    <small style={{ color: t.cor.cinza, fontSize: '.8rem' }}>{c.partido}{c.numero ? ` · ${c.numero}` : ''}{c.uf ? ` · ${c.uf}` : ''}</small>
                  </span>
                </Link>
              ))}
            </div>
          ))}
          {res && !res.falhou && !carregando && (
            <div style={{ marginTop: 10, paddingTop: 10, borderTop: `1px solid ${t.cor.papelQuente2}`, display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', alignItems: 'baseline' }}>
              <small style={{ color: t.cor.cinza, fontSize: '.78rem' }}>{uf ? '' : 'Para achar deputados estaduais, escolha um estado ao lado.'}</small>
              {grupos.length > 0 && <Link href={hrefTodos(grupos, termo, uf)} style={linkOuro}>Ver todos os resultados <Seta direcao="direita" size={14} /></Link>}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function ResumoEleicoesHome({ chapas = [], children }) {
  const [d1, setD1] = useState(undefined); // undefined = carregando, null = sem resultado
  const [d2, setD2] = useState(undefined);
  const [aba, setAba] = useState(null);
  const [ufSalva, setUfSalva] = useState('');
  const [ufLida, setUfLida] = useState(false);
  const [fotos, setFotos] = useState({}); // 'cargo|UF|número' -> { foto, slug }
  const [pais, setPais] = useState(undefined); // undefined = não pedido/carregando, null = falhou
  const [ufVisita, setUfVisita] = useState(null); // null = não escolheu nesta visita; '' = "Todo o Brasil"
  const cache = useRef({});
  const [, redesenhar] = useState(0);

  useEffect(() => {
    const ctrl = new AbortController();
    const buscar = (url) => fetch(url, { signal: ctrl.signal }).then((r) => (r.ok ? r.json() : null)).then(pronto);
    Promise.all([buscar('/api/apuracao?cargo=presidente'), buscar('/api/apuracao?cargo=presidente&turno=2').catch((e) => { if (e.name === 'AbortError') throw e; return null; })])
      .then(([a, b]) => { setD1(a); setD2(b); setAba(b ? 2 : 1); })
      .catch((e) => { if (e.name !== 'AbortError') { setD1(null); setD2(null); } });
    return () => ctrl.abort();
  }, []);

  // Estado salvo (perfil ou navegador). Quando o perfil desce para o navegador, o evento avisa.
  useEffect(() => {
    const ler = () => { setUfSalva(ufLocal()); setUfLida(true); };
    ler();
    window.addEventListener(EVENTO_UF, ler);
    return () => window.removeEventListener(EVENTO_UF, ler);
  }, []);
  const uf = ufVisita !== null ? ufVisita : ufSalva;

  // Resumo do país: só é pedido quando não há estado (visitante ou "Todo o Brasil").
  useEffect(() => {
    if (!ufLida || uf || pais !== undefined) return undefined;
    const ctrl = new AbortController();
    fetch('/api/eleitos-brasil', { signal: ctrl.signal }).then((r) => (r.ok ? r.json() : null))
      .then((j) => setPais(j && (j.governadores || []).length ? j : null))
      .catch((e) => { if (e.name !== 'AbortError') setPais(null); });
    return () => ctrl.abort();
  }, [ufLida, uf, pais]);

  // Fotos e fichas dos governadores e senadores (já estão no Storage; só liga número -> foto). Sem estado: governadores do país.
  useEffect(() => {
    if (!ufLida) return undefined;
    const ctrl = new AbortController();
    const pedir = (cargo, ufP) => fetch(`/api/fotos-candidatos?cargo=${cargo}${ufP ? `&uf=${ufP}` : ''}`, { signal: ctrl.signal })
      .then((r) => (r.ok ? r.json() : { itens: [] }))
      .then((j) => setFotos((ant) => { const novo = { ...ant }; for (const i of j.itens || []) novo[chaveFoto(cargo, i.uf, i.numero)] = { foto: i.foto, slug: i.slug }; return novo; }))
      .catch(() => {});
    if (uf) { pedir('governador', uf); pedir('senador', uf); } else pedir('governador', '');
    return () => ctrl.abort();
  }, [ufLida, uf]);

  // Eleitos do estado: 4 cargos no 1º turno e, nos 6 estados com 2º turno, o governador do 2º turno.
  useEffect(() => {
    if (!uf || cache.current[uf]) return undefined;
    const ctrl = new AbortController();
    const get = (q) => fetch(`/api/apuracao?${q}`, { signal: ctrl.signal }).then((r) => (r.ok ? r.json() : null)).catch((e) => { if (e.name === 'AbortError') throw e; return null; });
    const tem2 = SEGUNDO_TURNO.ufs.includes(uf);
    Promise.all([
      get(`cargo=governador&uf=${uf}`), get(`cargo=senador&uf=${uf}`), get(`cargo=deputado-federal&uf=${uf}`), get(`cargo=deputado-estadual&uf=${uf}`),
      tem2 ? get(`cargo=governador&uf=${uf}&turno=2`) : Promise.resolve(null),
    ]).then(([gov, sen, df, de, g2]) => {
      cache.current[uf] = { gov, sen, df, de, g2: g2 && (g2.candidatos || []).length >= 2 && g2.secoes?.totalizadas > 0 ? g2 : null };
      redesenhar((n) => n + 1);
    }).catch((e) => { if (e.name !== 'AbortError') { cache.current[uf] = { falhou: true }; redesenhar((n) => n + 1); } });
    return () => ctrl.abort();
  }, [uf]);

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

  const dois = turno === 2 ? [...d2.candidatos].sort((a, b) => b.votos - a.votos).slice(0, 2) : dois1;
  const [a, b] = dois;
  const pa = num(a.pct);
  const pb = num(b.pct);
  const larga = (pa / ((pa + pb) || 1)) * 100;
  const eleito = turno === 2 ? dois.find((c) => c.eleito) : null;
  const completo = Number(dados.secoes.totalizadas) >= Number(dados.secoes.total);
  const haSegundoTurno = finalistas1.length >= 2;

  let titulo;
  if (turno === 2) titulo = eleito ? `${bonito(eleito.nome)} é eleito presidente` : (completo ? 'Resultado do 2º turno' : 'Apuração do 2º turno em andamento');
  else titulo = haSegundoTurno ? 'Dois candidatos foram ao 2º turno' : (completo ? 'Resultado do 1º turno' : 'Resultado parcial do 1º turno');
  const sem50 = turno === 1 && haSegundoTurno && Math.max(pa, pb) < 50;
  const nota = turno === 1 ? (sem50 ? 'Nenhum candidato passou de 50%' : '') : (eleito ? `✓ Eleito: ${bonito(eleito.nome)}` : '');
  const dataTurno = turno === 2 ? '25 de outubro' : '4 de outubro';
  const chapaDe = (c) => chapas.find((ch) => mesmo(c, ch));
  const rodapeDe = (c) => (turno === 2 ? `${fmt(c.votos)} votos · 1º turno: ${pct1De(c)}%` : `${fmt(c.votos)} votos válidos`);
  const ladoDe = (c, direita) => {
    const ch = chapaDe(c);
    return <Lado nome={c.nome} partido={c.partido} numero={c.numero} foto={ch?.presidente?.foto_url} href={ch?.presidente?.slug ? `/presidencial/${ch.presidente.slug}` : null} cor={corDe(c)} pct={c.pct} rodape={rodapeDe(c)} direita={direita} />;
  };

  const nomeUf = NOMES_UF[uf] || uf;
  const estado = uf ? cache.current[uf] : null;
  const tem2 = !!uf && SEGUNDO_TURNO.ufs.includes(uf);

  return (
    <section style={{ padding: '8px 24px 16px' }}>
      <div className="elh-fundo" style={{ background: t.cor.papelQuente2, borderRadius: t.raio.lg, padding: '22px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12, flexWrap: 'wrap' }}>
          <h2 style={{ fontFamily: t.fonte.titulo, fontWeight: 600, fontSize: '1.7rem', margin: '0 0 4px' }}>Eleições</h2>
          <Link href={`/eleicoes?visao=apuracao${turno === 2 ? '&turno=2' : ''}`} style={linkOuro}>Ver apuração completa <Seta direcao="direita" size={14} /></Link>
        </div>
        <p style={{ color: t.cor.cinza, fontSize: '0.92rem', margin: '0 0 16px' }}>
          {d2 ? 'Resumo do 1º turno (4 de outubro) e do 2º turno (25 de outubro)' : 'Resultado do 1º turno (4 de outubro)'}, com {dados.secoes.pct_totalizadas}% das seções apuradas.
        </p>

        <div className="elh-linha" style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-start', marginBottom: 6 }}>
          <BuscaCandidatos uf={uf} />
          <div style={{ flex: '0 1 340px', minWidth: 0, width: '100%', maxWidth: 340 }}>
            <CampoSelect opcoes={OPCOES_UF} valor={uf} placeholder="Escolha seu estado" aoLabel="Escolha o estado dos eleitos" icone={<Pino />} aoSelecionar={(v) => setUfVisita(v)} />
          </div>
        </div>
        <p style={{ margin: '0 4px 12px', textAlign: 'right', fontSize: '.78rem', color: t.cor.cinza, minHeight: '1.2em' }}>
          {uf ? <>Trocar aqui vale só para esta visita. Para mudar o estado do site, use o <Link href="/perfil" style={{ color: t.cor.ouroTexto, fontWeight: 700 }}>perfil</Link>.</> : ''}
        </p>

        <div style={{ background: t.cor.papelCartao, borderRadius: t.raio.lg, padding: '20px 24px', boxShadow: t.sombra.sutil }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap', marginBottom: 18 }}>
            <div>
              <h3 style={rotuloCaixa}>Presidente · {turno}º turno</h3>
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
            {ladoDe(a, false)}
            {ladoDe(b, true)}
          </div>
          <Faixa a={a} b={b} corA={corDe(a)} corB={corDe(b)} larga={larga} marca={turno === 2} />
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', fontSize: '.8rem', color: t.cor.cinza }}>
            <span style={{ color: nota.startsWith('✓') ? t.cor.sim : undefined, fontWeight: nota.startsWith('✓') ? 800 : 400 }}>{nota}</span>
            <span>{turno}º turno · {dataTurno} · Fonte: <a href="https://resultados.tse.jus.br/" target="_blank" rel="noopener noreferrer" style={{ color: 'inherit' }}>TSE</a></span>
          </div>
        </div>

        {!uf && ufLida && pais === undefined && <div aria-busy="true" style={{ minHeight: 260 }} />}
        {!uf && pais && turno === 1 && <PaisPrimeiroTurno p={pais} aoEscolher={setUfVisita} fotos={fotos} />}
        {!uf && pais && turno === 2 && <PaisSegundoTurno p={pais} aoEscolher={setUfVisita} fotos={fotos} />}
        {uf && !estado && <div aria-busy="true" style={{ minHeight: 260 }} />}
        {uf && estado?.falhou && <p style={{ margin: '18px 2px 0', color: t.cor.cinza, fontSize: '.9rem' }}>Não foi possível carregar os eleitos de {nomeUf} agora. Tente de novo em instantes.</p>}
        {uf && estado && !estado.falhou && turno === 1 && <EleitosDoEstado uf={uf} d={estado} fotos={fotos} />}
        {uf && estado && !estado.falhou && turno === 2 && (
          <>
            {tem2 && estado.g2 && <GovernoSegundoTurno uf={uf} g2={estado.g2} fotos={fotos} />}
            <div role="note" style={{ background: t.cor.papelQuente, borderRadius: t.raio.md, padding: '14px 18px', fontSize: '.92rem', marginTop: 14 }}>
              <b>Em {nomeUf} não houve 2º turno para {tem2 ? 'senador e deputados' : 'governador, senador e deputados'}.</b> Esses cargos foram decididos no 1º turno.{' '}
              <button type="button" onClick={() => setAba(1)} style={{ border: 'none', background: 'none', padding: 0, font: 'inherit', fontWeight: 700, color: t.cor.ouroTexto, cursor: 'pointer', textDecoration: 'underline' }}>Ver os eleitos do 1º turno</button>
            </div>
          </>
        )}

        <p style={{ margin: '14px 2px 0', fontSize: '.86rem' }}>
          <Link href="/eleicoes" style={linkOuro}>Ver todos os candidatos <Seta direcao="direita" size={14} /></Link>
        </p>
      </div>
      <style jsx global>{`
        .elh-lado:hover .elh-nome { text-decoration: underline; }
        .elh-nc { display: none; }
        .elh-res:hover { background: rgba(36,30,82,.07); }
        .elh-gov:hover { background: rgba(36,30,82,.07) !important; }
        .elh-gov:focus-visible { outline: 2px solid #241E52; outline-offset: 1px; }
        @media (max-width: 640px) {
          .elh-nl { display: none; }
          .elh-nc { display: inline; }
          .elh-fundo { padding: 16px !important; }
          .elh-duelo { grid-template-columns: 1fr !important; gap: 14px !important; }
          .elh-duelo > * { flex-direction: row !important; text-align: left !important; }
          .elh-g3, .elh-g2, .elh-sen, .elh-g3b { grid-template-columns: 1fr !important; }
          .elh-gp { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </section>
  );
}
