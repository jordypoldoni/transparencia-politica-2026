import Head from 'next/head';
import Link from 'next/link';
import ServicoAPI from '../../src/servicos/servico_api';
import Avatar from '../../components/Avatar';
import { NOMES_UF } from '../../src/lib/cotas';
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

export default function PerfilDeputadoFederal({ candidato, canonical }) {
  const c = candidato;
  const nomeUf = NOMES_UF[c.uf] || c.uf;
  const titulo = `${c.nome_urna} (${c.partido_sigla || ''}), candidato(a) a Deputado(a) Federal por ${c.uf} 2026`;
  const desc = `Ficha oficial de ${c.nome_urna}: partido, coligação e situação da candidatura${c.reeleicao ? ', buscando reeleição' : ''}, candidato(a) a Deputado(a) Federal por ${nomeUf}, direto da fonte (TSE).`;

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

      <Link href="/candidatos-2026?cargo=deputado-federal" style={{ display: 'inline-block', marginBottom: '20px', color: t.cor.cinza, textDecoration: 'none', fontWeight: 600, fontSize: '0.88rem' }}>← Candidatos 2026</Link>

      <div style={{ display: 'flex', gap: '18px', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap' }}>
        <Avatar nome={c.nome_urna} foto={c.foto_url} size={88} />
        <div style={{ minWidth: 0 }}>
          <p style={{ margin: '0 0 4px', fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: t.cor.ouroTexto }}>
            Candidato(a) a Deputado(a) Federal · {c.uf} · 2026
          </p>
          <h1 style={{ fontFamily: t.fonte.titulo, fontWeight: 600, fontSize: 'clamp(1.5rem,3.4vw,2.1rem)', margin: '0 0 4px' }}>{c.nome_urna}</h1>
          <p style={{ margin: 0, color: t.cor.cinza, fontSize: '0.95rem' }}>{c.partido_sigla}{c.nr_candidato ? ` · nº ${c.nr_candidato}` : ''}{c.coligacao_nome ? ` · ${c.coligacao_nome}` : ''}</p>
        </div>
      </div>

      {c.reeleicao && (
        <div style={{ background: t.cor.papelQuente2, borderRadius: t.raio.sm, padding: '12px 16px', marginBottom: '20px', fontSize: '0.88rem', color: t.cor.tinta, fontWeight: 600 }}>
          🔁 Já ocupa o cargo de Deputado(a) Federal e está buscando reeleição em 2026.
        </div>
      )}

      {/* Menos campos que a ficha presidencial (não há Plano de governo pra esse cargo), então a
          grade usa uma coluna mínima maior pra espalhar os dados lado a lado em vez de empilhar. */}
      <section style={{ background: t.cor.papelCartao, borderRadius: t.raio.md, padding: 'clamp(18px,3vw,26px)', boxShadow: t.sombra.sutil, marginBottom: '20px' }}>
        <h2 style={{ fontSize: '1rem', margin: '0 0 16px' }}>Quem é</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '18px 24px' }}>
          <DadoBio rotulo="Nome completo" valor={c.nome_completo} />
          <DadoBio rotulo="Concorre por" valor={nomeUf ? `${nomeUf} (${c.uf})` : c.uf} />
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
          <strong>Situação da candidatura:</strong> {c.situacao_candidatura}{c.situacao_detalhe ? `, ${c.situacao_detalhe}` : ''}
        </section>
      )}

      <section style={{ background: t.cor.papel, border: `1px solid ${t.cor.papelQuente2}`, borderRadius: t.raio.sm, padding: '14px 18px', marginBottom: '20px', fontSize: '0.85rem', color: t.cor.cinza }}>
        Deputado(a) Federal não é obrigado(a) por lei a apresentar um plano de governo na Justiça Eleitoral: essa exigência vale só para cargos majoritários (Presidente, Governador, Prefeito). Por isso não há um documento de propostas aqui.
        {' '}Quer ver o desempenho de quem já está no cargo hoje (votos e gastos)? Veja a lista de <Link href="/deputados" style={{ color: t.cor.ouroTexto, fontWeight: 700 }}>Deputados</Link>.
      </section>

      <p style={{ fontSize: '0.78rem', color: t.cor.cinza }}>
        Fonte: <a href={c.fonte_api || 'https://divulgacandcontas.tse.jus.br/'} target="_blank" rel="noopener noreferrer" style={{ color: t.cor.ouroTexto }}>DivulgaCandContas / TSE</a>. Sem juízo de valor, só os dados oficiais.
      </p>
    </div>
  );
}

export async function getServerSideProps({ params, req }) {
  const dados = await ServicoAPI.getCandidatoDeputadoFederalPorSlug(params.slug);
  if (!dados) return { notFound: true };
  const proto = req.headers['x-forwarded-proto'] || 'http';
  const canonical = `${proto}://${req.headers.host}/deputado-federal/${params.slug}`;
  return { props: { candidato: JSON.parse(JSON.stringify(dados)), canonical } };
}
