import Head from 'next/head';
import Link from 'next/link';
import { t } from '../src/estilo/tokens';
import { CEAP_LISTA } from '../src/lib/cotas';

const fmtBRL = (v) => v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const SUBLIMITES = [
  ['Combustíveis e lubrificantes', 'R$ 9.392/mês'],
  ['Locação de veículos', 'R$ 12.713/mês'],
  ['Táxi, pedágio e estacionamento', 'R$ 2.700/mês'],
  ['Segurança (empresa especializada)', 'R$ 8.700/mês'],
  ['Cursos, congressos e eventos', 'R$ 7.697,17/mês'],
  ['Complementação de auxílio-moradia', 'R$ 4.148,80/mês'],
];

const CARGOS = [
  {
    nome: 'Vereador', onde: 'Câmara Municipal — sua cidade', quantos: 'varia por cidade', mandato: '4 anos',
    faz: 'Faz as leis da sua cidade (transporte, zoneamento, IPTU, uso do solo), fiscaliza o prefeito e aprova o orçamento municipal. É o político mais perto do seu dia a dia.',
    naofaz: 'Não vota leis estaduais nem federais.',
  },
  {
    nome: 'Deputado Estadual', onde: 'Assembleia Legislativa — seu estado', quantos: 'varia por estado', mandato: '4 anos',
    faz: 'Faz as leis do estado, fiscaliza o governador e aprova o orçamento estadual (ex.: segurança, educação e saúde sob responsabilidade do estado).',
    naofaz: 'Não vota leis federais.',
  },
  {
    nome: 'Deputado Federal', onde: 'Câmara dos Deputados — Brasília', quantos: '513 no total', mandato: '4 anos',
    faz: 'Representa o povo do seu estado (quanto mais população, mais deputados). Cria e muda leis nacionais, fiscaliza o governo federal, vota o Orçamento da União e pode abrir processo de impeachment.',
    naofaz: 'Sozinho não aprova uma lei: a proposta ainda passa pelo Senado.',
  },
  {
    nome: 'Senador', onde: 'Senado Federal — Brasília', quantos: '81 (3 por estado)', mandato: '8 anos',
    faz: 'Representa o estado em si — por isso todo estado tem o mesmo número (3), independentemente do tamanho. Também cria leis nacionais, revisa o que a Câmara aprova, aprova autoridades (como ministros do STF) e julga o impeachment.',
    naofaz: 'Senador também vota e legisla — não fica parado.',
  },
];

const cartao = { background: t.cor.papelCartao, borderRadius: t.raio.md, padding: '20px 22px', boxShadow: t.sombra.sutil };
const fonte = { display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '8px 16px', fontSize: '0.85rem', fontWeight: 700, fontFamily: t.fonte.corpo, borderRadius: t.raio.pill, textDecoration: 'none', background: '#fff', color: t.cor.tinta, boxShadow: t.sombra.clicavel };

