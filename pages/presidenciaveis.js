import Head from 'next/head';
import Link from 'next/link';
import ServicoAPI from '../src/servicos/servico_api';
import Avatar from '../components/Avatar';
import { t } from '../src/estilo/tokens';

function CardCandidato({ pessoa, papel }) {
  if (!pessoa) return null;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
      <Avatar nome={pessoa.nome_urna} foto={pessoa.foto_url} size={papel === 'Presidente' ? 64 : 40} />
      <div style={{ minWidth: 0, flex: '1 1 auto' }}>
        <p style={{ margin: 0, fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: t.cor.cinza }}>{papel}</p>
        <p style={{ margin: 0, fontWeight: 700, fontSize: papel === 'Presidente' ? '1.05rem' : '0.92rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{pessoa.nome_urna}</p>
      </div>
    </div>
  );
}

export default function Presidenciaveis({ chapas }) {
  return (
    <div className="pagina">
      <Head>
        <title>Presidenciáveis 2026 — candidatos e propostas de governo | Transparência</title>
        <meta name="description" content="Todos os candidatos à Presidência da República em 2026: partido, coligação, situação da candidatura e o plano de governo oficial de cada um, direto da fonte (TSE)." />
      </Head>

      <h1 style={{ fontFamily: t.fonte.titulo, fontWeight: 600, fontSize: 'clamp(1.8rem,4vw,2.6rem)', margin: '0 0 10px' }}>
        Presidenciáveis 2026
      </h1>
      <p style={{ color: t.cor.cinza, margin: '0 0 24px', maxWidth: '70ch', lineHeight: 1.5 }}>
        {chapas.length} chapa{chapas.length === 1 ? '' : 's'} registrada{chapas.length === 1 ? '' : 's'} para a Presidência.
        Dados oficiais do <a href="https://www.tse.jus.br/" target="_blank" rel="noopener noreferrer" style={{ color: t.cor.ouroTexto, fontWeight: 700 }}>TSE</a>, sem análise ou opinião — clique num candidato pra ver a ficha completa e o plano de governo dele. Tire suas próprias conclusões com base nos dados.
      </p>

      {chapas.length === 0 ? (
        <p style={{ color: t.cor.cinza }}>Nenhum candidato coletado ainda.</p>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '14px' }}>
          {chapas.map((c) => (
            <Link key={c.nr_candidato || c.presidente.slug} href={`/presidencial/${c.presidente.slug}`} style={{ textDecoration: 'none', color: 'inherit' }}>
              <div style={{ background: t.cor.papelCartao, borderRadius: t.raio.md, padding: '18px', height: '100%', minWidth: 0, overflow: 'hidden', boxShadow: t.sombra.clicavel, transition: 'box-shadow .15s ease, transform .15s ease' }}
                onMouseOver={(e) => { e.currentTarget.style.boxShadow = t.sombra.hover; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                onMouseOut={(e) => { e.currentTarget.style.boxShadow = t.sombra.clicavel; e.currentTarget.style.transform = 'none'; }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px' }}>
                  <span style={{ fontSize: '0.78rem', fontWeight: 700, color: t.cor.cinza }}>{c.presidente.partido_sigla}{c.presidente.coligacao_nome ? ` · ${c.presidente.coligacao_nome}` : ''}</span>
                  {c.nr_candidato && (
                    <span style={{ fontFamily: t.fonte.titulo, fontWeight: 700, fontSize: '1.3rem', color: t.cor.ouroTexto }}>{c.nr_candidato}</span>
                  )}
                </div>
                <div style={{ display: 'grid', gap: '12px', minWidth: 0 }}>
                  <CardCandidato pessoa={c.presidente} papel="Presidente" />
                  {c.vice && <CardCandidato pessoa={c.vice} papel="Vice" />}
                </div>
                {c.presidente.situacao_candidatura && (
                  <p style={{ margin: '14px 0 0', fontSize: '0.76rem', color: t.cor.cinza }}>Situação da candidatura: {c.presidente.situacao_candidatura}</p>
                )}
                <span style={{ display: 'inline-block', marginTop: '10px', color: t.cor.ouroTexto, fontWeight: 700, fontSize: '0.8rem' }}>Ver ficha e proposta →</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

export async function getServerSideProps() {
  const chapas = await ServicoAPI.listarPresidenciaveis(2026).catch(() => []);
  return { props: { chapas: JSON.parse(JSON.stringify(chapas)) } };
}
