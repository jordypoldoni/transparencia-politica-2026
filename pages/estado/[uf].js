import Head from 'next/head';
import Link from 'next/link';
import ServicoAPI from '../../src/servicos/servico_api';
import { t } from '../../src/estilo/tokens';
import { hrefPerfil, casaDoPerfil } from '../../src/lib/casa';

const NOMES = { AC:'Acre', AL:'Alagoas', AP:'Amapá', AM:'Amazonas', BA:'Bahia', CE:'Ceará', DF:'Distrito Federal', ES:'Espírito Santo', GO:'Goiás', MA:'Maranhão', MT:'Mato Grosso', MS:'Mato Grosso do Sul', MG:'Minas Gerais', PA:'Pará', PB:'Paraíba', PR:'Paraná', PE:'Pernambuco', PI:'Piauí', RJ:'Rio de Janeiro', RN:'Rio Grande do Norte', RS:'Rio Grande do Sul', RO:'Rondônia', RR:'Roraima', SC:'Santa Catarina', SP:'São Paulo', SE:'Sergipe', TO:'Tocantins' };
const brl = (v) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(v || 0);

// CORRIGIDO EM 12/09/2026: esta pagina trazia todo mundo do estado numa lista so e chamava
// o conjunto de "deputados federais na Camara". No RS isso somava 49 nomes (o estado tem 31
// federais) porque senadores e deputados estaduais entravam no mesmo balde. Alem do rotulo
// errado, o ranking unico comparava valores de casas com teto de verba diferente, o que faz
// um estadual parecer economico ao lado de um federal sem que isso queira dizer nada.
const GRUPOS = [
  {
    chave: 'federal',
    titulo: 'Deputados federais',
    verba: 'cota parlamentar da Câmara',
    daPara: (c) => !c.ehSenado && !c.ehEstadual,
  },
  {
    chave: 'senado',
    titulo: 'Senadores',
    verba: 'cota do Senado, que tem teto próprio',
    daPara: (c) => c.ehSenado,
  },
  {
    chave: 'estadual',
    titulo: 'Deputados estaduais',
    verba: 'verba de gabinete da assembleia, com teto bem menor que o federal',
    daPara: (c) => c.ehEstadual,
  },
];

