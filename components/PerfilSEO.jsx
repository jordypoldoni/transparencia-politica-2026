import Head from 'next/head';
import PerfilPolitico from './PerfilPolitico';
import { casaDoPerfil } from '../src/lib/casa';

// Cabecalho SEO do perfil, compartilhado por /deputado/[slug] e /senador/[slug].
// O vocabulario muda por casa: ate 12/09/2026 esta pagina dizia "cota parlamentar" e
// "fonte oficial da Camara" para todo mundo, inclusive senador e deputado estadual, e o
// jobTitle do JSON-LD caia em "Deputado Federal". Num site de transparencia isso e erro
// factual, e ele ia parar no Google.

const brl = (v) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(v || 0);

export default function PerfilSEO({ dados, canonical }) {
  const p = dados.perfil;
  const casa = casaDoPerfil(p);
  const ufp = `${p.partido_atual || ''}-${p.uf_sede || 'BR'}`;
  const titulo = `${p.nome_urna} (${ufp}): gastos e votos | Lume`;
  const verba = casa.ehEstadual ? 'da verba de gabinete' : 'da cota parlamentar';
  const desc = `Quanto ${p.nome_urna} usou ${verba} em 2026 (${brl(dados.total_geral)}), como votou e a fidelidade ao ${p.partido_atual || 'partido'}. Em linguagem clara, com a fonte oficial ${casa.fonteNomeCom}.`;

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: p.nome_urna,
    jobTitle: p.cargo_atual || casa.cargoPadrao,
    affiliation: p.partido_atual || undefined,
    image: p.foto_url || undefined,
    url: canonical,
    workLocation: p.uf_sede || undefined,
  };

  return (
    <>
      <Head>
        <title>{titulo}</title>
        <meta name="description" content={desc} />
        <link rel="canonical" href={canonical} />
        <meta name="robots" content="index, follow" />
        <meta property="og:type" content="profile" />
        <meta property="og:title" content={titulo} />
        <meta property="og:description" content={desc} />
        <meta property="og:url" content={canonical} />
        {p.foto_url && <meta property="og:image" content={p.foto_url} />}
        <meta name="twitter:card" content="summary" />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      </Head>
      <PerfilPolitico dados={dados} />
    </>
  );
}
