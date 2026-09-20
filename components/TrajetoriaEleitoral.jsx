import { useState } from 'react';
import { t } from '../src/estilo/tokens';

// Seção "Trajetória eleitoral" — as candidaturas anteriores publicadas pelo TSE. (20/09/2026)
//
// DE ONDE VEM: o campo `eleicoesAnteriores` da ficha do DivulgaCandContas, que existia desde
// sempre e a tradução ignorava. Cada linha traz ano, cargo, onde, por qual partido e como
// terminou, com link para aquela candidatura na fonte.
//
// NEUTRALIDADE, que aqui é mais delicada que no resto do site: sequência de partidos é o tipo
// de dado que vira acusação com uma palavra errada. Então a tela CONTA e LISTA, e não qualifica:
// nunca "trocou de partido", "migrou", "perdeu"; nunca ordena por "fidelidade"; nunca soma
// vitórias como placar. Os termos do TSE aparecem como o TSE escreve ("Eleito por QP", "Não
// eleito", "Suplente"), pela mesma razão registrada em SituacaoCandidatura: traduzir sugere
// definitividade ou juízo que o dado não tem.
//
// CAMADA ZERO: "eleito por quociente partidário" e "eleito por média" são a coisa mais opaca
// desta seção, e são justamente o que explica alguém com poucos votos se eleger. Ficam num
// explicador que abre na hora, sem tirar o leitor da página. A regra do projeto é não
// pressupor conhecimento.
//
// RESSALVA NA TELA, não só no código: o histórico é o que o TSE publica no DivulgaCandContas,
// que não alcança toda a vida do candidato. Ausência de linha não é prova de estreia.

const ELEITO = /^eleito/i;

function Explicador({ aberto, aoAlternar }) {
  return (
    <>
      <button
        type="button"
        onClick={aoAlternar}
        aria-expanded={aberto}
        style={{
          background: 'none', border: 'none', padding: 0, cursor: 'pointer',
          font: 'inherit', fontSize: '0.82rem', fontWeight: 700,
          color: t.cor.ouroTexto, textDecoration: 'underline dotted',
        }}
      >
        o que é eleito por quociente e por média ?
      </button>
      {aberto && (
        <p style={{ margin: '10px 0 0', fontSize: '0.84rem', lineHeight: 1.6, color: t.cor.tinta }}>
          Nas eleições para deputado e vereador, os votos vão primeiro para o <strong>partido</strong>.
          O total de votos do partido define quantas cadeiras ele ganha, e só então elas são
          distribuídas entre os candidatos mais votados daquela legenda. <strong>Eleito por
          quociente partidário</strong> é quem entrou nessa conta direta. <strong>Eleito por
          média</strong> é quem ocupou uma das cadeiras que sobraram, distribuídas depois por um
          cálculo de sobras. É por isso que um candidato pode se eleger com menos votos que outro
          que ficou de fora. Fonte: Tribunal Superior Eleitoral.
        </p>
      )}
    </>
  );
}

export default function TrajetoriaEleitoral({ ficha }) {
  const [explica, setExplica] = useState(false);
  const linhas = Array.isArray(ficha?.eleicoes_anteriores) ? ficha.eleicoes_anteriores : [];

  // Sem histórico publicado não inventamos seção vazia nem escrevemos "estreante": o que
  // sabemos é que o TSE não publica candidatura anterior, que é diferente de não ter havido.
  if (!linhas.length) return null;

  const anos = linhas.map((l) => l.ano).filter(Boolean);
  const partidos = [...new Set(linhas.map((l) => l.partido).filter(Boolean))];
  const eleicoesComResultado = linhas.filter((l) => l.resultado);
  const vezesEleito = eleicoesComResultado.filter((l) => ELEITO.test(l.resultado)).length;
  const temMedia = linhas.some((l) => /m[ée]dia|quociente|\bQP\b/i.test(l.resultado || ''));

  return (
    <section style={{ background: t.cor.papelCartao, borderRadius: t.raio.md, padding: 'clamp(18px,3vw,26px)', boxShadow: t.sombra.sutil, marginBottom: '20px' }}>
      <h2 style={{ fontSize: '1rem', margin: '0 0 6px' }}>Trajetória eleitoral</h2>

      {/* Contagem, não veredito: número de candidaturas, de partidos e de vitórias são fatos
          somáveis. Nenhuma frase diz se isso é bom ou ruim. */}
      <p style={{ margin: '0 0 18px', color: t.cor.cinza, fontSize: '0.9rem', lineHeight: 1.5 }}>
        {linhas.length} {linhas.length === 1 ? 'candidatura registrada' : 'candidaturas registradas'} pelo TSE
        {anos.length ? `, de ${Math.min(...anos)} a ${Math.max(...anos)}` : ''}
        {partidos.length ? `, por ${partidos.length} ${partidos.length === 1 ? 'partido' : 'partidos'} (${partidos.join(', ')})` : ''}
        {eleicoesComResultado.length ? `. Eleito em ${vezesEleito} ${vezesEleito === 1 ? 'vez' : 'vezes'}` : ''}.
      </p>

      <ol style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {linhas.map((l, i) => (
          <li key={`${l.ano}-${i}`} style={{ background: t.cor.papelQuente, borderRadius: t.raio.md, padding: '14px 16px' }}>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'baseline', flexWrap: 'wrap' }}>
              <strong style={{ fontFamily: t.fonte.titulo, fontSize: '1.05rem', color: t.cor.tinta }}>{l.ano}</strong>
              <span style={{ fontWeight: 700, color: t.cor.tinta, fontSize: '0.95rem' }}>{l.cargo || 'Cargo não informado'}</span>
              {l.local && <span style={{ color: t.cor.tinta, fontSize: '0.88rem' }}>{l.local}</span>}
            </div>
            <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap', marginTop: '4px', fontSize: '0.82rem', color: t.cor.tinta }}>
              {l.partido && <span><strong>Partido:</strong> {l.partido}</span>}
              {l.numero && <span><strong>Número:</strong> {l.numero}</span>}
              {/* O termo do TSE, sem tradução e sem cor de julgamento. */}
              {l.resultado && <span><strong>Resultado:</strong> {l.resultado}</span>}
              {l.url && (
                <a href={l.url} target="_blank" rel="noopener noreferrer" style={{ color: t.cor.ouroTexto, fontWeight: 700, textDecoration: 'none' }}>
                  ver na fonte
                </a>
              )}
            </div>
          </li>
        ))}
      </ol>

      <div style={{ marginTop: '16px', paddingTop: '14px' }}>
        {temMedia && <Explicador aberto={explica} aoAlternar={() => setExplica(!explica)} />}
        <p style={{ margin: temMedia ? '12px 0 0' : 0, fontSize: '0.8rem', color: t.cor.cinza, lineHeight: 1.5 }}>
          Lista publicada pelo Tribunal Superior Eleitoral na ficha deste candidato. Ela cobre as
          eleições que o TSE divulga, e não necessariamente toda a vida pública da pessoa: a
          ausência de uma candidatura aqui não significa que ela não existiu. A candidatura de
          2026 não entra nesta lista, porque ainda não terminou.
        </p>
      </div>
    </section>
  );
}
