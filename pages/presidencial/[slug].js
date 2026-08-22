import Head from 'next/head';
import Link from 'next/link';
import ServicoAPI from '../../src/servicos/servico_api';
import Avatar from '../../components/Avatar';
import { t } from '../../src/estilo/tokens';

function idade(dataNascimento) {
  if (!dataNascimento) return null;
  const n = new Date(dataNascimento);
  if (isNaN(n)) return null;
  const hoje = new Date();
  let a = hoje.getFullYear() - n.getFullYear();
  const aindaNaoFezAno = (hoje.getMonth() < n.getMonth()) || (hoje.getMonth() === n.getMonth() && hoje.getDate() < n.getDate());
  if (aindaNaoFezAno) a--;
  return a;
}

function DadoBio({ rotulo, valor }) {
  if (!valor) return null;
  return (
    <div>
      <p style={{ margin: '0 0 2px', fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: t.cor.cinza }}>{rotulo}</p>
      <p style={{ margin: 0, fontSize: '0.95rem', fontWeight: 600 }}>{valor}</p>
    </div>
  );
}

export default function PerfilPresidenciavel({ candidato, colega, canonical }) {
  const c = candidato;
  const titulo = `${c.nome_urna} (${c.partido_sigla || ''}) — candidato(a) a ${c.cargo === 'Vice-Presidente' ? 'vice-presidente' : 'presidente'} 2026`;
  const desc = `Ficha oficial de ${c.nome_urna}: partido, coligação, situação da candidatura e o plano de governo, direto da fonte (TSE).`;

  return (
    <div className="pagina">
      <Head>
        <title>{titulo} | Lume</title>
        <meta name="description" content={desc} />
        <link rel="canonical" href={canonical} />
        <meta name="robots" content="index, follow" />
        <meta property="og:type" content="profile" />
        <meta property="og:title" content={titulo} />
        <meta property="og:description" content={desc} />
        {c.foto_url && <meta property="og:image" content={c.foto_url} />}
      </Head>

      {/* Coluna de leitura centralizada dentro da página full-width (mesmo padrão do .leitura) */}
      <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
        <Link href="/candidatos-2026?cargo=presidente" style={{ display: 'inline-block', marginBottom: '20px', color: t.cor.cinza, textDecoration: 'none', fontWeight: 600, fontSize: '0.88rem' }}>← Candidatos 2026</Link>

        {/* Duas colunas nascendo juntas do topo (cabeçalho dentro da coluna esquerda) — bio à
            esquerda, plano de governo à direita alinhado com o nome, não só com o card "Quem é". */}
        <div className="hero-grid" style={{ alignItems: 'start', gap: '24px' }}>
          <div>
            <div style={{ display: 'flex', gap: '18px', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap' }}>
              <Avatar nome={c.nome_urna} foto={c.foto_url} size={88} />
              <div>
                <p style={{ margin: '0 0 4px', fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: t.cor.ouroTexto }}>
                  Candidato(a) a {c.cargo === 'Vice-Presidente' ? 'Vice-Presidente' : 'Presidente'} · 2026
                </p>
                <h1 style={{ fontFamily: t.fonte.titulo, fontWeight: 600, fontSize: 'clamp(1.5rem,3.4vw,2.1rem)', margin: '0 0 4px' }}>{c.nome_urna}</h1>
                <p style={{ margin: 0, color: t.cor.cinza, fontSize: '0.95rem' }}>{c.partido_sigla}{c.nr_candidato ? ` · nº ${c.nr_candidato}` : ''}{c.coligacao_nome ? ` · ${c.coligacao_nome}` : ''}</p>
              </div>
            </div>

            {colega && (
              <Link href={`/presidencial/${colega.slug}`} style={{ display: 'block', textDecoration: 'none', color: 'inherit', background: t.cor.papelQuente, borderRadius: t.raio.sm, padding: '12px 16px', marginBottom: '24px', fontSize: '0.88rem' }}>
                {colega.cargo === 'Vice-Presidente' ? 'Vice na chapa' : 'Cabeça de chapa'}: <strong>{colega.nome_urna}</strong> →
              </Link>
            )}

            <section style={{ background: t.cor.papelCartao, borderRadius: t.raio.md, padding: '20px', boxShadow: t.sombra.sutil, marginBottom: '20px' }}>
              <h2 style={{ fontSize: '1rem', margin: '0 0 14px' }}>Quem é</h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '14px' }}>
                <DadoBio rotulo="Nome completo" valor={c.nome_completo} />
                <DadoBio rotulo="Idade" valor={idade(c.data_nascimento) ? `${idade(c.data_nascimento)} anos` : null} />
                <DadoBio rotulo="Naturalidade" valor={c.naturalidade_uf} />
                <DadoBio rotulo="Escolaridade" valor={c.grau_instrucao} />
                <DadoBio rotulo="Ocupação" valor={c.ocupacao} />
                <DadoBio rotulo="Estado civil" valor={c.estado_civil} />
                <DadoBio rotulo="Gênero" valor={c.genero} />
                <DadoBio rotulo="Cor/raça (autodeclarada)" valor={c.cor_raca} />
              </div>
            </section>

            {c.situacao_candidatura && (
              <section style={{ background: t.cor.papelQuente, borderRadius: t.raio.sm, padding: '14px 18px', marginBottom: '20px', fontSize: '0.85rem', color: t.cor.tinta }}>
                <strong>Situação da candidatura:</strong> {c.situacao_candidatura}{c.situacao_detalhe ? ` — ${c.situacao_detalhe}` : ''}
              </section>
            )}

            <p style={{ fontSize: '0.78rem', color: t.cor.cinza }}>
              Fonte: <a href={c.fonte_api || 'https://divulgacandcontas.tse.jus.br/'} target="_blank" rel="noopener noreferrer" style={{ color: t.cor.ouroTexto }}>DivulgaCandContas / TSE</a>. Sem juízo de valor — só os dados oficiais.
            </p>
          </div>

          {/* Proposta de governo — sem resumo por IA (decisão do Jordy, 2026-08-20): link direto pro PDF oficial */}
          <section style={{ background: t.cor.verde, borderRadius: t.raio.lg, padding: 'clamp(18px,3vw,26px)', position: 'sticky', top: '90px' }}>
            <h2 style={{ fontFamily: t.fonte.titulo, fontWeight: 600, fontSize: '1.2rem', color: '#fff', margin: '0 0 8px' }}>Plano de governo</h2>
            {c.proposta_pdf_url ? (
              <>
                {Array.isArray(c.resumo_proposta) && c.resumo_proposta.length > 0 ? (
                  <>
                    <div style={{ display: 'grid', gap: '14px', marginBottom: '16px' }}>
                      {c.resumo_proposta.map((bloco) => (
                        <div key={bloco.tema}>
                          <p style={{ margin: '0 0 4px', fontWeight: 700, fontSize: '0.88rem', color: t.cor.ouro }}>{bloco.tema}</p>
                          <ul style={{ margin: 0, paddingLeft: '18px', display: 'grid', gap: '3px' }}>
                            {(bloco.pontos || []).map((p, i) => (
                              <li key={i} style={{ color: 'rgba(255,255,255,0.85)', fontSize: '0.86rem', lineHeight: 1.4 }}>{p}</li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>
                    <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.74rem', lineHeight: 1.4, margin: '0 0 14px' }}>
                      Resumo gerado por IA a partir do PDF oficial, sem opinião — pode conter imprecisões. Leia o documento completo pra conferir.
                    </p>
                  </>
                ) : (
                  <p style={{ color: 'rgba(255,255,255,0.78)', fontSize: '0.88rem', lineHeight: 1.5, margin: '0 0 14px' }}>
                    Documento registrado por {c.nome_urna} na Justiça Eleitoral. Ainda não geramos o resumo — o texto é o que foi protocolado.
                  </p>
                )}
                <a href={c.proposta_pdf_url} target="_blank" rel="noopener noreferrer"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '12px 22px', fontWeight: 700, fontSize: '0.92rem', borderRadius: t.raio.pill, background: t.cor.ouro, color: t.cor.verdeEscuro, textDecoration: 'none' }}>
                  Ler o PDF oficial →
                </a>
              </>
            ) : (
              <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.9rem', margin: 0 }}>Ainda não coletamos o PDF do plano de governo deste candidato.</p>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

export async function getServerSideProps({ params, req }) {
  const dados = await ServicoAPI.getPresidenciavelPorSlug(params.slug);
  if (!dados) return { notFound: true };
  const proto = req.headers['x-forwarded-proto'] || 'http';
  const canonical = `${proto}://${req.headers.host}/presidencial/${params.slug}`;
  return { props: { candidato: JSON.parse(JSON.stringify(dados.candidato)), colega: JSON.parse(JSON.stringify(dados.colega)), canonical } };
}
