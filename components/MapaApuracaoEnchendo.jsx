import { useState, useEffect, useMemo } from 'react';
import { t } from '../src/estilo/tokens';
import { NOMES_UF } from '../src/lib/cotas';
import ReplayMapa from './ReplayMapa';
import { fracaoPorUf, ufsRecebendo, candidatosOrdemFixa, intervaloMapaMs, pctNumero } from '../src/lib/mapaVivo';

// MAPA QUE ENCHE NA APURAÇÃO AO VIVO (25/10/2026, pedido do Jordy): a mesma animação do replay (o estado enche de baixo para cima conforme as
// seções são apuradas), com dados reais de /api/apuracao-estados. A cor marca a REGIÃO, nunca partido. Regras de neutralidade do replay (D-074):
// candidatos em ordem fixa por número de urna e no mesmo estilo; aviso fixo de que o % parcial depende da ordem de chegada; votos por estado
// (nunca por município); cobertura de seções sempre visível. `nacional` = resposta de /api/apuracao já carregada pela tela (total do país).
const fmt = (x) => Number(x || 0).toLocaleString('pt-BR');
const cartao = { background: t.cor.papelCartao, borderRadius: t.raio.md, boxShadow: t.sombra.media, padding: '16px 18px' };

const CSS = `
  .mae { display: grid; grid-template-columns: minmax(0, 1fr); gap: 16px; }
  .mae > * { min-width: 0; }
  @media (min-width: 900px) { .mae { grid-template-columns: minmax(0, 1.5fr) minmax(340px, 1fr); gap: 16px 28px; align-items: stretch; } }
  .mae-lado { display: flex; flex-direction: column; gap: 12px; }
  .mae-esc { margin: 0; display: flex; flex-wrap: wrap; align-items: baseline; gap: 4px 12px; font-size: 0.9rem; color: ${t.cor.tinta}; }
  .mae-volta { border: 0; background: ${t.cor.papelQuente2}; color: ${t.cor.tinta}; font: 700 0.82rem ${t.fonte.corpo}; padding: 6px 14px; border-radius: ${t.raio.pill}; cursor: pointer; }
  .mae-lista { margin: 0; padding: 0; list-style: none; display: grid; gap: 10px; }
  .mae-linha { background: ${t.cor.papelQuente}; border-radius: ${t.raio.sm}; padding: 10px 14px; }
  .mae-topo { display: flex; align-items: baseline; gap: 10px; flex-wrap: wrap; }
  .mae-num { font-weight: 800; color: ${t.cor.cinza}; min-width: 2.2em; }
  .mae-nome { flex: 1 1 120px; min-width: 0; font-weight: 700; color: ${t.cor.tinta}; }
  .mae-nome small { font-weight: 500; color: ${t.cor.cinza}; }
  .mae-pct { font-weight: 800; color: ${t.cor.tinta}; margin-left: auto; text-align: right; }
  .mae-pct small { font-weight: 600; color: ${t.cor.cinza}; white-space: nowrap; }
  .mae-trilho { display: block; height: 8px; border-radius: 999px; background: ${t.cor.papelQuente2}; margin-top: 8px; overflow: hidden; }
  .mae-barra { display: block; height: 100%; background: ${t.cor.ouro}; border-radius: 999px; }
  .mae-aviso { margin: 0; font-size: 0.82rem; line-height: 1.5; color: ${t.cor.cinza}; }
  .mae-erro { margin: 0; font-size: 0.9rem; color: ${t.cor.alertaTexto}; }
`;

