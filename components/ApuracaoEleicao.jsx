import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import CampoSelect from './CampoSelect';
import { NOMES_UF } from '../src/lib/cotas';
import { t } from '../src/estilo/tokens';

// APURAÇÃO dentro de "Eleições 2026" (02/10/2026). Mostra o resultado oficial do TSE lido por
// /api/apuracao (cache de ~30 s na borda; nada é guardado no banco). A tela se atualiza sozinha
// enquanto a aba está aberta. Texto neutro: só número e fonte.
const UFS = ['AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'];
const PROPORCIONAL = new Set(['deputado-federal', 'deputado-estadual']);
const INTERVALO_MS = 30000;

const fmt = (x) => Number(x || 0).toLocaleString('pt-BR');
const numPct = (s) => { const v = Number(String(s ?? '0').replace(/\./g, '').replace(',', '.')); return Number.isFinite(v) ? Math.max(0, Math.min(100, v)) : 0; };

function useApuracao(cargo, uf) {
  const [estado, setEstado] = useState({ chave: '', dados: null, erro: null });
  useEffect(() => {
    const chave = `${cargo}|${uf}`;
    const ctrl = new AbortController();
    let vivo = true;
    const url = `/api/apuracao?cargo=${encodeURIComponent(cargo)}${cargo === 'presidente' ? '' : `&uf=${encodeURIComponent(uf)}`}`;
    const carregar = async () => {
      try {
        const r = await fetch(url, { signal: ctrl.signal });
        const corpo = await r.json().catch(() => ({}));
        if (!vivo) return;
        if (!r.ok) throw new Error(corpo.erro || `erro ${r.status}`);
        setEstado({ chave, dados: corpo, erro: null });
      } catch (e) {
        if (!vivo || e.name === 'AbortError') return;
        // Mantém o que já estava na tela; só avisa que a última atualização falhou.
        setEstado((antes) => ({ chave, dados: antes.chave === chave ? antes.dados : null, erro: 'falhou' }));
      }
    };
    setEstado((antes) => (antes.chave === chave ? antes : { chave, dados: null, erro: null }));
    carregar();
    const timer = setInterval(() => { if (document.visibilityState === 'visible') carregar(); }, INTERVALO_MS);
    return () => { vivo = false; clearInterval(timer); ctrl.abort(); };
  }, [cargo, uf]);
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
        <span style={{ fontWeight: 800, color: t.cor.cinza, minWidth: '1.6em' }}>{posicao}º</span>
        <span style={{ fontWeight: 700, color: t.cor.tinta, flex: '1 1 160px', minWidth: 0 }}>{c.nome}
          <span style={{ fontWeight: 500, color: t.cor.cinza, fontSize: '0.84rem' }}> · {c.partido} {c.numero}</span>
        </span>
        {c.eleito && <Selo>Eleito</Selo>}
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

export default function ApuracaoEleicao({ cargo, ufInicial }) {
  const router = useRouter();
  const [uf, setUf] = useState(UFS.includes(ufInicial) ? ufInicial : 'SP');
  const { chave, dados, erro } = useApuracao(cargo, uf);
  const atual = chave === `${cargo}|${uf}`;
  const d = atual ? dados : null;
  const proporcional = PROPORCIONAL.has(cargo);

  const trocarUf = (nova) => {
    setUf(nova);
    router.replace({ pathname: router.pathname, query: { visao: 'apuracao', cargo, uf: nova } }, undefined, { shallow: true });
  };
  const opcoesUf = UFS.map((u) => ({ valor: u, rotulo: `${u} · ${NOMES_UF[u] || u}`, busca: `${u} ${NOMES_UF[u] || ''}` }));
  const naoComecou = d && d.secoes.totalizadas === 0;

  return (
    <div>
      {cargo !== 'presidente' && (
        <div style={{ maxWidth: '360px', marginBottom: '16px' }}>
          <CampoSelect opcoes={opcoesUf} valor={uf} placeholder="Escolha o estado" aoLabel="Estado da apuração" aoSelecionar={trocarUf} />
        </div>
      )}

      {!d && !erro && <p style={{ color: t.cor.cinza }}>Buscando o resultado no TSE…</p>}
      {!d && erro && (
        <p style={{ color: t.cor.alertaTexto, lineHeight: 1.5 }}>
          Não foi possível ler o resultado do TSE agora. A tela tenta de novo sozinha a cada 30 segundos. Você também pode consultar direto no{' '}
          <a href="https://resultados.tse.jus.br/" target="_blank" rel="noopener noreferrer" style={{ color: t.cor.ouroTexto, fontWeight: 700 }}>portal de resultados do TSE</a>.
        </p>
      )}

      {d && (
        <>
          {naoComecou && (
            <div style={{ background: t.cor.alertaBg, color: t.cor.alertaTexto, borderRadius: t.raio.md, padding: '14px 18px', margin: '0 0 16px', lineHeight: 1.5, fontSize: '0.92rem' }}>
              A apuração ainda não começou. O TSE divulga os resultados depois do fim da votação, às 17h (horário de Brasília) de 4 de outubro. Esta tela se atualiza sozinha a cada 30 segundos.
            </div>
          )}

          <div style={{ ...cartao, marginBottom: '12px' }}>
            <p style={{ margin: 0, fontWeight: 700, color: t.cor.tinta }}>
              {d.nome_cargo || 'Cargo'}{cargo === 'presidente' ? ' · Brasil' : ` · ${NOMES_UF[uf] || uf}`}
              {d.vagas ? <span style={{ fontWeight: 500, color: t.cor.cinza }}> · {fmt(d.vagas)} {d.vagas === 1 ? 'vaga' : 'vagas'}</span> : null}
            </p>
            <p style={{ margin: '10px 0 6px', fontSize: '0.9rem', color: t.cor.tinta }}>
              Seções apuradas: <strong>{fmt(d.secoes.totalizadas)}</strong> de {fmt(d.secoes.total)} ({d.secoes.pct_totalizadas || '0,00'}%)
            </p>
            <div aria-hidden="true" style={{ height: '10px', borderRadius: t.raio.pill, background: t.cor.papelQuente2, overflow: 'hidden' }}>
              <div style={{ width: `${numPct(d.secoes.pct_totalizadas)}%`, height: '100%', background: t.cor.verde, borderRadius: t.raio.pill }} />
            </div>
            {d.gerado_em && <p style={{ margin: '8px 0 0', fontSize: '0.76rem', color: t.cor.cinza }}>Arquivo do TSE gerado em {d.gerado_em}{erro ? ' · a última atualização falhou, mostrando o dado anterior' : ''}.</p>}
          </div>

          <div style={{ display: 'grid', gap: '10px', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))' }}>
            <Dado rotulo="Eleitorado" valor={fmt(d.eleitorado.total)} />
            <Dado rotulo="Comparecimento" valor={fmt(d.eleitorado.comparecimento)} sub={d.eleitorado.pct_comparecimento ? `${d.eleitorado.pct_comparecimento}%` : null} />
            <Dado rotulo="Abstenção" valor={fmt(d.eleitorado.abstencao)} sub={d.eleitorado.pct_abstencao ? `${d.eleitorado.pct_abstencao}%` : null} />
            <Dado rotulo="Votos válidos" valor={fmt(d.votos.validos)} sub={d.votos.pct_validos ? `${d.votos.pct_validos}%` : null} />
            <Dado rotulo="Brancos" valor={fmt(d.votos.brancos)} sub={d.votos.pct_brancos ? `${d.votos.pct_brancos}%` : null} />
            <Dado rotulo="Nulos" valor={fmt(d.votos.nulos)} sub={d.votos.pct_nulos ? `${d.votos.pct_nulos}%` : null} />
          </div>

          {!proporcional && (
            <>
              <h2 style={subtitulo}>Candidatos por votos</h2>
              <ol style={{ margin: 0, padding: 0, display: 'grid', gap: '10px' }}>
                {d.candidatos.map((c, i) => <LinhaCandidato key={`${c.numero}-${c.nome}`} c={c} posicao={i + 1} mostrarBarra />)}
              </ol>
            </>
          )}

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

          <p style={{ margin: '24px 0 0', fontSize: '0.82rem', color: t.cor.cinza, lineHeight: 1.55, maxWidth: '75ch' }}>
            Fonte: resultado oficial do{' '}
            <a href="https://resultados.tse.jus.br/" target="_blank" rel="noopener noreferrer" style={{ color: t.cor.ouroTexto, fontWeight: 700 }}>TSE</a>,
            lido a cada 30 segundos, sem edição. Números parciais mudam conforme as seções são apuradas. O Boletim de Urna de cada seção, impresso e divulgado pelo TSE, pode ser conferido no portal de resultados.
          </p>
        </>
      )}
    </div>
  );
}
