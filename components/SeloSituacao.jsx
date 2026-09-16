import { t } from '../src/estilo/tokens';

// Selo da situação da candidatura. Só aparece quando NÃO é "Deferido": 12 dos 14 estão
// deferidos, e carimbar o normal em todo mundo vira ruído. O que informa é a exceção.
//
// Usa o TERMO DO TSE sem traduzir. A regra do site manda explicar o difícil, mas aqui traduzir
// é arriscado: "candidatura rejeitada" sugere uma definitividade que o dado não tem, tanto que
// o próprio TSE segue listando o candidato como "Concorrendo". Termo exato, data da consulta
// (o dado muda até 04/10) e o caminho da fonte.
export default function SeloSituacao({ info, consultadoEm, compacto = false }) {
  if (!info || !info.situacao) return null;
  if (/^deferido$/i.test(info.situacao.trim())) return null;
  const data = consultadoEm ? new Date(consultadoEm).toLocaleDateString('pt-BR') : null;
  return (
    <p style={{
      margin: compacto ? '10px 0 0' : '14px 0 0', fontSize: '0.76rem', lineHeight: 1.5,
      color: t.cor.tinta, background: t.cor.alertaBg, borderRadius: t.raio.sm, padding: '10px 12px',
    }}>
      Situação no TSE: <strong style={{ fontWeight: 800 }}>{info.situacao}</strong>
      {data ? ` · consultado em ${data}` : ''}
    </p>
  );
}
