import Head from 'next/head';
import Link from 'next/link';
import { t } from '../../src/estilo/tokens';
import { Seta } from '../../components/icones';
import AtualizacaoDados from '../../components/AtualizacaoDados';
import { montarGrupos, lerFonteStatus } from '../../src/lib/fontesAtualizacao';

// "Como atualizamos os dados" (T10 / D-036): subpágina do grupo Entenda, irmã de /entenda ("Quem é
// quem"). As datas vêm de fonte_status; a página é regenerada a cada 30 min porque o dado muda no
// máximo uma vez por dia.
export async function getStaticProps() {
  return { props: { grupos: montarGrupos(await lerFonteStatus()) }, revalidate: 1800 };
}

const botao = { display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '8px 16px', fontSize: '0.85rem', fontWeight: 700, fontFamily: t.fonte.corpo, borderRadius: t.raio.pill, textDecoration: 'none', background: t.cor.verde, color: t.cor.ouro, border: 'none', boxShadow: t.sombra.botao };

export default function Atualizacao({ grupos }) {
  return (
    <>
      <Head>
        <title>Como atualizamos os dados: quando coletamos cada fonte | Lume</title>
        <meta name="description" content="De onde vêm os gastos, votos e candidaturas do Lume, com que frequência coletamos cada fonte oficial e até quando ela já publicou." />
        <link rel="canonical" href="https://www.lumecidadao.com.br/entenda/atualizacao" />
      </Head>

      <div className="pagina">
        <h1 style={{ fontFamily: t.fonte.titulo, fontWeight: 600, fontSize: 'clamp(1.8rem,4.5vw,2.6rem)', lineHeight: 1.15, margin: '0 0 10px' }}>Como atualizamos os dados</h1>
        <p style={{ color: t.cor.cinza, fontSize: '1.05rem', maxWidth: '680px', margin: '0 0 24px', lineHeight: 1.6 }}>
          Cada fonte oficial publica no seu ritmo. Aqui você vê quando fomos buscar e até quando o dado vai.
        </p>

        <AtualizacaoDados grupos={grupos} />

        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginTop: '16px' }}>
          <Link href="/entenda" style={botao}>Entenda quem é quem<Seta direcao="direita" size={14} emTexto /></Link>
        </div>
      </div>
    </>
  );
}
