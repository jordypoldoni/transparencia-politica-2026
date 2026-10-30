import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/router';
import CampoSelect from './CampoSelect';
import Segmentado from './Segmentado';
import { NOMES_UF } from '../src/lib/cotas';
import { SEGUNDO_TURNO } from '../src/lib/turnos';
import { t } from '../src/estilo/tokens';

// Mapa por estados (D-026): só carrega quando o usuário escolhe essa visão.
const MapaBrasilApuracao = dynamic(() => import('./MapaBrasilApuracao'), { ssr: false, loading: () => <p style={{ color: t.cor.cinza }}>Carregando o mapa…</p> });
// Celular (D-032): o mapa de verdade depende de hover e tem estados minúsculos; no celular entra a grade de quadrados.
const MapaGradeApuracao = dynamic(() => import('./MapaGradeApuracao'), { ssr: false, loading: () => <p style={{ color: t.cor.cinza }}>Carregando o resultado por estado…</p> });

// APURAÇÃO dentro de "Eleições 2026" (02/10/2026). Mostra o resultado oficial do TSE lido por
// /api/apuracao (cache de 10 s na borda com a apuração em andamento, 30 s nos outros casos; nada é guardado no banco). A tela se atualiza sozinha
// enquanto a aba está aberta. Texto neutro: só número e fonte.
const UFS = ['AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'];
const PROPORCIONAL = new Set(['deputado-federal', 'deputado-estadual']);
const INTERVALO_MS = 30000;
const INTERVALO_APURANDO_MS = 10000;
// Mesma regra do cache da API: 10 s enquanto há seções sendo apuradas (0 < totalizadas < total), 30 s quando
// ainda não começou ou já chegou a 100%.
const intervaloDe = (d) => (d && d.secoes && d.secoes.totalizadas > 0 && d.secoes.totalizadas < d.secoes.total ? INTERVALO_APURANDO_MS : INTERVALO_MS);

// Aviso de 25/10/2026 (2º turno): o STF (ministro Zanin) estendeu a votação até as 19h de Brasília e o TSE pausou a divulgação.
// Some sozinho: depois das 19h, assim que as seções passam do que já havia sido apurado na pausa (1.225), ou ao fim do dia.
const PAUSA_FIM_MS = Date.parse('2026-10-25T22:00:00Z');
const PAUSA_SECOES = 1225;
const DIA_FIM_MS = Date.parse('2026-10-26T03:00:00Z');
const avisoVotacaoProrrogada = (turno, d) => {
  if (turno !== 2) return false;
  const agora = Date.now();
  if (agora >= DIA_FIM_MS) return false;
  if (agora < PAUSA_FIM_MS) return true;
  return !(d && d.secoes && d.secoes.totalizadas > PAUSA_SECOES);
};

const fmt = (x) => Number(x || 0).toLocaleString('pt-BR');
const numPct = (s) => { const v = Number(String(s ?? '0').replace(/\./g, '').replace(',', '.')); return Number.isFinite(v) ? Math.max(0, Math.min(100, v)) : 0; };