function Linha({ d, posicao }) {
  const casa = casaDoPerfil(d);
  // A assembleia do RS publica so o agregado mensal por categoria: nao existe nota fiscal
  // nem fornecedor. Falar em "notas" ali descreveria um dado que nao existe.
  const detalhe = casa.temNotaFiscal
    ? `em ${d.n_notas} notas`
    : `em ${d.meses_com_gasto ?? d.n_notas} meses com gasto`;
  return (
    <li>
      <Link href={hrefPerfil(d)} style={{ textDecoration: 'none', color: 'inherit', display: 'flex', alignItems: 'center', gap: '14px', background: t.cor.papelCartao, borderRadius: t.raio.md, padding: '14px 16px', boxShadow: t.sombra.clicavel, transition: 'box-shadow .15s, transform .15s' }}
        onMouseOver={(e) => { e.currentTarget.style.boxShadow = t.sombra.hover; e.currentTarget.style.transform = 'translateY(-1px)'; }}
        onMouseOut={(e) => { e.currentTarget.style.boxShadow = t.sombra.clicavel; e.currentTarget.style.transform = 'none'; }}>
        <span style={{ flexShrink: 0, width: '26px', fontFamily: t.fonte.titulo, fontWeight: 600, color: t.cor.cinza }}>{posicao}</span>
        <img src={d.foto_url || 'https://via.placeholder.com/80'} alt={d.nome_urna} loading="lazy" style={{ width: '46px', height: '46px', borderRadius: '50%', objectFit: 'cover', objectPosition: 'top', flexShrink: 0, background: '#eee' }} />
        <span style={{ flex: 1, minWidth: 0 }}>
          <span style={{ display: 'block', fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{d.nome_urna}</span>
          <span style={{ fontSize: '0.82rem', color: t.cor.cinza }}>{d.partido_atual} · {detalhe}</span>
        </span>
        <span style={{ flexShrink: 0, textAlign: 'right' }}>
          <span style={{ display: 'block', fontWeight: 800 }}>{brl(d.total)}</span>
          <span style={{ fontSize: '0.72rem', color: t.cor.ouroTexto, fontWeight: 700 }}>ver perfil →</span>
        </span>
      </Link>
    </li>
  );
}

export default function Estado({ uf, nome, deputados, canonical }) {
  const titulo = `Parlamentares de ${nome} (${uf}): gastos e votos | Lume`;
  const desc = `Deputados federais, senadores e deputados estaduais de ${nome}: quanto cada um usou da verba pública em 2026 e como votaram. Em linguagem clara, com a fonte oficial de cada casa.`;

  const blocos = GRUPOS
    .map((g) => ({ ...g, lista: deputados.filter((d) => g.daPara(casaDoPerfil(d))) }))
    .filter((g) => g.lista.length > 0);

  return (
    <>
      <Head>
        <title>{titulo}</title>
        <meta name="description" content={desc} />
        <link rel="canonical" href={canonical} />
        <meta property="og:title" content={titulo} />
        <meta property="og:description" content={desc} />
      </Head>
      <div className="pagina">
        <span style={{ fontSize: '0.78rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: t.cor.ouroTexto }}>Seu estado</span>
        <h1 style={{ fontFamily: t.fonte.titulo, fontWeight: 600, fontSize: 'clamp(1.9rem,5vw,2.8rem)', margin: '8px 0 8px' }}>
          Parlamentares de {nome}
        </h1>
        <p style={{ color: t.cor.cinza, margin: '0 0 12px', maxWidth: '60ch', lineHeight: 1.5 }}>
          Quem representa {nome}, separado por casa. Veja quanto cada um usou da verba pública este ano, toque para ver em quê e como votaram.
        </p>
        <p style={{ color: t.cor.cinza, margin: '0 0 28px', maxWidth: '60ch', lineHeight: 1.5, fontSize: '0.88rem' }}>
          Os valores não se comparam entre as casas: cada uma tem um teto de verba diferente. Por isso cada bloco tem o seu próprio ranking.
        </p>

        {blocos.map((g) => (
          <section key={g.chave} style={{ marginBottom: '36px' }}>
            <h2 style={{ fontFamily: t.fonte.titulo, fontWeight: 600, fontSize: '1.4rem', margin: '0 0 4px' }}>
              {g.titulo} <span style={{ color: t.cor.cinza, fontWeight: 400, fontSize: '1rem' }}>({g.lista.length})</span>
            </h2>
            <p style={{ color: t.cor.cinza, margin: '0 0 14px', fontSize: '0.85rem' }}>Valores da {g.verba}.</p>
            <ol style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: '10px' }}>
              {g.lista.map((d, i) => <Linha key={d.id} d={d} posicao={i + 1} />)}
            </ol>
          </section>
        ))}

        {blocos.length === 0 && <p style={{ color: t.cor.cinza }}>Ainda não há dados de gastos para {nome}.</p>}

        <p style={{ marginTop: '32px' }}>
          <Link href="/deputados" style={{ color: t.cor.verde, fontWeight: 700, textDecoration: 'none' }}>← ver parlamentares de todos os estados</Link>
        </p>
      </div>
    </>
  );
}

export async function getServerSideProps({ params, req }) {
  const uf = String(params.uf || '').toUpperCase();
  const nome = NOMES[uf];
  if (!nome) return { notFound: true };
  const deputados = await ServicoAPI.getRadarPorEstado(uf, 2026);
  const proto = req.headers['x-forwarded-proto'] || 'http';
  const canonical = `${proto}://${req.headers.host}/estado/${uf}`;
  return { props: { uf, nome, deputados: JSON.parse(JSON.stringify(deputados)), canonical } };
}
