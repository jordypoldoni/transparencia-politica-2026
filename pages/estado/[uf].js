import Head from 'next/head';
import Link from 'next/link';
import ServicoAPI from '../../src/servicos/servico_api';
import { t } from '../../src/estilo/tokens';

const NOMES = { AC:'Acre', AL:'Alagoas', AP:'Amapá', AM:'Amazonas', BA:'Bahia', CE:'Ceará', DF:'Distrito Federal', ES:'Espírito Santo', GO:'Goiás', MA:'Maranhão', MT:'Mato Grosso', MS:'Mato Grosso do Sul', MG:'Minas Gerais', PA:'Pará', PB:'Paraíba', PR:'Paraná', PE:'Pernambuco', PI:'Piauí', RJ:'Rio de Janeiro', RN:'Rio Grande do Norte', RS:'Rio Grande do Sul', RO:'Rondônia', RR:'Roraima', SC:'Santa Catarina', SP:'São Paulo', SE:'Sergipe', TO:'Tocantins' };
const brl = (v) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(v || 0);

export default function Estado({ uf, nome, deputados, canonical }) {
  const titulo = `Deputados de ${nome} (${uf}) — gastos e votos | Transparência`;
  const desc = `Veja os deputados federais de ${nome}, quanto cada um usou da cota parlamentar em 2026 e como votaram. Em linguagem clara, com a fonte oficial da Câmara.`;
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
          Deputados de {nome}
        </h1>
        <p style={{ color: t.cor.cinza, margin: '0 0 28px', maxWidth: '60ch', lineHeight: 1.5 }}>
          {deputados.length} deputados federais representam {nome} na Câmara. Veja quanto cada um usou da verba pública este ano — toque para ver em quê e como votaram.
        </p>

        <ol style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: '10px' }}>
          {deputados.map((d, i) => (
            <li key={d.id}>
              <Link href={`/deputado/${d.slug}`} style={{ textDecoration: 'none', color: 'inherit', display: 'flex', alignItems: 'center', gap: '14px', background: t.cor.papelCartao, borderRadius: t.raio.md, padding: '14px 16px', boxShadow: t.sombra.clicavel, transition: 'box-shadow .15s, transform .15s' }}
                onMouseOver={(e) => { e.currentTarget.style.boxShadow = t.sombra.hover; e.currentTarget.style.transform = 'translateY(-1px)'; }}
                onMouseOut={(e) => { e.currentTarget.style.boxShadow = t.sombra.clicavel; e.currentTarget.style.transform = 'none'; }}>
                <span style={{ flexShrink: 0, width: '26px', fontFamily: t.fonte.titulo, fontWeight: 600, color: t.cor.cinza }}>{i + 1}</span>
                <img src={d.foto_url || 'https://via.placeholder.com/80'} alt={d.nome_urna} loading="lazy" style={{ width: '46px', height: '46px', borderRadius: '50%', objectFit: 'cover', objectPosition: 'top', flexShrink: 0, background: '#eee' }} />
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ display: 'block', fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{d.nome_urna}</span>
                  <span style={{ fontSize: '0.82rem', color: t.cor.cinza }}>{d.partido_atual} · em {d.n_notas} notas</span>
                </span>
                <span style={{ flexShrink: 0, textAlign: 'right' }}>
                  <span style={{ display: 'block', fontWeight: 800 }}>{brl(d.total)}</span>
                  <span style={{ fontSize: '0.72rem', color: t.cor.ouroTexto, fontWeight: 700 }}>ver perfil →</span>
                </span>
              </Link>
            </li>
          ))}
        </ol>
        {deputados.length === 0 && <p style={{ color: t.cor.cinza }}>Ainda não há dados de gastos para {nome}.</p>}

        <p style={{ marginTop: '32px' }}>
          <Link href="/deputados" style={{ color: t.cor.verde, fontWeight: 700, textDecoration: 'none' }}>← ver deputados de todos os estados</Link>
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