function useApuracao(cargo, uf, turno) {
  const [estado, setEstado] = useState({ chave: '', dados: null, erro: null });
  useEffect(() => {
    const chave = `${cargo}|${uf}|${turno}`;
    const ctrl = new AbortController();
    let vivo = true;
    let timer = null;
    let atrasoMs = INTERVALO_MS;
    const url = `/api/apuracao?cargo=${encodeURIComponent(cargo)}${cargo === 'presidente' ? '' : `&uf=${encodeURIComponent(uf)}`}${turno === 2 ? '&turno=2' : ''}`;
    const carregar = async () => {
      try {
        const r = await fetch(url, { signal: ctrl.signal });
        const corpo = await r.json().catch(() => ({}));
        if (!vivo) return;
        if (!r.ok) throw Object.assign(new Error(corpo.erro || `erro ${r.status}`), { codigo: corpo.erro });
        setEstado({ chave, dados: corpo, erro: null });
        atrasoMs = intervaloDe(corpo);
      } catch (e) {
        if (!vivo || e.name === 'AbortError') return;
        // Mantém o que já estava na tela; só avisa que a última atualização falhou.
        // `nao_publicado`: o TSE ainda não divulgou o arquivo deste cargo/estado (não é falha de leitura).
        setEstado((antes) => ({ chave, dados: antes.chave === chave ? antes.dados : null, erro: e.codigo === 'tse_nao_publicou' ? 'nao_publicado' : 'falhou' }));
      }
    };
    setEstado((antes) => (antes.chave === chave ? antes : { chave, dados: null, erro: null }));
    // O intervalo muda conforme o andamento, então o agendamento é recursivo (e não um setInterval fixo).
    const agendar = () => {
      timer = setTimeout(async () => {
        if (document.visibilityState === 'visible') await carregar();
        if (vivo) agendar();
      }, atrasoMs);
    };
    carregar();
    agendar();
    return () => { vivo = false; clearTimeout(timer); ctrl.abort(); };
  }, [cargo, uf, turno]);
  return estado;
}

const cartao = { background: t.cor.papelCartao, borderRadius: t.raio.md, boxShadow: t.sombra.sutil, padding: '16px 18px' };

function Dado({ rotulo, valor, sub }) {
  return (
    <div style={{ ...cartao, padding: '12px 14px' }}>
      <p style={{ margin: 0, fontSize: '0.7rem', fontWeight: 800, letterSpacing: '0.05em', textTransform: 'uppercase', color: t.cor.cinza }}>{rotulo}</p>
      <p style={{ margin: '4px 0 0', fontSize: '1.15rem', fontWeight: 800, color: t.cor.tinta }}>{valor}</p>
      {sub && <p style={{ margin: '2px 0 0', fontSize: '0.76rem', color: t.cor.cinza }}>{sub}</p>}
    </div>
  );
}

