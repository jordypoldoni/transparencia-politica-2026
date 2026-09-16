import { useState, useEffect } from 'react';
import { t } from '../src/estilo/tokens';

// Seção "Situação da candidatura" da ficha do presidenciável. (16/09/2026)
//
// POR QUE É SEÇÃO PRÓPRIA E NÃO MAIS UMA LINHA EM "QUEM É"
// "Quem é" é identidade: nome, idade, naturalidade, escolaridade. Situação é status jurídico,
// muda até a eleição e pode carregar motivos de indeferimento. Misturar as duas põe coisas de
// naturezas diferentes com o mesmo peso, que é o erro que as Diretrizes de Design nomeiam.
//
// POR QUE AO VIVO: "Pendente de julgamento" vira deferido ou indeferido a qualquer momento até
// 04/10. Dado guardado envelheceria em silêncio e a tela passaria a afirmar o que já mudou.
//
// REGRA DE NEUTRALIDADE APLICADA AQUI: usamos o termo do TSE sem traduzir e sem adjetivo.
// "Indeferido" não vira "rejeitado" nem "barrado" - a tradução sugeriria uma definitividade que
// o dado não tem, tanto que o próprio TSE segue listando o candidato como "Concorrendo". Os
// motivos são transcritos como a fonte os publica, sem resumo nosso, com link para conferir.
export default function SituacaoCandidatura({ sqCandidato }) {
  const [d, setD] = useState(null);

  useEffect(() => {
    if (!sqCandidato) return;
    let vivo = true;
    fetch(`/api/ficha-tse?sq=${encodeURIComponent(sqCandidato)}`)
      .then((r) => r.json())
      .then((x) => { if (vivo) setD(x); })
      .catch(() => { });
    return () => { vivo = false; };
  }, [sqCandidato]);

  // Sem dado, sem seção. Falha da fonte não vira caixa de erro numa informação acessória.
  if (!d || d.indisponivel || !d.situacao) return null;

  const deferido = /^deferido$/i.test(String(d.situacao).trim());
  const data = d.consultadoEm ? new Date(d.consultadoEm).toLocaleDateString('pt-BR') : null;
  const rotulo = { margin: 0, fontSize: '0.7rem', fontWeight: 800, letterSpacing: '0.05em', textTransform: 'uppercase', color: t.cor.cinza };

  return (
    <section style={{ background: t.cor.papelCartao, borderRadius: t.raio.md, padding: '18px 20px', marginBottom: '24px', boxShadow: t.sombra.sutil }}>
      <h2 style={{ fontFamily: t.fonte.titulo, fontWeight: 600, fontSize: '1.15rem', margin: '0 0 14px' }}>Situação da candidatura</h2>

      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center', marginBottom: d.motivos?.length || d.substituido || d.vices?.length ? '14px' : 0 }}>
        <span style={{
          fontSize: '0.8rem', fontWeight: 800, padding: '5px 12px', borderRadius: '6px',
          background: deferido ? '#E7F3EC' : t.cor.alertaBg,
          color: deferido ? t.cor.sim : t.cor.alertaTexto,
        }}>{d.situacao}</span>
        {d.constaDaUrna && <span style={{ fontSize: '0.84rem', color: t.cor.tinta }}>{d.constaDaUrna}</span>}
        {d.totalizacao && <span style={{ fontSize: '0.84rem', color: t.cor.cinza }}>· {d.totalizacao}</span>}
      </div>

      {/* Motivos: só existem em candidatura indeferida. Transcritos, não resumidos. */}
      {d.motivos?.length > 0 && (
        <div style={{ marginBottom: '14px' }}>
          <p style={rotulo}>Motivos registrados pelo TSE</p>
          <ul style={{ margin: '6px 0 0', paddingLeft: '18px', fontSize: '0.88rem', lineHeight: 1.6, color: t.cor.tinta }}>
            {d.motivos.map((m, i) => <li key={i}>{m}</li>)}
          </ul>
        </div>
      )}

      {/* A resposta ao enigma dos dois candidatos com o mesmo número: o TSE publica quem
          substituiu quem. Aqui não há dedução nossa. */}
      {d.substituido && d.substitutoNome && (
        <div style={{ marginBottom: '14px' }}>
          <p style={rotulo}>Substituição</p>
          <p style={{ margin: '6px 0 0', fontSize: '0.88rem', lineHeight: 1.55, color: t.cor.tinta }}>
            Esta candidatura foi substituída por <strong style={{ fontWeight: 700 }}>{d.substitutoNome}</strong>, conforme registro do TSE.
          </p>
        </div>
      )}

      {/* Vices: a fonte agrupa por NÚMERO, não por chapa, e não diz de quem é cada um.
          Mostramos os dois com a situação de cada, e deixamos a conclusão para o leitor. */}
      {d.vices?.length > 0 && (
        <div style={{ marginBottom: '14px' }}>
          <p style={rotulo}>{d.vices.length > 1 ? 'Vices registrados com o mesmo número' : 'Vice'}</p>
          <ul style={{ margin: '6px 0 0', paddingLeft: '18px', fontSize: '0.88rem', lineHeight: 1.6, color: t.cor.tinta }}>
            {d.vices.map((v) => (
              <li key={v.sq}>
                {v.nome}
                {v.apto === false && <span style={{ color: t.cor.alertaTexto }}> · inapto</span>}
                {v.apto === true && <span style={{ color: t.cor.cinza }}> · apto</span>}
              </li>
            ))}
          </ul>
          {d.vices.length > 1 && (
            <p style={{ margin: '8px 0 0', fontSize: '0.78rem', lineHeight: 1.5, color: t.cor.cinza }}>
              O TSE publica os vices por número de urna e não informa qual deles integra cada chapa.
            </p>
          )}
        </div>
      )}

      <p style={{ margin: 0, fontSize: '0.76rem', lineHeight: 1.5, color: t.cor.cinza }}>
        Dado consultado ao vivo no TSE{data ? ` em ${data}` : ''}
        {d.numeroProcesso ? ` · processo ${d.numeroProcesso}` : ''}
        {d.degradado ? ' · exibindo a última consulta bem-sucedida' : ''}
        {' · '}
        <a href={d.fonteUrl} target="_blank" rel="noopener noreferrer" style={{ color: t.cor.ouroTexto, fontWeight: 700 }}>ver no DivulgaCandContas</a>
      </p>
    </section>
  );
}
