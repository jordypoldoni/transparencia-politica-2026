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

const brlExato = (v) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);
const BENS_VISIVEIS = 15;

// DETALHE DE UMA CANDIDATURA ANTERIOR (21/09/2026), aberto ao expandir o ano. Vem da ficha
// daquela eleição no TSE, buscada na hora por /api/candidatura-anterior (escolha do Jordy: zero
// espaço no banco). O dado mais forte é o PATRIMÔNIO DECLARADO NAQUELA ELEIÇÃO: lado a lado com
// os outros anos, mostra a evolução sem que a tela precise dizer nada.
function DetalheCandidatura({ estado, ano }) {
  if (!estado || estado.carregando) {
    return <p style={{ margin: 0, fontSize: '0.85rem', color: t.cor.tinta }}>Buscando a ficha de {ano} no TSE…</p>;
  }
  if (estado.erro) {
    // Erro honesto: detalhe vazio seria lido como "não declarou nada".
    return (
      <p style={{ margin: 0, fontSize: '0.85rem', color: t.cor.tinta, lineHeight: 1.5 }}>
        Não foi possível carregar a ficha de {ano} agora. O resumo acima continua valendo, e o link
        "ver na fonte" abre a ficha completa no TSE.
      </p>
    );
  }
  const d = estado.dados || {};
  const bens = Array.isArray(d.bens) ? d.bens : [];
  const docs = Array.isArray(d.documentos) ? d.documentos : [];
  const rotulo = { margin: '0 0 4px', fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: t.cor.cinza };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
        {d.situacao && (
          <div>
            <p style={rotulo}>Situação da candidatura</p>
            <p style={{ margin: 0, fontSize: '0.9rem', fontWeight: 600, color: t.cor.tinta }}>{d.situacao}</p>
          </div>
        )}
        {d.ocupacao && (
          <div>
            <p style={rotulo}>Ocupação declarada em {ano}</p>
            <p style={{ margin: 0, fontSize: '0.9rem', fontWeight: 600, color: t.cor.tinta }}>{d.ocupacao}</p>
          </div>
        )}
      </div>

      <div>
        <p style={rotulo}>Patrimônio declarado em {ano}</p>
        {d.divulga_bens === false ? (
          // A flag do TSE é respeitada: se a fonte não divulga, nós também não.
          <p style={{ margin: 0, fontSize: '0.88rem', color: t.cor.tinta }}>O TSE não divulga os bens desta candidatura.</p>
        ) : bens.length === 0 ? (
          <p style={{ margin: 0, fontSize: '0.88rem', color: t.cor.tinta }}>Nenhum bem declarado nesta candidatura.</p>
        ) : (
          <>
            {/* O total é o que o TSE publica, não a soma dos itens abaixo: se divergir por
                arredondamento ou bem sem valor, vale o número oficial. */}
            <p style={{ margin: '0 0 8px', fontSize: '1.05rem', fontWeight: 700, color: t.cor.tinta }}>
              {d.total_de_bens != null ? brlExato(d.total_de_bens) : 'Total não informado'}
              <span style={{ fontSize: '0.82rem', fontWeight: 400 }}> em {bens.length} {bens.length === 1 ? 'bem' : 'bens'}</span>
            </p>
            <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {bens.slice(0, BENS_VISIVEIS).map((b, i) => (
                <li key={i} style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', fontSize: '0.84rem', color: t.cor.tinta }}>
                  <span>{b.descricao || b.tipo || 'Bem sem descrição'}{b.tipo && b.descricao ? <span style={{ color: t.cor.cinza }}> · {b.tipo}</span> : null}</span>
                  <strong style={{ flexShrink: 0 }}>{b.valor != null ? brlExato(b.valor) : 'sem valor'}</strong>
                </li>
              ))}
            </ul>
            {bens.length > BENS_VISIVEIS && (
              <p style={{ margin: '6px 0 0', fontSize: '0.8rem', color: t.cor.cinza }}>e mais {bens.length - BENS_VISIVEIS} bens, na ficha completa do TSE.</p>
            )}
          </>
        )}
      </div>

      {docs.length > 0 && (
        <div>
          <p style={rotulo}>Documentos entregues em {ano}</p>
          <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {docs.map((doc, i) => (
              <li key={i} style={{ fontSize: '0.84rem' }}>
                <a href={doc.url} target="_blank" rel="noopener noreferrer" style={{ color: t.cor.ouroTexto, fontWeight: 600, textDecoration: 'none' }}>{doc.nome}</a>
              </li>
            ))}
          </ul>
        </div>
      )}

      <p style={{ margin: 0, fontSize: '0.78rem', color: t.cor.cinza }}>Fonte: ficha da candidatura de {ano} no Tribunal Superior Eleitoral.</p>
    </div>
  );
}

