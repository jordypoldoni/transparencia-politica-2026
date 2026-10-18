import Head from 'next/head';
import PerfilPolitico from './PerfilPolitico';
import { casaDoPerfil } from '../src/lib/casa';
import { grafo, organizacao, site, migalhas, pagina, jsonSeguro } from '../src/lib/dadosEstruturados';
import { descricaoDoPerfil } from '../src/lib/descricaoPerfil';

// Cabecalho SEO do perfil, compartilhado por /deputado/[slug] e /senador/[slug].
// O vocabulario muda por casa: ate 12/09/2026 esta pagina dizia "cota parlamentar" e
// "fonte oficial da Camara" para todo mundo, inclusive senador e deputado estadual, e o
// jobTitle do JSON-LD caia em "Deputado Federal". Num site de transparencia isso e erro
// factual, e ele ia parar no Google.

// Lista onde o perfil mora, para a trilha de navegação (Início > lista > nome).
const LISTA_DA_CASA = (casa) => (casa.ehSenado ? { nome: 'Senadores', caminho: '/senadores' }
  : casa.ehEstadual ? { nome: 'Deputados estaduais', caminho: '/deputados-estaduais' }
  : { nome: 'Deputados federais', caminho: '/deputados' });

export default function PerfilSEO({ dados, canonical }) {
  const p = dados.perfil;
  const casa = casaDoPerfil(p);
  const ufp = `${p.partido_atual || ''}-${p.uf_sede || 'BR'}`;
  const titulo = `${p.nome_urna} (${ufp}): gastos e votos | Lume`;
  // Frase factual com gastos do ano de referência, presença nas votações e fonte (src/lib/descricaoPerfil.js).
  const desc = descricaoDoPerfil(dados, casa);
  const caminho = new URL(canonical).pathname;
  const lista = LISTA_DA_CASA(casa);

  const pessoa = {
    '@type': 'Person',
    '@id': `${canonical}#pessoa`,
    name: p.nome_urna,
    jobTitle: p.cargo_atual || casa.cargoPadrao,
    affiliation: p.partido_atual || undefined,
    worksFor: { '@type': 'GovernmentOrganization', name: casa.fonteNome },
    image: p.foto_url || undefined,
    url: canonical,
    workLocation: p.uf_sede || undefined,
    description: desc,
  };
  const jsonLd = grafo(
    organizacao(),
    site(),
    pagina({ nome: titulo, descricao: desc, caminho, tipo: 'ProfilePage', extra: { mainEntity: { '@id': pessoa['@id'] } } }),
    pessoa,
    migalhas([{ nome: 'Início', caminho: '/' }, lista, { nome: p.nome_urna, caminho }]),
  );

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
        <script key="ld-perfil" type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonSeguro(jsonLd) }} />
      </Head>
      <PerfilPolitico dados={dados} />
    </>
  );
}