export default function MapaApuracaoEnchendo({ turno = 2, nacional = null }) {
  const [dados, setDados] = useState(null);
  const [falhou, setFalhou] = useState(false);
  const [ufSel, setUfSel] = useState(null);

  // Carrega /api/apuracao-estados e repete sozinho (10 s com seções entrando, 30 s nos outros casos). Aba escondida não consulta.
  useEffect(() => {
    let vivo = true;
    let timer = null;
    const ctrl = new AbortController();
    const url = `/api/apuracao-estados${turno === 2 ? '?turno=2' : ''}`;
    const carregar = async () => {
      let atraso = 30000;
      try {
        const r = await fetch(url, { signal: ctrl.signal });
        if (!r.ok) throw new Error(String(r.status));
        const j = await r.json();
        if (!vivo) return;
        setDados(j); setFalhou(false);
        atraso = intervaloMapaMs(j.estados);
      } catch (e) {
        if (!vivo || e.name === 'AbortError') return;
        setFalhou(true); // mantém o que já estava na tela
      }
      if (vivo) timer = setTimeout(() => { if (document.visibilityState === 'visible') carregar(); else timer = setTimeout(carregar, 30000); }, atraso);
    };
    carregar();
    return () => { vivo = false; clearTimeout(timer); ctrl.abort(); };
  }, [turno]);

  const estados = dados ? dados.estados : null;
  const fracao = useMemo(() => fracaoPorUf(estados), [estados]);
  const recebendo = useMemo(() => ufsRecebendo(fracao), [fracao]);
  const escolher = (uf) => setUfSel((atual) => (atual === uf ? null : uf));

  // Painel: o estado escolhido (dos arquivos por estado) ou o total do país (o mesmo número do restante da tela).
  const alvo = ufSel ? estados && estados[ufSel] : nacional;
  const secoes = alvo && alvo.secoes;
  const linhas = alvo ? candidatosOrdemFixa(alvo.candidatos) : [];
  const nomeEscopo = ufSel ? (NOMES_UF[ufSel] || ufSel) : 'Brasil';

  return (
    <>
      <section className="mae" aria-label="Mapa da apuração, estado por estado">
        <div>
          {dados ? (
            <ReplayMapa fracao={fracao} recebendo={recebendo} estimadas={[]} selecionada={ufSel} aoEscolher={escolher}
              ariaLabel="Mapa do Brasil com os 27 estados. O preenchimento de cada estado mostra quanto das seções do estado já foi apurado pelo TSE." />
          ) : (
            <p className="mae-aviso" role="status">{falhou ? 'Não foi possível ler o resultado por estado agora. A tela tenta de novo sozinha.' : 'Carregando o mapa…'}</p>
          )}
        </div>
        <div className="mae-lado">
          <p className="mae-esc">
            <span><b>{nomeEscopo}</b>{secoes ? ` · seções apuradas: ${fmt(secoes.totalizadas)} de ${fmt(secoes.total)} (${secoes.pct_totalizadas || '0,00'}%)` : ''}</span>
            {ufSel && <button type="button" className="mae-volta" onClick={() => setUfSel(null)}>Ver total do Brasil</button>}
          </p>
          {!ufSel && <p className="mae-aviso">Clique em um estado do mapa para ver só ele.</p>}
          {falhou && dados && <p className="mae-erro" role="status">A última atualização falhou, mostrando o dado anterior.</p>}
          {ufSel && linhas.length > 0 && (
            <ul className="mae-lista" aria-label={`Votos dos candidatos a presidente: ${nomeEscopo}`}>
              {linhas.map((c) => (
                <li key={`${c.numero}-${c.nome}`} className="mae-linha">
                  <div className="mae-topo">
                    <span className="mae-num">{c.numero}</span>
                    <span className="mae-nome">{c.nome} <small>{c.partido}</small></span>
                    <span className="mae-pct">{c.pct || '0,00'}% <small>{fmt(c.votos)}</small></span>
                  </div>
                  <span className="mae-trilho" aria-hidden="true"><span className="mae-barra" style={{ width: `${pctNumero(c.pct)}%` }} /></span>
                </li>
              ))}
            </ul>
          )}
          {ufSel && <p className="mae-aviso">Candidatos em ordem de número de urna, sempre a mesma. O percentual parcial depende da ordem em que os estados e as seções são apurados e não indica o resultado final. Os números são do TSE, por estado, nunca por município.</p>}
        </div>
      </section>
      <style jsx global>{CSS}</style>
    </>
  );
}