// MODO EMBUTIDO (21/09/2026): no perfil do parlamentar esta lista entra DENTRO da seção
// "Trajetória", que já tem outros blocos (atuação profissional, cargos, filiações). Lá ela não
// pode ser um cartão próprio com título de seção, senão vira cartão dentro de cartão; vira mais
// um bloco com subtítulo no mesmo estilo dos vizinhos.
export default function TrajetoriaEleitoral({ ficha, embutido = false, linkCandidatura = null }) {
  const [explica, setExplica] = useState(false);
  // Qual ano está aberto e o que já foi buscado. Ficha de eleição encerrada não muda: buscada
  // uma vez, fica guardada enquanto a página estiver aberta, e fechar e abrir não vai à rede.
  const [aberto, setAberto] = useState(null);
  const [detalhes, setDetalhes] = useState({});

  async function alternar(i, l) {
    if (aberto === i) { setAberto(null); return; }
    setAberto(i);
    if (detalhes[i]?.dados || detalhes[i]?.carregando) return;
    if (!l.id_eleicao || !l.ue || !l.sq) { setDetalhes((d) => ({ ...d, [i]: { erro: 'sem identificadores' } })); return; }
    setDetalhes((d) => ({ ...d, [i]: { carregando: true } }));
    try {
      const q = new URLSearchParams({ ano: String(l.ano), ue: l.ue, id_eleicao: l.id_eleicao, sq: l.sq });
      const r = await fetch(`/api/candidatura-anterior?${q}`);
      const j = await r.json();
      if (!r.ok || j.erro) throw new Error(j.erro || 'falha');
      setDetalhes((d) => ({ ...d, [i]: { dados: j } }));
    } catch (e) {
      setDetalhes((d) => ({ ...d, [i]: { erro: e.message || 'falha' } }));
    }
  }
  const linhas = Array.isArray(ficha?.eleicoes_anteriores) ? ficha.eleicoes_anteriores : [];

  // Sem histórico publicado não inventamos seção vazia nem escrevemos "estreante": o que
  // sabemos é que o TSE não publica candidatura anterior, que é diferente de não ter havido.
  if (!linhas.length) return null;

  const anos = linhas.map((l) => l.ano).filter(Boolean);
  const partidos = [...new Set(linhas.map((l) => l.partido).filter(Boolean))];
  const eleicoesComResultado = linhas.filter((l) => l.resultado);
  const vezesEleito = eleicoesComResultado.filter((l) => ELEITO.test(l.resultado)).length;
  const temMedia = linhas.some((l) => /m[ée]dia|quociente|\bQP\b/i.test(l.resultado || ''));

  const Involucro = embutido ? 'div' : 'section';
  const estiloInvolucro = embutido
    ? {}
    : { background: t.cor.papelCartao, borderRadius: t.raio.md, padding: 'clamp(18px,3vw,26px)', boxShadow: t.sombra.sutil, marginBottom: '20px' };

  return (
    <Involucro style={estiloInvolucro}>
      {embutido ? (
        <h3 style={{ fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: t.cor.cinza, margin: '0 0 6px' }}>
          Candidaturas registradas no TSE
        </h3>
      ) : (
        <h2 style={{ fontSize: '1rem', margin: '0 0 6px' }}>Trajetória eleitoral</h2>
      )}

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
          <li key={`${l.ano}-${i}`} style={{ background: t.cor.papelQuente, borderRadius: t.raio.md, overflow: 'hidden', boxShadow: t.sombra.clicavel }}>
            {/* A linha do ano é um DISCLOSURE, não um botão de ação: mesmo padrão das categorias
                em "Em que ele gastou", e o leitor de tela anuncia aberto ou fechado. */}
            <button
              type="button"
              onClick={() => alternar(i, l)}
              aria-expanded={aberto === i}
              style={{ display: 'flex', width: '100%', justifyContent: 'space-between', alignItems: 'baseline', gap: '12px', padding: '14px 16px 0', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', font: 'inherit' }}
            >
              <span style={{ display: 'flex', gap: '12px', alignItems: 'baseline', flexWrap: 'wrap' }}>
                <strong style={{ fontFamily: t.fonte.titulo, fontSize: '1.05rem', color: t.cor.tinta }}>{l.ano}</strong>
                <span style={{ fontWeight: 700, color: t.cor.tinta, fontSize: '0.95rem' }}>{l.cargo || 'Cargo não informado'}</span>
                {l.local && <span style={{ color: t.cor.tinta, fontSize: '0.88rem' }}>{l.local}</span>}
              </span>
              <span aria-hidden="true" style={{ color: t.cor.tinta, fontSize: '12px', flexShrink: 0 }}>{aberto === i ? '▲' : '▼'}</span>
            </button>
            <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap', padding: '4px 16px 14px', fontSize: '0.82rem', color: t.cor.tinta }}>
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
            {aberto === i && (
              <div style={{ background: '#FFFFFF', padding: '14px 16px 16px' }}>
                <DetalheCandidatura estado={detalhes[i]} ano={l.ano} />
              </div>
            )}
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
        {/* No perfil do parlamentar, a candidatura atual é justamente o que falta na lista acima,
            então ela ganha um caminho explícito até a ficha dela. */}
        {linkCandidatura && (
          <p style={{ margin: '10px 0 0', fontSize: '0.84rem' }}>
            <a href={linkCandidatura} style={{ color: t.cor.ouroTexto, fontWeight: 700, textDecoration: 'none' }}>
              Ver a candidatura de 2026 →
            </a>
          </p>
        )}
      </div>
    </Involucro>
  );
}
