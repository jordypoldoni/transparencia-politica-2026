import { useState, useMemo } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import ServicoAPI from '../src/servicos/servico_api';
import { t } from '../src/estilo/tokens';
import { Seta, Pino } from '../components/icones';
import Trilha from '../components/Trilha';
import Segmentado from '../components/Segmentado';
import EscolhaCompacta from '../components/EscolhaCompacta';
import CampoSelect from '../components/CampoSelect';
import ReportarErro from '../components/ReportarErro';
import SeloAtualizacao from '../components/SeloAtualizacao';
import DadosEstruturados from '../components/DadosEstruturados';
import { hrefPerfil } from '../src/lib/casa';
import { fonteGastosEstadual } from '../src/lib/selosFonte';
import { reais } from '../src/lib/bancadaEstado';
import { COOKIE_UF } from '../src/lib/perfilUsuario';
import { NOMES_UF, CEAP_FONTE, CEAPS_FONTE, ATO_MESA_DIVULGACAO } from '../src/lib/cotas';
import { grafo, organizacao, site, migalhas, pagina as paginaLd } from '../src/lib/dadosEstruturados';
import {
  CASAS, MINIMOS, MINIMO_PADRAO, linhasDaCasa, comparacaoJusta, partidosDe, ufsDe, usoPorEstado,
  serieMensal, porTipo, ehDivulgacao, divulgacaoMensal, passagensPorAno, resumoRecursosSenado, anosDisponiveis, chaveDaCasa,
} from '../src/lib/gastosParlamentares';

// PÁGINA NOVA (21/10/2026, pedido do Jordy, item 6): a análise dos gastos dos parlamentares num lugar só.
// As listas /deputados, /deputados-estaduais e /senadores ficam só com a busca; a comparação mora aqui,
// com as correções do dia: cota do estado de cada um, só meses em exercício e fechados, divulgação da
// atividade parlamentar e passagens aéreas em seções próprias.
// Sem nota, sem cor de aprovação e sem número de posição (D-003): as barras mostram quanto da verba foi usada.
// A conta mora em src/lib/gastosParlamentares.js (tem teste).

const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
const POR_VEZ = 20;
const OPCOES_UF = Object.entries(NOMES_UF).map(([uf, nome]) => ({ valor: uf, rotulo: `${uf} · ${nome}`, busca: `${uf} ${nome}` }));

const mi = (v) => `R$ ${(v / 1e6).toFixed(1).replace('.', ',')} mi`;
const milhares = (v) => (v >= 1e6 ? mi(v) : reais(v));

const CSS = `
  .gp-cartao { background: ${t.cor.papelCartao}; border-radius: ${t.raio.md}; box-shadow: ${t.sombra.sutil}; padding: 22px 24px; margin: 0 0 20px; }
  .gp-sobre { font-size: 0.72rem; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase; color: ${t.cor.ouroTexto}; margin: 0 0 4px; }
  .gp-h2 { font-family: ${t.fonte.titulo}; font-weight: 600; font-size: clamp(1.25rem, 3vw, 1.5rem); line-height: 1.2; margin: 0 0 6px; }
  .gp-sub { color: ${t.cor.cinza}; font-size: 0.9rem; line-height: 1.5; margin: 0 0 16px; max-width: 70ch; }
  .gp-controles { display: flex; flex-wrap: wrap; gap: 10px 12px; align-items: center; margin: 0 0 20px; }
  .gp-ctl { flex: 1 1 180px; min-width: 180px; max-width: 240px; }
  .gp-ctl-uf { flex: 1.3 1 215px; min-width: 205px; max-width: 300px; }
  .gp-controles .so-computador { flex: 0 0 auto; }
  @media (min-width: 1240px) { .gp-controles { flex-wrap: nowrap; } .gp-ctl, .gp-ctl-uf { flex-basis: 0; min-width: 0; } }
  .gp-lista { list-style: none; padding: 0; margin: 0; display: grid; gap: 4px; }
  .gp-linha { display: grid; grid-template-columns: minmax(180px, 320px) 1fr 170px; align-items: center; column-gap: 16px; padding: 8px 10px; border-radius: ${t.raio.sm}; text-decoration: none; color: inherit; transition: background .15s; }
  a.gp-linha:hover, button.gp-linha:hover { background: ${t.cor.papelQuente}; }
  .gp-linha:focus-visible { outline: none; box-shadow: inset 0 0 0 2.5px ${t.cor.ouro}, ${t.sombra.anelFoco}; }
  button.gp-linha { border: none; background: transparent; font: inherit; text-align: left; cursor: pointer; width: 100%; }
  .gp-linha-uf { grid-template-columns: 120px 1fr 64px; }
  .gp-linha-tipo { grid-template-columns: minmax(180px, 300px) 1fr 110px; }
  .gp-trilho { display: block; height: 10px; border-radius: ${t.raio.pill}; background: ${t.cor.papelQuente2}; overflow: hidden; }
  .gp-trilho > i { display: block; height: 100%; border-radius: ${t.raio.pill}; }
  .gp-num { text-align: right; font-weight: 800; font-size: 0.92rem; white-space: nowrap; }
  .gp-num small { display: block; font-weight: 500; font-size: 0.74rem; color: ${t.cor.cinza}; }
  .gp-duas { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
  .gp-duas > .gp-cartao { margin: 0; }
  .gp-colunas { display: flex; align-items: flex-end; gap: 6px; height: 150px; }
  .gp-col { flex: 1; min-width: 0; display: flex; flex-direction: column; justify-content: flex-end; align-items: center; height: 100%; }
  .gp-par { display: flex; align-items: flex-end; gap: 2px; width: 100%; flex: 1; }
  .gp-par > i { flex: 1; display: block; border-radius: 5px 5px 0 0; min-height: 2px; }
  .gp-rot { font-size: 0.7rem; color: ${t.cor.cinza}; font-weight: 600; margin-top: 4px; }
  .gp-faixa { background: ${t.cor.papelQuente}; border-radius: ${t.raio.md}; padding: 12px 16px; margin: 14px 0 0; font-size: 0.84rem; line-height: 1.5; }
  .gp-faixa p { margin: 0; } .gp-faixa p + p { margin-top: 6px; }
  .gp-legenda { display: flex; flex-wrap: wrap; gap: 6px 16px; font-size: 0.78rem; color: ${t.cor.cinza}; margin: 10px 0 0; }
  .gp-legenda i { display: inline-block; width: 10px; height: 10px; border-radius: 3px; margin-right: 6px; vertical-align: -1px; }
  @media (max-width: 959px) { .gp-duas { grid-template-columns: 1fr; } .gp-duas > .gp-cartao { margin: 0 0 20px; } }
  @media (max-width: 719px) {
    .gp-cartao { padding: 18px 16px; }
    .gp-linha, .gp-linha-tipo { grid-template-columns: minmax(0, 1fr) auto; row-gap: 6px; }
    .gp-linha .gp-trilho { grid-column: 1 / -1; grid-row: 2; }
    .gp-linha-uf { grid-template-columns: 64px 1fr 52px; column-gap: 10px; }
    .gp-linha-uf .gp-trilho { grid-column: auto; grid-row: auto; }
    .gp-ctl, .gp-ctl-uf { flex: 1 1 100%; max-width: none; }
  }
`;

