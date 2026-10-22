import { t } from '../src/estilo/tokens';

// VOTOS DOS CANDIDATOS NO REPLAY (22/10/2026, D-074, regras de neutralidade aprovadas pelo Jordy). Só desenha; os números vêm de votosNoMinuto.
// Regras: (1) ordem FIXA por número de urna, nunca reordena; (2) todas as barras iguais, sem cor de partido nem destaque de quem lidera;
// (3) escala fixa de 0 a 60% (não muda com o minuto); (4) o traço fino em cada barra marca o valor ao FIM do replay, igual para todos;
// (5) a cobertura (urnas recebidas) fica sempre visível na tela, e o rodapé (aviso "Como ler", regra 2) diz que o percentual é parcial e não indica o resultado final.
const ESCALA = 60;
const pct1 = (v) => v.toFixed(1).replace('.', ',');
const num = (v) => Number(v).toLocaleString('pt-BR');

export default function ReplayCandidatos({ parcial, final }) {
  const linhas = parcial && parcial.linhas.length ? parcial.linhas : null;
  const refPor = {};
  if (final) for (const l of final.linhas) refPor[l.n] = l.pct;
  return (
    <section className="rc" aria-label="Votos dos candidatos a presidente neste horário">
      <h2 className="rc-tit">Votos dos candidatos <span>presidente, % dos votos válidos</span></h2>
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
      {linhas && <p className="rc-pe"><b>Como ler:</b> o percentual parcial muda conforme as urnas chegam, pois cada região entra em um horário diferente. Ele não indica o resultado final. O traço laranja em cada barra é o valor ao fim do replay, só dos estados com horário. Brancos e nulos ficam fora da conta ({num(parcial.brancos + parcial.nulos)} agora).</p>}
      <style jsx global>{`
        .rc { padding: 12px 16px 12px; background: ${t.cor.papelQuente}; border-radius: ${t.raio.sm}; }
        .rc-tit { margin: 0 0 6px; font: 700 1rem ${t.fonte.corpo}; color: ${t.cor.tinta}; }
        .rc-tit span { font-weight: 400; font-size: 0.8rem; color: ${t.cor.cinza}; margin-left: 6px; }
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
