import Head from 'next/head';
import PerfilPolitico from '../../components/PerfilPolitico';
import ServicoAPI from '../../src/servicos/servico_api';

const brl = (v) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(v || 0);

export default function DeputadoSEO({ dados, canonical }) {
  const p = dados.perfil;
  const ufp = `${p.partido_atual || ''}-${p.uf_sede || 'BR'}`;
  const titulo = `${p.nome_urna} (${ufp}) — gastos e votos | Transparência`;
  const desc = `Quanto ${p.nome_urna} usou da cota parlamentar em 2026 (${brl(dados.total_geral)}), como votou e a fidelidade ao ${p.partido_atual || 'partido'}. Em linguagem clara, com a fonte oficial da Câmara.`;

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: p.nome_urna,
    jobTitle: p.cargo_atual || 'Deputado Federal',
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

export async function getServerSideProps({ params, req }) {
  const dados = await ServicoAPI.getPoliticoPorSlug(params.slug);
  if (!dados) return { notFound: true };
  const proto = req.headers['x-forwarded-proto'] || 'http';
  const canonical = `${proto}://${req.headers.host}/deputado/${params.slug}`;
  return { props: { dados: JSON.parse(JSON.stringify(dados)), canonical } };
}