const botao = {
  padding: '10px 20px', fontSize: '0.9rem', fontWeight: 700, fontFamily: t.fonte.corpo, borderRadius: t.raio.pill,
  cursor: 'pointer', border: 'none', background: t.cor.verde, color: t.cor.ouro, boxShadow: t.sombra.botao,
  transition: 'box-shadow .15s, transform .15s',
};
const realce = (e, ligar) => {
  e.currentTarget.style.boxShadow = ligar ? t.sombra.botaoHover : t.sombra.botao;
  e.currentTarget.style.transform = ligar ? 'translateY(-1px)' : 'none';
};

function Trilho({ pct, cor = t.cor.verde }) {
  return <span className="gp-trilho" aria-hidden="true"><i style={{ width: `${Math.max(0, Math.min(pct, 100))}%`, background: cor }} /></span>;
}

// Quem entra na comparação justa. Sem número de posição: a ordem é a da lista, e o que se lê é a barra.
function Comparacao({ casa, linhas, filtros, setFiltro, ano }) {
  const [mostrar, setMostrar] = useState(POR_VEZ);
  const r = useMemo(() => comparacaoJusta(linhas, casa.chave, filtros), [linhas, casa.chave, filtros]);
  const ehAssembleia = casa.chave === 'assembleias';
  const maxMedia = r.itens.reduce((m, l) => Math.max(m, l.media || 0), 0) || 1;
  // Escala da barra do teto: 100% é o teto; quem passou dele estica a escala em vez de ficar todo igual (todos "cheios").
  const escalaTeto = Math.max(100, ...r.itens.map((l) => l.pct || 0));
  const visiveis = r.itens.slice(0, mostrar);

  let frase = null;
  if (!r.precisaEstado) {
    frase = `${r.itens.length} ${casa.plural} na comparação`;
    if (r.foraDoMinimo) frase += `; ${r.foraDoMinimo} ficaram de fora por terem menos de ${filtros.minMeses} ${filtros.minMeses === 1 ? 'mês contado' : 'meses contados'}`;
    if (r.semMedia) frase += `; ${r.semMedia} ainda sem mês fechado em exercício`;
    frase += '.';
  }

  return (
    <section className="gp-cartao" aria-labelledby="gp-comp">
      <p className="gp-sobre">Comparação justa</p>
      <h2 className="gp-h2" id="gp-comp">{ehAssembleia ? 'Gasto por mês dentro do mesmo estado' : 'Quanto da cota do estado cada um usou'}</h2>
      <p className="gp-sub">
        {ehAssembleia
          ? 'Cada Assembleia tem a sua verba e publica no seu ritmo, então a comparação é só dentro do mesmo estado, em reais por mês.'
          : `Média mensal de ${ano} dividida pelo teto mensal da cota do estado de cada um. A conta inclui todos os tipos de despesa, também divulgação e passagens (que têm seções próprias abaixo).`}
      </p>

      {r.precisaEstado ? (
        <p style={{ color: t.cor.cinza, margin: 0 }}>Escolha um estado no filtro acima para comparar as Assembleias.</p>
      ) : (
        <>
          <div style={{ margin: '0 0 12px' }}>
            <Segmentado aria="Sentido da lista" itens={[{ chave: 'maior', rotulo: 'Quem mais usou' }, { chave: 'menor', rotulo: 'Quem menos usou' }]
              .map((o) => ({ ...o, ativo: (filtros.ordem || 'maior') === o.chave, aoClicar: () => { setFiltro({ ordem: o.chave }); setMostrar(POR_VEZ); } }))} />
          </div>
          {filtros.ordem === 'menor' && r.itens.length > 0 && (
            <div className="gp-faixa" style={{ margin: '0 0 12px' }}>
              <p><strong>Gasto baixo nem sempre quer dizer economia.</strong> Pode ser quem assumiu no meio do ano, ficou licenciado ou ainda não teve a prestação de contas publicada. Por isso cada linha mostra os meses contados e a situação de quem não está em exercício.</p>
            </div>
          )}
          <p aria-live="polite" style={{ color: t.cor.cinza, fontSize: '0.84rem', margin: '0 0 10px' }}>{frase}</p>
          <ul className="gp-lista">
            {visiveis.map((l) => {
              const d = l.d;
              const valorBarra = ehAssembleia ? (l.media / maxMedia) * 100 : (l.pct == null ? 0 : (l.pct / escalaTeto) * 100);
              return (
                <li key={d.id}>
                  <Link href={hrefPerfil(d)} className="gp-linha">
                    <span style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                      <span style={{ minWidth: 0 }}>
                        <span style={{ display: 'block', fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{d.nome_urna}</span>
                        <span style={{ display: 'block', fontSize: '0.78rem', color: t.cor.cinza }}>{d.partido_atual} · {d.uf_sede}</span>
                        {d.situacao_atual && !/^exerc/i.test(d.situacao_atual) && (
                          // "Situação atual" com todas as letras: o cadastro guarda o estado de HOJE, não o do ano escolhido.
                          <span style={{ display: 'block', fontSize: '0.76rem', color: t.cor.ouroTexto, fontWeight: 600 }}>
                            Situação atual: {d.situacao_atual}{d.condicao_eleitoral && d.condicao_eleitoral !== 'Titular' ? ` (${d.condicao_eleitoral})` : ''}
                          </span>
                        )}
                      </span>
                    </span>
                    <Trilho pct={valorBarra} />
                    <span className="gp-num">
                      {ehAssembleia || l.pct == null ? reais(l.media) : `${l.pct}% do teto`}
                      <small>{ehAssembleia || l.pct == null ? `em ${l.meses} ${l.meses === 1 ? 'mês' : 'meses'}` : `${reais(l.media)} por mês, ${l.meses} ${l.meses === 1 ? 'mês' : 'meses'}`}</small>
                      {d.total != null && <small>{reais(d.total)} no ano</small>}
                      {l.teto != null && <small>teto de {reais(l.teto)} por mês</small>}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
          {r.itens.length === 0 && <p style={{ color: t.cor.cinza }}>Ninguém atende aos filtros escolhidos.</p>}
          {mostrar < r.itens.length && (
            <p style={{ margin: '14px 0 0', textAlign: 'center' }}>
              <button type="button" style={botao} onClick={() => setMostrar((m) => m + POR_VEZ)} onMouseOver={(e) => realce(e, true)} onMouseOut={(e) => realce(e, false)}>
                Ver mais {Math.min(POR_VEZ, r.itens.length - mostrar)}
              </button>
            </p>
          )}
        </>
      )}
    </section>
  );
}

function PorEstado({ linhas, minMeses, ufAtual, setFiltro, casa }) {
  const [todos, setTodos] = useState(false);
  const lista = useMemo(() => usoPorEstado(linhas, { minMeses }), [linhas, minMeses]);
  const mostrados = todos ? lista : lista.slice(0, 8);
  const max = lista.reduce((m, x) => Math.max(m, x.mediana), 0) || 1;
  if (lista.length === 0) return null;
  return (
    <section className="gp-cartao" aria-labelledby="gp-uf">
      <p className="gp-sobre">Por estado</p>
      <h2 className="gp-h2" id="gp-uf">Uso da cota por estado</h2>
      <p className="gp-sub">Mediana do uso do teto entre {casa.plural} de cada estado. Toque em um estado para ver só os parlamentares dele na comparação.</p>
      <ul className="gp-lista">
        {mostrados.map((e) => (
          <li key={e.uf}>
            <button type="button" className="gp-linha gp-linha-uf" onClick={() => setFiltro({ uf: ufAtual === e.uf ? '' : e.uf })} aria-pressed={ufAtual === e.uf}>
              <span style={{ fontWeight: ufAtual === e.uf ? 800 : 600, fontSize: '0.9rem' }}>{e.uf} <small style={{ color: t.cor.cinza, fontWeight: 500 }}>({e.n})</small></span>
              <Trilho pct={(e.mediana / max) * 100} cor={ufAtual === e.uf ? t.cor.ouro : t.cor.verde} />
              <span className="gp-num">{e.mediana}%</span>
            </button>
          </li>
        ))}
      </ul>
      {lista.length > 8 && (
        <button type="button" onClick={() => setTodos((v) => !v)} aria-expanded={todos}
          style={{ margin: '8px 0 0', padding: '4px 0', border: 'none', background: 'transparent', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px', fontFamily: t.fonte.corpo, fontSize: '0.84rem', fontWeight: 700, color: t.cor.ouroTexto }}>
          {todos ? 'Mostrar menos' : `Ver os ${lista.length} estados`} <Seta aberta={todos} size={14} />
        </button>
      )}
    </section>
  );
}

function PorMes({ agreg, casa, ano }) {
  const atual = useMemo(() => serieMensal(agreg, casa.casaAgregada, ano), [agreg, casa, ano]);
  const anterior = useMemo(() => serieMensal(agreg, casa.casaAgregada, ano - 1), [agreg, casa, ano]);
  const max = Math.max(...atual.map((m) => m.total), ...anterior.map((m) => m.total), 1);
  if (!atual.some((m) => m.temDado)) return null;
  const temAnterior = anterior.some((m) => m.temDado);
  const abertos = atual.filter((m) => m.temDado && m.aberto).map((m) => MESES[m.mes - 1]);
  return (
    <section className="gp-cartao" aria-labelledby="gp-mes">
      <p className="gp-sobre">Por mês</p>
      <h2 className="gp-h2" id="gp-mes">Gasto {casa.rotulo === 'Câmara' ? 'da Câmara' : 'do Senado'} mês a mês</h2>
      <p className="gp-sub">{temAnterior ? `${ano} contra ${ano - 1}.` : `${ano}.`} Meses ainda abertos, que seguem recebendo notas, aparecem mais claros.</p>
      <div className="gp-colunas" role="img" aria-label={`Gasto por mês em ${ano}`}>
        {atual.map((m, i) => (
          <div className="gp-col" key={m.mes} title={m.temDado ? `${MESES[i]}/${ano}: ${reais(m.total)}` : `${MESES[i]}/${ano}: sem dado`}>
            <span className="gp-par">
              {temAnterior && <i style={{ height: `${(anterior[i].total / max) * 100}%`, background: t.cor.papelQuente2 }} />}
              <i style={{ height: `${(m.total / max) * 100}%`, background: t.cor.verde, opacity: m.aberto ? 0.4 : 1 }} />
            </span>
            <span className="gp-rot">{MESES[i]}</span>
          </div>
        ))}
      </div>
      <p className="gp-legenda">
        <span><i style={{ background: t.cor.verde }} />{ano}</span>
        {temAnterior && <span><i style={{ background: t.cor.papelQuente2 }} />{ano - 1}</span>}
        {abertos.length > 0 && <span>Em aberto: {abertos.join(', ')}</span>}
      </p>
    </section>
  );
}

function OndeVai({ agreg, casa, ano }) {
  const { tipos, total } = useMemo(() => porTipo(agreg, casa.casaAgregada, ano), [agreg, casa, ano]);
  const div = useMemo(() => divulgacaoMensal(agreg, casa.casaAgregada, ano), [agreg, casa, ano]);
  if (tipos.length === 0) return null;
  const topo = tipos.slice(0, 8);
  const max = topo[0].valor || 1;
  const ehCamara = casa.chave === 'camara';
  // Câmara em 2026: o Ato da Mesa veda parte da divulgação nos 120 dias antes da eleição (a partir de 6/6/2026).
  // A nota só compara as médias mensais antes e depois dessa data; não afirma que a queda é efeito do Ato.
  const antes = div.slice(0, 5).filter((m) => m.temDado);
  const depois = div.slice(5).filter((m) => m.temDado && !m.aberto);
  const media = (v) => (v.length ? v.reduce((s, m) => s + m.total, 0) / v.length : null);
  const mAntes = media(antes); const mDepois = media(depois);
  const mostraNota = ehCamara && ano === 2026 && mAntes != null && mDepois != null;
  return (
    <section className="gp-cartao" aria-labelledby="gp-tipo">
      <p className="gp-sobre">Onde o dinheiro vai</p>
      <h2 className="gp-h2" id="gp-tipo">Gasto {casa.rotulo === 'Câmara' ? 'da Câmara' : casa.rotulo === 'Senado' ? 'do Senado' : `das ${casa.rotulo}`} por tipo, {ano}</h2>
      <p className="gp-sub">Total do ano: {mi(total)}. A divulgação da atividade parlamentar aparece em âmbar porque tem regra própria nas eleições.</p>
      <ul className="gp-lista">
        {topo.map((x) => (
          <li key={x.tipo} className="gp-linha gp-linha-tipo">
            <span style={{ fontSize: '0.88rem', overflowWrap: 'anywhere' }}>{rotuloTipo(x.tipo)}</span>
            <Trilho pct={(x.valor / max) * 100} cor={ehDivulgacao(x.tipo) ? t.cor.ouro : t.cor.verde} />
            <span className="gp-num">{milhares(x.valor)}</span>
          </li>
        ))}
      </ul>
      {tipos.length > topo.length && <p className="gp-sub" style={{ margin: '8px 0 0' }}>Há mais {tipos.length - topo.length} tipos menores, somados no total.</p>}
      {mostraNota && (
        <div className="gp-faixa">
          <p><strong>Divulgação da atividade parlamentar:</strong> média de {mi(mAntes)} por mês de janeiro a maio e de {mi(mDepois)} por mês de junho em diante.</p>
          <p>Nos 120 dias antes da eleição (a partir de 6 de junho de 2026), o <a href={ATO_MESA_DIVULGACAO} target="_blank" rel="noopener noreferrer" style={{ color: t.cor.ouroTexto, fontWeight: 600 }}>Ato da Mesa nº 108/2013, art. 11</a> veda a impressão e a distribuição de produtos gráficos de divulgação por deputado candidato, salvo se ele não for candidato.</p>
        </div>
      )}
    </section>
  );
}

// "DIVULGAÇÃO DA ATIVIDADE PARLAMENTAR." vira "Divulgação da atividade parlamentar": o arquivo da Câmara vem em caixa alta.
function rotuloTipo(tipo) {
  const s = String(tipo || '').replace(/\s+,\s*/g, ', ').replace(/\.$/, '').trim();
  if (s === s.toUpperCase()) { const m = s.toLowerCase(); return m.charAt(0).toUpperCase() + m.slice(1); }
  return s;
}

function Passagens({ agreg, casa, anoAtual }) {
  const anos = useMemo(() => anosDisponiveis(agreg, casa.casaAgregada).slice(0, 3).reverse(), [agreg, casa]);
  const dados = useMemo(() => passagensPorAno(agreg, casa.casaAgregada, anos), [agreg, casa, anos]);
  if (!dados.some((d) => d.total !== 0)) return null;
  const ehCamara = casa.chave === 'camara';
  const completos = dados.filter((d) => (ehCamara ? d.sigepa != null : d.total > 0));
  const destaque = completos[completos.length - 1] || dados[dados.length - 1];
  const max = Math.max(...destaque.meses.map((m) => m.total), 1);
  const faltando = ehCamara ? dados.filter((d) => d.sigepa == null && d.ano <= anoAtual) : [];
  return (
    <section className="gp-cartao" aria-labelledby="gp-pass">
      <p className="gp-sobre">Passagens aéreas</p>
      <h2 className="gp-h2" id="gp-pass">{ehCamara ? 'Passagens aéreas da Câmara' : 'Passagens do Senado'}</h2>
      <p className="gp-sub">
        {dados.filter((d) => d.total > 0).map((d) => `${mi(d.total)} em ${d.ano}`).join(', ')}.
        {' '}Valores mensais de {destaque.ano}, em reais.
      </p>
      <div className="gp-colunas" role="img" aria-label={`Passagens por mês em ${destaque.ano}`}>
        {destaque.meses.map((m, i) => (
          <div className="gp-col" key={m.mes} title={`${MESES[i]}/${destaque.ano}: ${reais(m.total)}`}>
            <span className="gp-par"><i style={{ height: `${(m.total / max) * 100}%`, background: t.cor.verde }} /></span>
            <span className="gp-rot">{MESES[i]}</span>
          </div>
        ))}
      </div>
      {faltando.length > 0 && (
        <div className="gp-faixa">
          <p><strong>{faltando.map((d) => d.ano).join(' e ')}:</strong> o arquivo oficial da Câmara não traz as passagens aéreas emitidas pelo sistema SIGEPA nesse ano. Só essa parte falta: as demais passagens (reembolso, RPA, missão oficial) e a divulgação entram na comparação acima. Como o SIGEPA pesa cerca de 15% do gasto da Câmara em 2024 e 2025, quem mais viaja de avião tende a aparecer com uso menor em 2026 do que realmente teve. Se a Câmara voltar a publicar, elas entram aqui.</p>
        </div>
      )}
    </section>
  );
}

// Senado: o que fica fora da cota e os benefícios (21/10/2026). Só fato e fonte: sem posição, sem nota.
function ForaDaCota({ recursos, ano }) {
  const r = useMemo(() => resumoRecursosSenado(recursos), [recursos]);
  if (!r || r.itens.every((x) => x.valor === 0)) return null;
  const max = r.itens[0].valor || 1;
  return (
    <section className="gp-cartao" aria-labelledby="gp-fora">
      <p className="gp-sobre">Fora da cota e benefícios</p>
      <h2 className="gp-h2" id="gp-fora">O que o Senado paga além da cota, {ano}</h2>
      <p className="gp-sub">Total de {r.n} senadores: {mi(r.total)}. Esses valores não entram na média nem no uso do teto acima. Os nomes são os que o Senado usa.</p>
      <ul className="gp-lista">
        {r.itens.map((x) => (
          <li key={x.recurso} className="gp-linha gp-linha-tipo">
            <span style={{ fontSize: '0.88rem', overflowWrap: 'anywhere' }}>{x.recurso}<small style={{ display: 'block', color: t.cor.cinza }}>{x.usam} de {r.n} senadores</small></span>
            <Trilho pct={(x.valor / max) * 100} cor={t.cor.verde} />
            <span className="gp-num">{milhares(x.valor)}</span>
          </li>
        ))}
      </ul>
      {r.beneficios.length > 0 && (
        <div className="gp-faixa">
          {r.beneficios.map((b) => (
            <p key={b.beneficio}><strong>{b.beneficio}:</strong> {b.usam} de {b.n} senadores utilizam.</p>
          ))}
        </div>
      )}
      <p className="gp-sub" style={{ margin: '8px 0 0' }}>Fonte: <a href="https://adm.senado.gov.br/adm-dadosabertos" target="_blank" rel="noopener noreferrer" style={{ color: t.cor.ouroTexto, fontWeight: 600 }}>dados abertos do Senado (recursos utilizados)</a>.</p>
    </section>
  );
}

function ComoLemos({ casa }) {
  const [aberto, setAberto] = useState(false);
  const p = { margin: '8px 0 0', fontSize: '0.86rem', lineHeight: 1.55 };
  const link = { color: t.cor.ouroTexto, fontWeight: 600 };
  return (
    <section className="gp-cartao" style={{ padding: '14px 24px' }}>
      <button type="button" aria-expanded={aberto} onClick={() => setAberto((a) => !a)}
        style={{ width: '100%', padding: '4px 0', minHeight: '32px', border: 'none', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px', fontFamily: t.fonte.corpo, fontSize: '0.95rem', fontWeight: 700, color: t.cor.tinta }}>
        Como lemos os números <Seta aberta={aberto} size={16} />
      </button>
      {aberto && (
        <div>
          <p style={p}><strong>Média por mês:</strong> soma das notas dos meses em que a pessoa esteve em exercício por 15 dias ou mais e que já fecharam (30 dias depois do fim do mês, quando quase todas as notas já foram emitidas), dividida por esses meses. Mês em exercício sem gasto entra na conta.</p>
          <p style={p}><strong>O que entra:</strong> todos os tipos de despesa, inclusive divulgação e passagens. Única ausência conhecida: as passagens SIGEPA da Câmara em 2026, que o arquivo oficial não traz.</p>
          {casa.chave !== 'assembleias' && <p style={p}><strong>Uso do teto:</strong> a média por mês dividida pelo teto mensal da {casa.chave === 'senado' ? 'cota do Senado' : 'cota da Câmara'} para o estado de cada um (<a href={casa.chave === 'senado' ? CEAPS_FONTE : CEAP_FONTE} target="_blank" rel="noopener noreferrer" style={link}>tabela oficial</a>). Acima de 100% quer dizer que a média ficou acima do valor dessa tabela; confira na fonte.</p>}
          {casa.chave === 'senado' && <p style={p}>Os senadores são poucos por estado, então a lista mostra os valores sem número de posição.</p>}
          {casa.chave === 'assembleias' && <p style={p}>O Lume só tem o teto da verba de gabinete da Assembleia de SP. Nas outras, a comparação é em reais por mês, dentro do mesmo estado.</p>}
          <p style={p}><strong>Mínimo de meses:</strong> quem tem menos meses contados fica fora da lista, porque uma média de um ou dois meses oscila muito. Dá para mudar o mínimo no filtro; quem ficou de fora é sempre contado acima da lista.</p>
          <p style={p}>Gasto alto ou baixo, sozinho, não mede o trabalho de ninguém. Fonte: dados abertos da {casa.chave === 'camara' ? 'Câmara dos Deputados' : casa.chave === 'senado' ? 'Senado Federal' : 'Assembleia de cada estado'}.</p>
        </div>
      )}
    </section>
  );
}

function PaginaGastos({ casaChave, ano, anosDaCasa, radar, agreg, recursos, ufInicial, canonical }) {
  const router = useRouter();
  const casa = CASAS.find((c) => c.chave === casaChave) || CASAS[0];
  const linhas = useMemo(() => linhasDaCasa(radar, casa.chave), [radar, casa.chave]);
  const partidos = useMemo(() => partidosDe(linhas), [linhas]);
  const ufsComDado = useMemo(() => ufsDe(linhas), [linhas]);
  const anos = anosDaCasa && anosDaCasa.length ? anosDaCasa : [ano];

  const [filtros, setFiltros] = useState({ uf: ufInicial, partido: '', minMeses: MINIMO_PADRAO, ordem: 'maior' });
  const setFiltro = (parcial) => setFiltros((f) => ({ ...f, ...parcial }));

  const irPara = (parcial) => {
    const q = { casa: casa.chave, ano, ...parcial };
    router.push({ pathname: '/gastos-parlamentares', query: { casa: q.casa, ano: q.ano } });
  };

  const titulo = 'Gastos parlamentares: quanto cada um usou da verba pública | Lume';
  const desc = 'Compare os gastos de deputados federais, senadores e deputados estaduais de forma justa: pela cota do estado de cada um e só pelos meses em exercício. Com a fonte oficial de cada número.';
  const ld = grafo(
    organizacao(), site(),
    migalhas([{ nome: 'Início', caminho: '/' }, { nome: 'Gastos parlamentares', caminho: '/gastos-parlamentares' }]),
    paginaLd({ nome: titulo, descricao: desc, caminho: '/gastos-parlamentares', tipo: 'CollectionPage' }),
  );
  const opcoesUf = casa.chave === 'assembleias' ? OPCOES_UF.filter((o) => ufsComDado.includes(o.valor)) : OPCOES_UF;
  const selo = casa.chave === 'camara' ? { fonte: 'gastos_camara', nome: 'Gastos da Câmara' }
    : casa.chave === 'senado' ? { fonte: 'gastos_senado', nome: 'Gastos do Senado' }
    : (filtros.uf && fonteGastosEstadual(filtros.uf) ? { ...fonteGastosEstadual(filtros.uf), nome: `Gastos da Assembleia (${filtros.uf})` } : null);

  return (
    <>
      <Head>
        <title>{titulo}</title>
        <meta name="description" content={desc} />
        <link rel="canonical" href={canonical} />
        <meta property="og:title" content={titulo} />
        <meta property="og:description" content={desc} />
      </Head>
      <DadosEstruturados dados={ld} id="ld-gastos-parlamentares" />
      <style jsx global>{CSS}</style>
      <div className="pagina">
        <Trilha itens={[{ nome: 'Início', href: '/' }, { nome: 'Gastos', href: '/gastos-publicos' }, { nome: 'Gastos parlamentares' }]} />
        <h1 style={{ fontFamily: t.fonte.titulo, fontWeight: 600, fontSize: 'clamp(1.9rem,5vw,2.8rem)', margin: '0 0 8px', lineHeight: 1.1 }}>Gastos parlamentares</h1>
        <p style={{ color: t.cor.cinza, margin: '0 0 20px', maxWidth: '70ch', lineHeight: 1.5 }}>
          Quanto cada parlamentar usou da verba a que tem direito, comparado de forma justa: pela cota do estado de cada um e só pelos meses em que estava em exercício.
        </p>

        <div className="gp-controles">
          <div className="so-celular gp-ctl">
            <EscolhaCompacta rotulo="Casa" valor={casa.chave} aoEscolher={(c) => router.push({ pathname: '/gastos-parlamentares', query: { casa: c, ano } })}
              opcoes={CASAS.map((c) => ({ valor: c.chave, rotulo: c.rotulo }))} />
          </div>
          <div className="so-computador">
            <Segmentado aria="Casa" itens={CASAS.map((c) => ({ chave: c.chave, rotulo: c.rotulo, ativo: c.chave === casa.chave, aoClicar: () => router.push({ pathname: '/gastos-parlamentares', query: { casa: c.chave, ano } }) }))} />
          </div>
          <div className="gp-ctl">
            <EscolhaCompacta rotulo="Ano" prefixo="Ano" valor={String(ano)} aoEscolher={(a) => irPara({ ano: a })} opcoes={anos.map((a) => ({ valor: String(a), rotulo: String(a) }))} />
          </div>
          <div className="gp-ctl-uf">
            <CampoSelect opcoes={opcoesUf} valor={filtros.uf} placeholder={casa.chave === 'assembleias' ? 'Escolher estado' : 'Todos os estados'} aoLabel="Filtrar por estado" icone={<Pino />}
              aoSelecionar={(u) => setFiltro({ uf: u })} />
          </div>
          <div className="gp-ctl">
            <EscolhaCompacta rotulo="Partido" prefixo="Partido" valor={filtros.partido} aoEscolher={(p) => setFiltro({ partido: p })}
              opcoes={[{ valor: '', rotulo: 'Todos' }, ...partidos.map((p) => ({ valor: p, rotulo: p }))]} />
          </div>
          <div className="gp-ctl">
            <EscolhaCompacta rotulo="Mínimo de meses" prefixo="Mínimo" valor={String(filtros.minMeses)} aoEscolher={(m) => setFiltro({ minMeses: Number(m) })}
              opcoes={MINIMOS.map((m) => ({ valor: String(m), rotulo: m === 0 ? 'Sem mínimo' : `${m} ${m === 1 ? 'mês' : 'meses'}` }))} />
          </div>
          {(filtros.uf || filtros.partido) && (
            <button type="button" style={{ ...botao, padding: '8px 16px' }} onClick={() => setFiltro({ uf: '', partido: '' })} onMouseOver={(e) => realce(e, true)} onMouseOut={(e) => realce(e, false)}>Limpar filtros</button>
          )}
        </div>
        {selo && <div style={{ margin: '0 0 16px' }}><SeloAtualizacao {...selo} /></div>}

        <Comparacao casa={casa} linhas={linhas} filtros={filtros} setFiltro={setFiltro} ano={ano} />

        {casa.temTeto && (
          <div className="gp-duas" style={{ marginBottom: '20px' }}>
            <PorEstado linhas={linhas} minMeses={filtros.minMeses} ufAtual={filtros.uf} setFiltro={setFiltro} casa={casa} />
            {casa.casaAgregada && <PorMes agreg={agreg} casa={casa} ano={ano} />}
          </div>
        )}
        {casa.casaAgregada && <OndeVai agreg={agreg} casa={casa} ano={ano} />}
        {casa.casaAgregada && <Passagens agreg={agreg} casa={casa} anoAtual={ano} />}
        {casa.chave === 'senado' && <ForaDaCota recursos={recursos} ano={ano} />}
        <ComoLemos casa={casa} />

        <p style={{ marginTop: '24px' }}><ReportarErro assunto="Página Gastos parlamentares" /></p>
      </div>
    </>
  );
}

// key: ao trocar de casa ou ano a página é a mesma; sem a chave o React guardaria filtros da casa anterior.
export default function PaginaGastosParlamentares(props) { return <PaginaGastos key={`${props.casaChave}-${props.ano}`} {...props} />; }

const UF_VALIDA = /^(AC|AL|AP|AM|BA|CE|DF|ES|GO|MA|MT|MS|MG|PA|PB|PR|PE|PI|RJ|RN|RS|RO|RR|SC|SP|SE|TO)$/;

export async function getServerSideProps({ query, req }) {
  const casaChave = CASAS.some((c) => c.chave === query.casa) ? query.casa : 'camara';
  // Só oferece anos que existem para a casa (o RS só tem 2026, o MG 2025 e 2026, o SP 2024 a 2026).
  const anosPorCasaRadar = await ServicoAPI.getAnosDoRadar();
  const anosDaCasa = [...new Set(Object.entries(anosPorCasaRadar).filter(([c]) => chaveDaCasa(c) === casaChave).flatMap(([, a]) => a))].sort((a, b) => b - a);
  const anoPedido = parseInt(query.ano, 10);
  const ano = anosDaCasa.includes(anoPedido) ? anoPedido : (anosDaCasa[0] || 2026);
  const [radarTudo, agreg, recursos] = await Promise.all([ServicoAPI.getRadarCompleto(ano), ServicoAPI.getGastosAgregados(), casaChave === 'senado' ? ServicoAPI.getRecursosSenado(ano) : Promise.resolve([])]);
  // Só a casa pedida vai para o navegador, e só os campos que a tela usa (o payload cheio passava de 190 kB; sem foto, que a lista não mostra).
  const radar = linhasDaCasa(radarTudo, casaChave).map(({ d }) => ({
    id: d.id, slug: d.slug, nome_urna: d.nome_urna, partido_atual: d.partido_atual, uf_sede: d.uf_sede,
    casa: d.casa, total: d.total, meses_com_gasto: d.meses_com_gasto, meses_base: d.meses_base ?? null, total_base: d.total_base ?? null,
    situacao_atual: d.situacao_atual ?? null, condicao_eleitoral: d.condicao_eleitoral ?? null,
  }));
  const casaAgregada = CASAS.find((c) => c.chave === casaChave).casaAgregada;
  const agregCasa = casaAgregada ? agreg.filter((r) => r.casa === casaAgregada) : [];
  const ufCookie = String(req.cookies?.[COOKIE_UF] || '').toUpperCase();
  const ufAssembleia = UF_VALIDA.test(ufCookie) && radar.some((d) => d.uf_sede === ufCookie) ? ufCookie : '';
  const ufUrl = String(query.uf || '').toUpperCase();
  const ufInicial = UF_VALIDA.test(ufUrl) ? ufUrl : (casaChave === 'assembleias' ? ufAssembleia : '');
  const proto = req.headers['x-forwarded-proto'] || 'http';
  const canonical = `${proto}://${req.headers.host}/gastos-parlamentares`;
  return { props: { casaChave, ano, anosDaCasa, radar: JSON.parse(JSON.stringify(radar)), agreg: JSON.parse(JSON.stringify(agregCasa)), recursos: JSON.parse(JSON.stringify(recursos)), ufInicial, canonical } };
}
