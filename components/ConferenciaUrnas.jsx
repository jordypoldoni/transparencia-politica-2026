import { t } from '../src/estilo/tokens';

// COMO CONFERIR AS URNAS (02/10/2026): o que a Justiça Eleitoral faz antes, durante e depois da
// votação para que qualquer pessoa possa conferir. É conteúdo explicativo, com fonte em cada etapa.
// O Lume NÃO guarda nem exibe Boletim de Urna ou zerésima de cada seção: a zerésima é impressa e
// conferida na própria seção, e o BU de cada seção o TSE divulga (portal Resultados e app
// Boletim na Mão). Aqui só se explica e se leva à fonte oficial. Texto neutro, sem opinião.
const ETAPAS = [
  {
    quando: 'Meses antes',
    titulo: 'Teste Público de Segurança',
    texto: 'Especialistas são convidados a tentar invadir os sistemas da urna. O que encontram e o que foi corrigido é documentado publicamente.',
    fonte: { rotulo: 'Correio Braziliense', href: 'https://www.correiobraziliense.com.br/brasil/2026/07/7466431-como-o-tse-audita-as-urnas-eletronicas-conheca-as-etapas-de-teste.html' },
  },
  {
    quando: '4 de setembro',
    titulo: 'Assinatura digital e lacração dos sistemas',
    texto: 'O TSE assinou e lacrou os sistemas em cerimônia pública, com representantes da Polícia Federal, da OAB e do Ministério Público. A assinatura gera uma impressão digital (hash) que permite verificar se o sistema instalado nas urnas é o mesmo que foi testado.',
    fonte: { rotulo: 'Senado Notícias', href: 'https://www12.senado.leg.br/noticias/materias/2026/09/04/tse-conclui-assinatura-e-lacracao-dos-sistemas-das-eleicoes-de-2026' },
  },
  {
    quando: '4 de outubro, por volta das 7h',
    titulo: 'Zerésima',
    texto: 'Antes de chegar o primeiro eleitor, cada urna imprime a zerésima: um relatório com a identificação da urna e todos os candidatos registrados, sem nenhum voto computado. Ela é assinada por fiscais de partidos e pela junta eleitoral e fica disponível para consulta na seção durante a votação. Não existe divulgação central das zerésimas: a conferência é presencial, na sua seção.',
    fonte: { rotulo: 'TSE', href: 'https://www.tse.jus.br/comunicacao/noticias/2026/Setembro/faltam-14-dias-zeresima-comprova-que-urna-comeca-a-funcionar-com-zero-voto' },
  },
  {
    quando: '4 de outubro, das 8h às 17h',
    titulo: 'Teste de Integridade (votação paralela)',
    texto: 'Urnas sorteadas votam em paralelo ao longo do dia: votos escritos antes em cédulas de papel são digitados nas urnas e depois comparados com o resultado da urna. A atividade é filmada e aberta ao público. Em São Paulo, por exemplo, são 41 urnas, no Centro Cultural São Paulo.',
    fonte: { rotulo: 'TRE-SP', href: 'https://www.tre-sp.jus.br/comunicacao/noticias/2026/Setembro/eleicoes-2026-16-400-cedulas-de-papel-serao-preenchidas-para-teste-de-integridade-das-urnas-eletronicas-no-1o-turno' },
  },
  {
    quando: '4 de outubro, a partir das 17h (Brasília)',
    titulo: 'Boletim de Urna (BU)',
    texto: 'Ao fim da votação, cada urna imprime o BU com o resultado da seção: cinco vias, uma afixada no local. O TSE divulga os dados de cada seção, e qualquer pessoa pode baixar os arquivos para conferir se os totais batem. Pelo app Boletim na Mão, basta apontar a câmera para o QR Code do BU afixado na seção.',
    fonte: { rotulo: 'TSE', href: 'https://www.tse.jus.br/comunicacao/noticias/2026/Setembro/faltam-4-dias-e-possivel-acompanhar-em-tempo-real-a-totalizacao-dos-votos' },
  },
];

export default function ConferenciaUrnas() {
  return (
    <details style={{ margin: '0 0 22px', background: t.cor.papelCartao, borderRadius: t.raio.md, boxShadow: t.sombra.sutil }}>
      <summary style={{ cursor: 'pointer', padding: '14px 18px', fontWeight: 800, fontSize: '0.95rem', color: t.cor.tinta, listStyle: 'revert' }}>
        Como conferir as urnas: zerésima, teste de integridade e Boletim de Urna
      </summary>
      <div style={{ padding: '0 18px 18px' }}>
        <p style={{ margin: '0 0 14px', fontSize: '0.88rem', color: t.cor.cinza, lineHeight: 1.55, maxWidth: '75ch' }}>
          O que a Justiça Eleitoral faz antes, durante e depois da votação, e onde cada etapa pode ser conferida. O Lume não guarda os boletins de cada seção: leva você à fonte oficial.
        </p>
        <ol style={{ margin: 0, padding: 0, display: 'grid', gap: '12px' }}>
          {ETAPAS.map((e) => (
            <li key={e.titulo} style={{ listStyle: 'none', background: t.cor.papelQuente, borderRadius: t.raio.sm, padding: '12px 14px' }}>
              <p style={{ margin: 0, fontSize: '0.72rem', fontWeight: 800, letterSpacing: '0.05em', textTransform: 'uppercase', color: t.cor.ouroTexto }}>{e.quando}</p>
              <p style={{ margin: '2px 0 4px', fontWeight: 700, color: t.cor.tinta }}>{e.titulo}</p>
              <p style={{ margin: 0, fontSize: '0.88rem', lineHeight: 1.55, color: t.cor.tinta }}>
                {e.texto}{' '}
                <a href={e.fonte.href} target="_blank" rel="noopener noreferrer" style={{ color: t.cor.ouroTexto, fontWeight: 700, whiteSpace: 'nowrap' }}>Fonte: {e.fonte.rotulo}</a>
              </p>
            </li>
          ))}
        </ol>
        <p style={{ margin: '14px 0 0', fontSize: '0.86rem', lineHeight: 1.55, color: t.cor.cinza }}>
          Para conferir o BU de qualquer seção depois das 17h:{' '}
          <a href="https://resultados.tse.jus.br/" target="_blank" rel="noopener noreferrer" style={{ color: t.cor.ouroTexto, fontWeight: 700 }}>portal Resultados do TSE</a>
          {' '}ou os aplicativos oficiais (
          <a href="https://www.tse.jus.br/eleicoes/aplicativos-justica-eleitoral" target="_blank" rel="noopener noreferrer" style={{ color: t.cor.ouroTexto, fontWeight: 700 }}>Resultados e Boletim na Mão</a>
          ).
        </p>
      </div>
    </details>
  );
}
