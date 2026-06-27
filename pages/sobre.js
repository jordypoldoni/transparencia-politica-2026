import { t } from '../src/estilo/tokens';

const principios = [
  { tit: 'Linguagem de gente', txt: 'Traduzimos o "politiquês" e o "juridiquês" para o português do dia a dia. Se a sua avó não entende, a gente reescreve.' },
  { tit: 'Sem lado', txt: 'Não torcemos por partido nenhum. Mostramos o fato — quem votou o quê, quem gastou quanto — e deixamos você decidir.' },
  { tit: 'Tudo com fonte', txt: 'Cada número tem o link do documento oficial. Você não precisa confiar na gente: pode conferir na fonte.' },
  { tit: 'Dados públicos', txt: 'Usamos apenas dados abertos e oficiais do governo. Nada de bastidor, nada de boato.' },
];

export default function Sobre() {
  return (
    <div className="pagina">
      <div className="leitura">
      <span style={{ fontSize: '0.8rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: t.cor.verde }}>Sobre o projeto</span>
      <h1 style={{ fontFamily: t.fonte.titulo, fontWeight: 600, fontSize: 'clamp(2rem,5vw,3rem)', lineHeight: 1.1, margin: '12px 0 20px' }}>
        Política não precisa ser confusa.
      </h1>
      <p style={{ fontSize: '1.15rem', color: t.cor.cinza, lineHeight: 1.6, margin: '0 0 40px' }}>
        O Olho Público existe para responder, de forma simples, uma pergunta que todo cidadão tem direito de fazer:
        <strong style={{ color: t.cor.tinta }}> o político que eu elegi está me representando?</strong> Reunimos dados oficiais
        espalhados e confusos, e entregamos mastigado — para você acompanhar e cobrar com base em fato, não em achismo.
      </p>

      <h2 style={{ fontFamily: t.fonte.titulo, fontWeight: 600, fontSize: '1.5rem', margin: '0 0 16px' }}>Nossos princípios</h2>
      <div style={{ display: 'grid', gap: '12px', marginBottom: '44px' }}>
        {principios.map((p) => (
          <div key={p.tit} style={{ background: t.cor.papelCartao, borderRadius: t.raio.md, padding: '20px 22px', boxShadow: t.sombra.sutil }}>
            <h3 style={{ margin: '0 0 6px', fontSize: '1.05rem' }}>{p.tit}</h3>
            <p style={{ margin: 0, color: t.cor.cinza, lineHeight: 1.55 }}>{p.txt}</p>
          </div>
        ))}
      </div>

      <h2 style={{ fontFamily: t.fonte.titulo, fontWeight: 600, fontSize: '1.5rem', margin: '0 0 16px' }}>De onde vêm os dados</h2>
      <p style={{ color: t.cor.cinza, lineHeight: 1.6, margin: '0 0 12px' }}>
        Atualizamos automaticamente, todos os dias, a partir das bases oficiais:
      </p>
      <ul style={{ color: t.cor.cinza, lineHeight: 1.8, margin: '0 0 24px', paddingLeft: '20px' }}>
        <li><strong style={{ color: t.cor.tinta }}>Câmara dos Deputados</strong> — votações nominais e gastos da cota parlamentar.</li>
        <li><strong style={{ color: t.cor.tinta }}>Senado Federal</strong> — parlamentares e matérias.</li>
        <li><strong style={{ color: t.cor.tinta }}>Portal da Transparência</strong> — gastos do Executivo.</li>
      </ul>

      <h2 style={{ fontFamily: t.fonte.titulo, fontWeight: 600, fontSize: '1.5rem', margin: '40px 0 16px' }}>O que é a cota parlamentar?</h2>
      <p style={{ color: t.cor.cinza, lineHeight: 1.6, margin: '0 0 12px' }}>
        Todo deputado e senador recebe uma <strong style={{ color: t.cor.tinta }}>verba mensal, paga com o seu imposto</strong>, para tocar o mandato: passagens, aluguel de escritório no estado, combustível, divulgação e consultorias. Tem um teto definido por lei.
      </p>
      <ul style={{ color: t.cor.cinza, lineHeight: 1.8, margin: '0 0 12px', paddingLeft: '20px' }}>
        <li><strong style={{ color: t.cor.tinta }}>O teto muda por estado.</strong> Quem é de um estado mais distante de Brasília recebe mais (gasta mais com passagens). Na Câmara, vai de cerca de R$ 30 mil a R$ 45 mil por mês.</li>
        <li><strong style={{ color: t.cor.tinta }}>Câmara e Senado são diferentes.</strong> A cota do Senado (chamada CEAPS) tem regras e valores próprios.</li>
      </ul>
      <p style={{ color: t.cor.cinza, lineHeight: 1.6, margin: '0 0 28px' }}>
        Por isso, no nosso ranking, <strong style={{ color: t.cor.tinta }}>comparamos cada parlamentar dentro da própria casa</strong> — comparar um deputado com um senador seria injusto, porque os tetos não são iguais.
      </p>

      <div style={{ background: t.cor.alertaBg, borderRadius: t.raio.md, padding: '20px 22px', boxShadow: t.sombra.sutil }}>
        <p style={{ margin: 0, color: t.cor.verdeEscuro, fontSize: '0.95rem', lineHeight: 1.55 }}>
          <strong>Em construção.</strong> Estamos expandindo a cobertura (gastos completos, Senado e Judiciário) e o
          acompanhamento de promessas de campanha. Encontrou algo errado? Esse retorno nos ajuda a melhorar.
        </p>
      </div>
      </div>
    </div>
  );
}
