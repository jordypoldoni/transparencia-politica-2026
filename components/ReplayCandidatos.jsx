import { t } from '../src/estilo/tokens';
import { MAPA_BRASIL } from '../src/lib/mapaBrasilGeo';
import { pctUrnas } from '../src/lib/replayApuracao';

// VOTOS DOS CANDIDATOS NO REPLAY (22/10/2026, D-074, regras de neutralidade aprovadas pelo Jordy). Só desenha; os números vêm de votosNoMinuto.
// Regras: (1) ordem FIXA por número de urna, nunca reordena; (2) todas as barras iguais, sem cor de partido nem destaque de quem lidera;
// (3) escala fixa de 0 a 60% (não muda com o minuto) e percentual sobre o TOTAL de votos válidos (D-076), não sobre o já apurado; (4) o traço fino em cada barra marca o valor ao FIM do replay, igual para todos;
// (5) a cobertura (urnas recebidas) fica sempre visível na tela, e o rodapé (aviso "Como ler", regra 2) diz que o percentual é parcial e não indica o resultado final.
const ESCALA = 60;
const pct1 = (v) => v.toFixed(1).replace('.', ',');
const num = (v) => Number(v).toLocaleString('pt-BR');

export default function ReplayCandidatos({ parcial, final, uf = null, fracaoUf = null, estimada = false, aoVoltar }) {
  const nomeUf = uf ? (MAPA_BRASIL.estados.find((g) => g.uf === uf) || {}).nome || uf : null;
  const linhas = parcial && parcial.linhas.length ? parcial.linhas : null;
  const refPor = {};
  if (final) for (const l of final.linhas) refPor[l.n] = l.pct;
  return (
    <section className="rc" aria-label="Votos dos candidatos a presidente neste horário">
      <h2 className="rc-tit">Votos dos candidatos <span>presidente, % do total de votos válidos</span></h2>
      <div className="rc-escopo">
        {uf ? (
          <>
            <span><b>{nomeUf}</b>{fracaoUf != null ? ` · ${pctUrnas(fracaoUf)}% das urnas do estado recebidas${estimada ? ' (horário estimado)' : ''}` : ''}</span>
            <button type="button" className="rc-volta" onClick={aoVoltar}>Ver total</button>
          </>
        ) : <span>Total do Brasil, com o exterior · clique em um estado do mapa para ver só ele</span>}
      </div>
      {linhas && <p className="rc-cont">{num(parcial.validos)} de {num(parcial.baseValidos)} votos válidos contados</p>}
      {!linhas ? <p className="rc-vazio">Carregando os votos…</p> : (
        <ul className="rc-lista">
          {linhas.map((l) => (
            <li key={l.n} className="rc-linha">
              <span className="rc-num">{l.n}</span>
              <span className="rc-nome">{nomeCurto(l.nome)} <small>{l.partido}</small></span>
              <span className="rc-trilho" aria-hidden="true">
                <i className="rc-barra" style={{ width: `${Math.min(100, (l.pct / ESCALA) * 100)}%` }} />
                {refPor[l.n] != null && <i className="rc-ref" style={{ left: `${Math.min(100, (refPor[l.n] / ESCALA) * 100)}%` }} />}
              </span>
              <span className="rc-pct">{pct1(l.pct)}%<small> {num(l.votos)}</small></span>
            </li>
          ))}
        </ul>
      )}
      {linhas && <p className="rc-pe"><b>Como ler:</b> cada barra mostra quanto da votação válida já foi contada para o candidato. O traço laranja é o resultado final: quando a barra o alcança, todos os votos dele já foram contados. Brancos e nulos (inclui os votos do nº 28, anulados) ficam fora.</p>}
      <style jsx global>{`
        .rc { padding: 12px 16px 12px; background: ${t.cor.papelQuente}; border-radius: ${t.raio.sm}; }
        .rc-tit { margin: 0 0 6px; font: 700 1rem ${t.fonte.corpo}; color: ${t.cor.tinta}; }
        .rc-tit span { font-weight: 400; font-size: 0.8rem; color: ${t.cor.cinza}; margin-left: 6px; }
        .rc-escopo { display: flex; align-items: center; justify-content: space-between; gap: 10px; min-height: 28px; margin: 0 0 6px; font-size: 0.82rem; color: ${t.cor.cinza}; }
        .rc-escopo b { color: ${t.cor.tinta}; }
        .rc-volta { flex: none; padding: 4px 12px; border: none; border-radius: ${t.raio.pill}; background: ${t.cor.papelQuente2}; color: ${t.cor.tinta}; font: 600 0.78rem ${t.fonte.corpo}; cursor: pointer; }
        .rc-volta:hover { background: #EDE2D2; }
        .rc-volta:focus-visible { outline: none; box-shadow: ${t.sombra.anelFoco}; }
        .rc-cont { margin: 0 0 6px; font-size: 0.78rem; color: ${t.cor.cinza}; font-variant-numeric: tabular-nums; }
        .rc-lista { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 3px; }
        .rc-linha { display: grid; grid-template-columns: 24px minmax(0, 1.25fr) minmax(70px, 1fr) 132px; align-items: center; gap: 8px; font-size: 0.82rem; line-height: 1.25; color: ${t.cor.tinta}; font-variant-numeric: tabular-nums; }
        .rc-num { font-weight: 700; color: ${t.cor.cinza}; }
        .rc-nome { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .rc-nome small { color: ${t.cor.cinza}; font-size: 0.74rem; }
        .rc-trilho { position: relative; display: block; height: 9px; background: #ECE6DB; border-radius: 99px; }
        .rc-barra { position: absolute; left: 0; top: 0; bottom: 0; background: ${t.cor.verde}; border-radius: 99px; transition: width 0.2s linear; }
        .rc-ref { position: absolute; top: -2px; bottom: -2px; width: 2px; margin-left: -1px; background: ${t.cor.ouro}; border-radius: 2px; }
        .rc-pct { text-align: right; font-weight: 600; white-space: nowrap; }
        .rc-pct small { font-weight: 400; color: ${t.cor.cinza}; font-size: 0.72rem; }
        .rc-vazio { margin: 0; font-size: 0.9rem; color: ${t.cor.cinza}; }
        .rc-pe { margin: 7px 0 0; font-size: 0.78rem; line-height: 1.35; color: ${t.cor.cinza}; }
        /* Celular: sem o partido ao lado do nome; os votos contados passam para baixo do percentual. */
        @media (max-width: 600px) {
          .rc { padding: 12px 12px; }
          .rc-linha { grid-template-columns: 22px minmax(0, 1fr) minmax(56px, 0.8fr) 78px; gap: 6px; }
          .rc-nome small { display: none; }
          .rc-pct small { display: block; font-size: 0.68rem; }
          .rc-escopo { flex-wrap: wrap; }
        }
        @media (prefers-reduced-motion: reduce) { .rc-barra { transition: none; } }
      `}</style>
    </section>
  );
}

// "ESCRITOR AUGUSTO CURY" → "Augusto Cury": tira o título do nome de urna e põe maiúscula só na inicial de cada palavra.
function nomeCurto(nome) {
  const s = String(nome || '').replace(/^(ESCRITOR|VETERINÁRIO|VETERINARIO|DOUTOR|DR\.?)\s+/i, '');
  return s.toLowerCase().replace(/(^|\s)(\p{L})/gu, (_, a, b) => a + b.toUpperCase());
}