export default function Entenda() {
  return (
    <>
      <Head>
        <title>Entenda: o que faz cada político e quanto custa a cota | Transparência</title>
        <meta name="description" content="Em linguagem simples: o que faz um vereador, deputado e senador, e os valores e tetos da cota parlamentar por estado, com fontes oficiais." />
      </Head>

      <div className="pagina">
        <h1 style={{ fontFamily: t.fonte.titulo, fontWeight: 600, fontSize: 'clamp(1.8rem,4.5vw,2.6rem)', lineHeight: 1.15, margin: '0 0 10px' }}>Entenda quem é quem</h1>
        <p style={{ color: t.cor.cinza, fontSize: '1.05rem', maxWidth: '680px', margin: '0 0 12px' }}>
          Antes de cobrar, é bom saber o que cada um faz. Aqui explicamos cada cargo sem juridiquês — e mostramos quanto dinheiro público eles podem gastar.
        </p>

        {/* Legislativo x Executivo */}
        <div style={{ ...cartao, background: t.cor.alertaBg, border: 'none', margin: '8px 0 32px' }}>
          <p style={{ margin: 0, fontSize: '0.95rem', lineHeight: 1.6, color: t.cor.tinta }}>
            <strong>Em uma frase:</strong> quem <strong>faz as leis</strong> e fiscaliza é o <strong>Legislativo</strong> (vereador, deputado e senador). Quem <strong>governa e executa</strong> é o <strong>Executivo</strong> (prefeito, governador e presidente). Este site acompanha o Legislativo federal.
          </p>
        </div>

        {/* O QUE FAZ CADA UM */}
        <h2 style={{ fontFamily: t.fonte.titulo, fontWeight: 600, fontSize: '1.6rem', margin: '0 0 16px' }}>O que faz cada um?</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '14px', marginBottom: '20px' }}>
          {CARGOS.map((c) => (
            <div key={c.nome} style={cartao}>
              <h3 style={{ fontFamily: t.fonte.titulo, fontWeight: 600, fontSize: '1.2rem', margin: '0 0 4px' }}>{c.nome}</h3>
              <p style={{ margin: '0 0 12px', fontSize: '0.82rem', color: t.cor.ouroTexto, fontWeight: 700 }}>{c.onde}</p>
              <p style={{ margin: '0 0 12px', fontSize: '0.95rem', lineHeight: 1.55, color: t.cor.tinta }}>{c.faz}</p>
              <p style={{ margin: '0 0 12px', fontSize: '0.85rem', lineHeight: 1.5, color: t.cor.cinza }}>{c.naofaz}</p>
              <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap', fontSize: '0.8rem', color: t.cor.cinza, paddingTop: '10px' }}>
                <span><strong style={{ color: t.cor.tinta }}>Quantos:</strong> {c.quantos}</span>
                <span><strong style={{ color: t.cor.tinta }}>Mandato:</strong> {c.mandato}</span>
              </div>
            </div>
          ))}
        </div>

        <div style={{ ...cartao, marginBottom: '48px' }}>
          <p style={{ margin: 0, fontSize: '0.95rem', lineHeight: 1.6 }}>
            <strong>E quem vota as leis?</strong> Tanto deputados quanto senadores. Uma proposta normalmente precisa passar pelas <strong>duas casas</strong> (Câmara e Senado) antes de virar lei. Hoje este site mostra os <strong>votos nominais da Câmara</strong>; os votos do Senado entram em breve.
          </p>
        </div>

        {/* COTAS */}
        <h2 id="cotas" style={{ fontFamily: t.fonte.titulo, fontWeight: 600, fontSize: '1.6rem', margin: '0 0 8px', scrollMarginTop: '90px' }}>Quanto eles podem gastar? A cota parlamentar</h2>
        <p style={{ color: t.cor.cinza, fontSize: '1rem', maxWidth: '720px', margin: '0 0 8px', lineHeight: 1.6 }}>
          Além do salário, cada parlamentar tem uma <strong>verba mensal</strong> para custear o mandato (passagens, aluguel de escritório, combustível, divulgação etc.). Não é dinheiro no bolso: é <strong>reembolso</strong> mediante nota fiscal — e tudo fica público.
        </p>
        <p style={{ color: t.cor.cinza, fontSize: '0.95rem', maxWidth: '720px', margin: '0 0 22px', lineHeight: 1.6 }}>
          O <strong>teto muda de estado para estado</strong> porque a maior parte é gasto com passagens aéreas até Brasília — quanto mais longe, maior a cota.
        </p>

        {/* Câmara */}
        <div style={{ ...cartao, marginBottom: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', flexWrap: 'wrap', gap: '8px', marginBottom: '6px' }}>
            <h3 style={{ fontFamily: t.fonte.titulo, fontWeight: 600, fontSize: '1.15rem', margin: 0 }}>Câmara dos Deputados — CEAP</h3>
            <span style={{ fontSize: '0.8rem', color: t.cor.cinza }}>teto mensal por deputado</span>
          </div>
          <p style={{ margin: '0 0 14px', fontSize: '0.9rem', color: t.cor.tinta }}>
            Vai de <strong>R$ 41.612,55</strong> (Distrito Federal, o mais perto) a <strong>R$ 58.474,70</strong> (Roraima, o mais longe).
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '8px' }}>
            {CEAP_LISTA.map(({ uf, nome, valor }) => (
              <div key={uf} style={{ background: t.cor.papelQuente, padding: '10px 14px', borderRadius: t.raio.sm, boxShadow: t.sombra.sutil, display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '8px' }}>
                <span style={{ fontSize: '0.85rem', color: t.cor.tinta }}><strong>{uf}</strong> <span style={{ color: t.cor.cinza, fontSize: '0.78rem' }}>{nome}</span></span>
                <span style={{ fontSize: '0.85rem', fontWeight: 700, color: t.cor.tinta, whiteSpace: 'nowrap' }}>R$ {fmtBRL(valor)}</span>
              </div>
            ))}
          </div>
          <a href="https://www2.camara.leg.br/comunicacao/assessoria-de-imprensa/guia-para-jornalistas/cota-parlamentar" target="_blank" rel="noopener noreferrer" style={{ ...fonte, marginTop: '14px' }}>Ver na fonte oficial (Câmara) ↗</a>
        </div>

        {/* Sublimites */}
        <div style={{ ...cartao, marginBottom: '20px' }}>
          <h3 style={{ fontFamily: t.fonte.titulo, fontWeight: 600, fontSize: '1.1rem', margin: '0 0 4px' }}>Dentro da cota, há tetos por tipo de gasto</h3>
          <p style={{ margin: '0 0 14px', fontSize: '0.9rem', color: t.cor.cinza }}>Mesmo dentro do valor total, alguns gastos têm limite próprio:</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '10px' }}>
            {SUBLIMITES.map(([item, lim]) => (
              <div key={item} style={{ background: t.cor.papelQuente, borderRadius: '8px', padding: '12px 14px', boxShadow: t.sombra.sutil }}>
                <p style={{ margin: 0, fontSize: '0.88rem', color: t.cor.tinta }}>{item}</p>
                <p style={{ margin: '2px 0 0', fontSize: '0.95rem', fontWeight: 700, color: t.cor.ouroTexto }}>{lim}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Senado */}
        <div style={{ ...cartao, marginBottom: '20px' }}>
          <h3 style={{ fontFamily: t.fonte.titulo, fontWeight: 600, fontSize: '1.15rem', margin: '0 0 6px' }}>Senado Federal — CEAPS</h3>
          <p style={{ margin: '0 0 10px', fontSize: '0.95rem', lineHeight: 1.6, color: t.cor.tinta }}>
            No Senado a conta é montada diferente: uma parte <strong>fixa de R$ 15.000/mês</strong> + uma parte <strong>variável</strong> para transporte aéreo (até 5 trechos entre o estado e Brasília). Por isso o total também <strong>varia por estado</strong> — por exemplo, para Goiás e o DF fica em torno de <strong>R$ 25.000/mês</strong>.
          </p>
          <a href="https://www12.senado.leg.br/transparencia/perguntas-frequentes-1/sobre-os-senadores/o-que-e-ceaps" target="_blank" rel="noopener noreferrer" style={fonte}>Ver na fonte oficial (Senado) ↗</a>
        </div>

        {/* Contexto */}
        <div style={{ ...cartao, background: t.cor.papel, marginBottom: '32px' }}>
          <p style={{ margin: 0, fontSize: '0.9rem', lineHeight: 1.6, color: t.cor.cinza }}>
            <strong style={{ color: t.cor.tinta }}>Para dar tamanho:</strong> a cota é separada do <strong>salário</strong> (subsídio de R$ 46.366,19/mês para deputados e senadores) e, na Câmara, da <strong>verba de gabinete</strong> (R$ 133.170,54/mês para contratar de 5 a 25 assessores). A cota cobre só os custos do mandato.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <Link href="/deputados" style={{ ...fonte, background: t.cor.verde, color: t.cor.ouro, border: 'none' }}>Ver os parlamentares →</Link>
          <Link href="/votacoes" style={fonte}>Ver as votações →</Link>
        </div>
      </div>
    </>
  );
}