function Selo({ children }) {
  return <span style={{ display: 'inline-block', padding: '2px 10px', borderRadius: t.raio.pill, background: t.cor.verde, color: '#fff', fontSize: '0.7rem', fontWeight: 800, letterSpacing: '0.03em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>{children}</span>;
}

function LinhaCandidato({ c, posicao, mostrarBarra }) {
  return (
    <li style={{ ...cartao, padding: '12px 14px', listStyle: 'none' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px', flexWrap: 'wrap' }}>
        {Number(c.votos) > 0 && <span style={{ fontWeight: 800, color: t.cor.cinza, minWidth: '1.6em' }}>{posicao}º</span>}
        <span style={{ fontWeight: 700, color: t.cor.tinta, flex: '1 1 160px', minWidth: 0 }}>{c.nome}
          <span style={{ fontWeight: 500, color: t.cor.cinza, fontSize: '0.84rem' }}> · {c.partido} {c.numero}</span>
        </span>
        {c.eleito && <Selo>Eleito</Selo>}
        {c.segundoTurno && <Selo>2º turno</Selo>}
        <span style={{ fontWeight: 800, color: t.cor.tinta, whiteSpace: 'nowrap' }}>{fmt(c.votos)} <span style={{ fontWeight: 600, color: t.cor.cinza, fontSize: '0.84rem' }}>({c.pct || '0,00'}%)</span></span>
      </div>
      {mostrarBarra && (
        <div aria-hidden="true" style={{ height: '8px', borderRadius: t.raio.pill, background: t.cor.papelQuente2, margin: '8px 0 2px', overflow: 'hidden' }}>
          <div style={{ width: `${numPct(c.pct)}%`, height: '100%', background: t.cor.ouro, borderRadius: t.raio.pill }} />
        </div>
      )}
      {(c.vice || c.coligacao) && (
        <p style={{ margin: '6px 0 0', fontSize: '0.8rem', color: t.cor.cinza, lineHeight: 1.45 }}>
          {c.vice ? `Vice: ${c.vice.nome}${c.vice.partido ? ` (${c.vice.partido})` : ''}` : ''}
          {c.vice && c.coligacao ? ' · ' : ''}
          {c.coligacao ? `Coligação: ${c.coligacao}` : ''}
        </p>
      )}
    </li>
  );
}

const subtitulo = { fontFamily: t.fonte.titulo, fontWeight: 600, fontSize: '1.25rem', margin: '26px 0 10px' };

export default function ApuracaoEleicao({ cargo, ufInicial, turno = 1 }) {
  const router = useRouter();
  // No 2º turno só existem os estados com disputa de governo (regras em src/lib/turnos.js).
  const ufsDoTurno = turno === 2 ? SEGUNDO_TURNO.ufs : UFS;
  const [uf, setUf] = useState(ufsDoTurno.includes(ufInicial) ? ufInicial : (turno === 2 ? ufsDoTurno[0] : 'SP'));
  const { chave, dados, erro } = useApuracao(cargo, uf, turno);
  const atual = chave === `${cargo}|${uf}|${turno}`;
  const d = atual ? dados : null;
  const proporcional = PROPORCIONAL.has(cargo);

  const trocarUf = (nova) => {
    setUf(nova);
    router.replace({ pathname: router.pathname, query: { visao: 'apuracao', cargo, uf: nova, ...(turno === 2 ? { turno: 2 } : {}) } }, undefined, { shallow: true });
  };
  const opcoesUf = ufsDoTurno.map((u) => ({ valor: u, rotulo: `${u} · ${NOMES_UF[u] || u}`, busca: `${u} ${NOMES_UF[u] || ''}` }));
  const naoComecou = d && d.secoes.totalizadas === 0;
  const pctDe = (x) => (x ? `${x}%` : null);
  const numeros = d ? [
    { rotulo: 'Eleitorado', valor: fmt(d.eleitorado.total) },
    { rotulo: 'Comparecimento', valor: fmt(d.eleitorado.comparecimento), sub: pctDe(d.eleitorado.pct_comparecimento) },
    { rotulo: 'Abstenção', valor: fmt(d.eleitorado.abstencao), sub: pctDe(d.eleitorado.pct_abstencao) },
    { rotulo: 'Votos válidos', valor: fmt(d.votos.validos), sub: pctDe(d.votos.pct_validos) },
    { rotulo: 'Brancos', valor: fmt(d.votos.brancos), sub: pctDe(d.votos.pct_brancos) },
    { rotulo: 'Nulos', valor: fmt(d.votos.nulos), sub: pctDe(d.votos.pct_nulos) },
  ] : [];
  // Visão por estados: só presidente, nos dois turnos (30/10/2026: o 2º turno segue o padrão do 1º, pedido do Jordy).
  const [visao, setVisao] = useState('lista');
  const podeMapa = cargo === 'presidente';
  const porEstados = podeMapa && visao === 'estados';

  const listaCandidatos = d && !proporcional ? (
    <>
              <h2 style={subtitulo}>Candidatos por votos</h2>
              <ol style={{ margin: 0, padding: 0, display: 'grid', gap: '10px' }}>
                {d.candidatos.map((c, i) => <LinhaCandidato key={`${c.numero}-${c.nome}`} c={c} posicao={i + 1} mostrarBarra />)}
              </ol>
            </>
  ) : null;

  return (
    <div>
      {cargo !== 'presidente' && (
        <div style={{ maxWidth: '360px', marginBottom: '16px' }}>
          <CampoSelect opcoes={opcoesUf} valor={uf} placeholder="Escolha o estado" aoLabel="Estado da apuração" aoSelecionar={trocarUf} />
        </div>
      )}

      {!d && !erro && <p style={{ color: t.cor.cinza }}>Buscando o resultado no TSE…</p>}
      {!d && erro === 'nao_publicado' && (
        <p style={{ color: t.cor.alertaTexto, lineHeight: 1.5 }}>
          O TSE ainda não publicou o resultado deste cargo neste estado. Esta tela confere de novo sozinha a cada 30 segundos. Você também pode consultar direto no{' '}
          <a href="https://resultados.tse.jus.br/" target="_blank" rel="noopener noreferrer" style={{ color: t.cor.ouroTexto, fontWeight: 700 }}>portal de resultados do TSE</a>.
        </p>
      )}
      {!d && erro && erro !== 'nao_publicado' && (
        <p style={{ color: t.cor.alertaTexto, lineHeight: 1.5 }}>
          Não foi possível ler o resultado do TSE agora. A tela tenta de novo sozinha a cada 30 segundos. Você também pode consultar direto no{' '}
          <a href="https://resultados.tse.jus.br/" target="_blank" rel="noopener noreferrer" style={{ color: t.cor.ouroTexto, fontWeight: 700 }}>portal de resultados do TSE</a>.
        </p>
      )}

      {d && (
        <>
          {naoComecou && (
            <div style={{ background: t.cor.alertaBg, color: t.cor.alertaTexto, borderRadius: t.raio.md, padding: '14px 18px', margin: '0 0 16px', lineHeight: 1.5, fontSize: '0.92rem' }}>
              A apuração ainda não começou. O TSE divulga os resultados depois do fim da votação, às 17h (horário de Brasília) de {turno === 2 ? '25' : '4'} de outubro. Esta tela se atualiza sozinha a cada 30 segundos.
            </div>
          )}

          {/* CELULAR: como era (cartão de progresso + quadros em grade). */}
          <div className="so-celular">
            {podeMapa && (
              <div style={{ marginBottom: '12px' }}>
                <Segmentado aria="Forma de ver o resultado" itens={[
                  { rotulo: 'Lista', ativo: !porEstados, aoClicar: () => setVisao('lista') },
                  { rotulo: 'Mapa por estados', ativo: porEstados, aoClicar: () => setVisao('estados') },
                ]} />
              </div>
            )}
            <div style={{ ...cartao, marginBottom: '12px' }}>
              <p style={{ margin: 0, fontWeight: 700, color: t.cor.tinta }}>
                {d.nome_cargo || 'Cargo'}{cargo === 'presidente' ? ' · Brasil' : ` · ${NOMES_UF[uf] || uf}`}{turno === 2 ? ' · 2º turno' : ''}
                {d.vagas ? <span style={{ fontWeight: 500, color: t.cor.cinza }}> · {fmt(d.vagas)} {d.vagas === 1 ? 'vaga' : 'vagas'}</span> : null}
              </p>
              <p style={{ margin: '10px 0 6px', fontSize: '0.9rem', color: t.cor.tinta }}>
                Seções apuradas: <strong>{fmt(d.secoes.totalizadas)}</strong> de {fmt(d.secoes.total)} ({d.secoes.pct_totalizadas || '0,00'}%)
              </p>
              <div aria-hidden="true" style={{ height: '10px', borderRadius: t.raio.pill, background: t.cor.papelQuente2, overflow: 'hidden' }}>
                <div style={{ width: `${numPct(d.secoes.pct_totalizadas)}%`, height: '100%', background: t.cor.verde, borderRadius: t.raio.pill }} />
              </div>
              {avisoVotacaoProrrogada(turno, d) && <p role="status" style={{ margin: '8px 0 0', fontSize: '0.84rem', fontWeight: 700, color: t.cor.tinta, lineHeight: 1.45 }}>Votação prorrogada até as 19h (horário de Brasília) por decisão do ministro Zanin, do STF. A divulgação da apuração está pausada pelo TSE e os números voltam a mudar quando ela for retomada.</p>}
              {d.gerado_em && <p style={{ margin: '8px 0 0', fontSize: '0.76rem', color: t.cor.cinza }}>{d.origem === 'soma_dos_estados' ? `Soma dos 27 estados e do exterior, o arquivo nacional do TSE ainda não atualizou. Arquivos dos estados gerados até ${d.gerado_em}` : `Arquivo do TSE gerado em ${d.gerado_em}`}{erro ? ' · a última atualização falhou, mostrando o dado anterior' : ''}.</p>}
            </div>
            {!porEstados && (
              <div style={{ display: 'grid', gap: '10px', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))' }}>
                {numeros.map((n) => <Dado key={n.rotulo} rotulo={n.rotulo} valor={n.valor} sub={n.sub} />)}
              </div>
            )}
          </div>

          {/* COMPUTADOR (12/10/2026): um cartão só (região comum): progresso, escolha de visão e os seis números
              dividindo a largura, separados por filetes. Substitui os dois cartões-botão e os quadros soltos. */}
          <section className="so-computador" style={{ ...cartao, padding: '18px 8px 16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px 16px', flexWrap: 'wrap', padding: '0 18px', marginBottom: '14px' }}>
              <div style={{ flex: '1 1 360px', minWidth: 0 }}>
                <p style={{ margin: 0, fontWeight: 700, color: t.cor.tinta }}>
                  {d.nome_cargo || 'Cargo'}{cargo === 'presidente' ? ' · Brasil' : ` · ${NOMES_UF[uf] || uf}`}{turno === 2 ? ' · 2º turno' : ''}
                  {d.vagas ? <span style={{ fontWeight: 500, color: t.cor.cinza }}> · {fmt(d.vagas)} {d.vagas === 1 ? 'vaga' : 'vagas'}</span> : null}
                </p>
                <p style={{ margin: '8px 0 6px', fontSize: '0.9rem', color: t.cor.tinta }}>
                  Seções apuradas: <strong>{fmt(d.secoes.totalizadas)}</strong> de {fmt(d.secoes.total)} ({d.secoes.pct_totalizadas || '0,00'}%)
                </p>
                <div aria-hidden="true" style={{ height: '8px', borderRadius: t.raio.pill, background: t.cor.papelQuente2, overflow: 'hidden' }}>
                  <div style={{ width: `${numPct(d.secoes.pct_totalizadas)}%`, height: '100%', background: t.cor.verde, borderRadius: t.raio.pill }} />
                </div>
                {avisoVotacaoProrrogada(turno, d) && <p role="status" style={{ margin: '8px 0 0', fontSize: '0.84rem', fontWeight: 700, color: t.cor.tinta, lineHeight: 1.45 }}>Votação prorrogada até as 19h (horário de Brasília) por decisão do ministro Zanin, do STF. A divulgação da apuração está pausada pelo TSE e os números voltam a mudar quando ela for retomada.</p>}
                {d.gerado_em && <p style={{ margin: '8px 0 0', fontSize: '0.76rem', color: t.cor.cinza }}>{d.origem === 'soma_dos_estados' ? `Soma dos 27 estados e do exterior, o arquivo nacional do TSE ainda não atualizou. Arquivos dos estados gerados até ${d.gerado_em}` : `Arquivo do TSE gerado em ${d.gerado_em}`}{erro ? ' · a última atualização falhou, mostrando o dado anterior' : ''}.</p>}
              </div>
              {podeMapa && (
                <Segmentado aria="Forma de ver o resultado" itens={[
                  { rotulo: 'Lista', ativo: !porEstados, aoClicar: () => setVisao('lista') },
                  { rotulo: 'Mapa por estados', ativo: porEstados, aoClicar: () => setVisao('estados') },
                ]} />
              )}
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', borderTop: `1px solid ${t.cor.papelQuente2}`, paddingTop: '14px' }}>
              {numeros.map((n, i) => (
                <div key={n.rotulo} style={{ flex: '1 1 150px', padding: '2px 16px', boxShadow: i === 0 ? 'none' : `inset 1px 0 0 ${t.cor.papelQuente2}` }}>
                  <p style={{ margin: 0, fontSize: '0.7rem', fontWeight: 800, letterSpacing: '0.05em', textTransform: 'uppercase', color: t.cor.cinza }}>{n.rotulo}</p>
                  <p style={{ margin: '3px 0 0', fontSize: '1.1rem', fontWeight: 800, color: t.cor.tinta }}>
                    {n.valor}{n.sub && <span style={{ marginLeft: '6px', fontSize: '0.78rem', fontWeight: 600, color: t.cor.cinza }}>{n.sub}</span>}
                  </p>
                </div>
              ))}
            </div>
          </section>

          {!proporcional && porEstados && (
            <>
              <div className="so-computador" style={{ marginTop: '26px' }}><MapaBrasilApuracao turno={turno} /></div>
              <div className="so-celular" style={{ marginTop: '4px' }}><MapaGradeApuracao turno={turno} /></div>
            </>
          )}
          {!proporcional && !porEstados && listaCandidatos}

          {proporcional && (
            <>
              {d.eleitos.length > 0 && (
                <>
                  <h2 style={subtitulo}>Eleitos ({fmt(d.eleitos.length)} de {fmt(d.vagas)} vagas)</h2>
                  <ol style={{ margin: 0, padding: 0, display: 'grid', gap: '10px' }}>
                    {d.eleitos.map((c, i) => <LinhaCandidato key={`e-${c.numero}-${c.nome}`} c={c} posicao={i + 1} />)}
                  </ol>
                </>
              )}
              <h2 style={subtitulo}>Mais votados</h2>
              <p style={{ margin: '0 0 10px', fontSize: '0.84rem', color: t.cor.cinza }}>
                {fmt(d.candidatos.length)} de {fmt(d.total_candidatos)} candidatos, em ordem de votos. A distribuição das vagas é por partido ou federação, então o mais votado pode não ser eleito.
              </p>
              <ol style={{ margin: 0, padding: 0, display: 'grid', gap: '10px' }}>
                {d.candidatos.map((c, i) => <LinhaCandidato key={`m-${c.numero}-${c.nome}`} c={c} posicao={i + 1} />)}
              </ol>
              {d.partidos && d.partidos.length > 0 && (
                <>
                  <h2 style={subtitulo}>Partidos e federações</h2>
                  <ul style={{ margin: 0, padding: 0, display: 'grid', gap: '8px' }}>
                    {d.partidos.slice(0, 40).map((p) => (
                      <li key={p.nome} style={{ ...cartao, padding: '10px 14px', listStyle: 'none', display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'baseline' }}>
                        <span style={{ fontWeight: 700, flex: '1 1 200px', minWidth: 0 }}>{p.nome}</span>
                        <span style={{ fontSize: '0.84rem', color: t.cor.cinza }}>{fmt(p.votos_nominais + p.votos_legenda)} votos</span>
                        <span style={{ fontWeight: 800 }}>{fmt(p.vagas)} {p.vagas === 1 ? 'vaga' : 'vagas'}</span>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </>
          )}

          <p style={{ margin: '24px 0 0', fontSize: '0.82rem', color: t.cor.cinza, lineHeight: 1.55 }}>
            Fonte: resultado oficial do{' '}
            <a href="https://resultados.tse.jus.br/" target="_blank" rel="noopener noreferrer" style={{ color: t.cor.ouroTexto, fontWeight: 700 }}>TSE</a>,
            lido a cada 10 a 30 segundos (10 enquanto a apuração está em andamento), sem edição. Números parciais mudam conforme as seções são apuradas. O Boletim de Urna de cada seção, impresso e divulgado pelo TSE, pode ser conferido no portal de resultados.
          </p>
        </>
      )}
    </div>
  );
}
