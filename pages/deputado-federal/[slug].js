import Head from 'next/head';
import Link from 'next/link';
import ServicoAPI from '../../src/servicos/servico_api';
import Avatar from '../../components/Avatar';
import { NOMES_UF, pctDoTeto } from '../../src/lib/cotas';
import { t } from '../../src/estilo/tokens';

const brl = (v) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(v || 0);

// Compara siglas de partido ignorando acento e caixa: o TSE grava "PCDOB" e "UNIÃO",
// a Câmara grava "PCdoB" e "União". Sem isso, todo mundo "trocaria de partido".
const mesmaSigla = (a, b) => {
  const limpa = (s) => String(s || '').normalize('NFD').replace(/\p{Diacritic}/gu, '').toUpperCase().trim();
  return limpa(a) === limpa(b);
};

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

// Um número, o que ele significa e de onde veio. Sem adjetivo e sem cor de julgamento:
// o site entrega o fato e a referência, quem conclui é o leitor.
function Numero({ valor, rotulo, contexto, fonte }) {
  return (
    <div style={{ background: t.cor.papelCartao, borderRadius: t.raio.md, padding: '18px 20px', boxShadow: t.sombra.sutil, display: 'flex', flexDirection: 'column', gap: '4px' }}>
      <span style={{ fontFamily: t.fonte.titulo, fontWeight: 600, fontSize: 'clamp(1.4rem,3vw,1.9rem)', lineHeight: 1.1 }}>{valor}</span>
      <span style={{ fontSize: '0.85rem', fontWeight: 700 }}>{rotulo}</span>
      {contexto && <span style={{ fontSize: '0.82rem', color: t.cor.cinza, lineHeight: 1.45 }}>{contexto}</span>}
      {fonte && <span style={{ fontSize: '0.72rem', color: t.cor.cinza, marginTop: '2px' }}>Fonte: {fonte}</span>}
    </div>
  );
}

export default function PerfilDeputadoFederal({ candidato, canonical }) {
  const c = candidato;
  const m = c.mandato; // resumo do mandato atual, quando é a mesma pessoa
  const nomeUf = NOMES_UF[c.uf] || c.uf;
  const trocouPartido = m && m.partido_mandato && !mesmaSigla(c.partido_sigla, m.partido_mandato);

  const teto = m?.gasto?.media_mensal
    ? pctDoTeto({ fonteApi: m.fonte_api, casa: null, uf: m.uf_sede }, m.gasto.media_mensal)
    : null;

  const titulo = `${c.nome_urna} (${c.partido_sigla || ''}), candidato(a) a Deputado(a) Federal por ${c.uf} 2026`;
  const desc = m
    ? `${c.nome_urna} já exerce mandato de Deputado(a) Federal por ${nomeUf} e concorre de novo em 2026. Veja gastos, votos e presença do mandato atual, com a fonte oficial.`
    : `Ficha oficial de ${c.nome_urna}: partido, coligação e dados da candidatura a Deputado(a) Federal por ${nomeUf}, direto da fonte (TSE).`;

  return (
    <div className="pagina">
      <Head>
        <title>{titulo} | Lume Cidadão</title>
        <meta name="description" content={desc} />
        <link rel="canonical" href={canonical} />
        <meta name="robots" content="index, follow" />
        <meta property="og:type" content="profile" />
        <meta property="og:title" content={titulo} />
        <meta property="og:description" content={desc} />
        {c.foto_url && <meta property="og:image" content={c.foto_url} />}
      </Head>

      <Link href="/candidatos-2026?cargo=deputado-federal" style={{ display: 'inline-block', marginBottom: '20px', color: t.cor.cinza, textDecoration: 'none', fontWeight: 600, fontSize: '0.88rem' }}>← Candidatos 2026</Link>

      <div style={{ display: 'flex', gap: '18px', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap' }}>
        <Avatar nome={c.nome_urna} foto={c.foto_url} size={88} />
        <div style={{ minWidth: 0 }}>
          <p style={{ margin: '0 0 4px', fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: t.cor.ouroTexto }}>
            Candidato(a) a Deputado(a) Federal · {c.uf} · 2026
          </p>
          <h1 style={{ fontFamily: t.fonte.titulo, fontWeight: 600, fontSize: 'clamp(1.5rem,3.4vw,2.1rem)', margin: '0 0 4px' }}>{c.nome_urna}</h1>
          <p style={{ margin: 0, color: t.cor.cinza, fontSize: '0.95rem' }}>{c.partido_sigla}{c.nr_candidato ? ` · nº ${c.nr_candidato}` : ''}{c.coligacao_nome ? ` · ${c.coligacao_nome}` : ''}</p>
        </div>
      </div>

      {/* Faixa de identidade: já tem mandato? mudou de partido para esta eleição? */}
      {m && (
        <div style={{ background: t.cor.papelQuente2, borderRadius: t.raio.sm, padding: '14px 18px', marginBottom: '22px', fontSize: '0.92rem', color: t.cor.tinta, lineHeight: 1.55 }}>
          <strong>Já é Deputado(a) Federal por {nomeUf} e concorre à reeleição.</strong>
          {trocouPartido && (
            <> Concorre pelo <strong>{c.partido_sigla}</strong>, mas exerce o mandato atual pelo <strong>{m.partido_mandato}</strong>.</>
          )}
          {' '}Abaixo está o que ele fez com o mandato que já tem.
        </div>
      )}

      {/* Os quatro números. Só aparecem para quem tem mandato: não há o que prestar de contas
          sobre um mandato que não existe. */}
      {m && (
        <section style={{ marginBottom: '26px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: '14px' }}>
            {m.gasto && (
              <Numero
                valor={brl(m.gasto.total)}
                rotulo={`Gastou de cota parlamentar em ${m.gasto.ano}`}
                contexto={teto
                  ? `Média de ${brl(m.gasto.media_mensal)} por mês, num teto de ${brl(teto.teto)} para ${c.uf}. Equivale a ${teto.pct}% do limite.`
                  : `Em ${m.gasto.n_notas} notas fiscais.`}
                fonte="Câmara dos Deputados"
              />
            )}
            {/* A conta TEM que fechar: total = sim + não + o resto (abstenção, obstrução,
                Art. 17). Se o resto ficar de fora do texto, o leitor soma 59 e 21, vê 81 no
                título e conclui, com razão, que o site errou. */}
            <Numero
              valor={m.votos.total}
              rotulo="Votações em que registrou voto"
              contexto={(() => {
                const outros = m.votos.total - m.votos.sim - m.votos.nao;
                const base = `${m.votos.sim} vezes Sim e ${m.votos.nao} vezes Não`;
                if (outros > 0) return `${base}, mais ${outros} ${outros === 1 ? 'registro' : 'registros'} de abstenção ou obstrução, nas votações nominais do mandato.`;
                return `${base}, nas votações nominais do mandato.`;
              })()}
              fonte="Câmara dos Deputados"
            />
            {m.presenca && (
              <Numero
                valor={`${Math.round(m.presenca.percentual)}%`}
                rotulo="Presença nas votações"
                contexto={`Registrou voto em ${m.presenca.compareceu} das ${m.presenca.total} votações nominais do período. Ausência justificada também conta como não registrada.`}
                fonte="Câmara dos Deputados"
              />
            )}
            {m.n_proposicoes != null && (
              <Numero
                valor={m.n_proposicoes >= 500 ? '500+' : m.n_proposicoes}
                rotulo="Proposições que apresentou"
                contexto="Inclui coautorias. Propor não é aprovar: a proposta pode nunca ter ido a voto."
                fonte="Câmara dos Deputados"
              />
            )}
          </div>

          <div style={{ marginTop: '14px', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <Link href={`/deputado/${m.slug}`} style={{ background: t.cor.verde, color: t.cor.ouro, padding: '11px 22px', borderRadius: t.raio.pill, textDecoration: 'none', fontWeight: 700, fontSize: '0.92rem', boxShadow: t.sombra.clicavel }}>
              Ver o mandato em detalhe →
            </Link>
            <span style={{ alignSelf: 'center', fontSize: '0.85rem', color: t.cor.cinza }}>
              Como votou em cada matéria, em que gastou, comissões e trajetória.
            </span>
          </div>
        </section>
      )}

      {/* Sem mandato federal hoje: dizer isso é informação, não é tela vazia. */}
      {!m && (
        <div style={{ background: t.cor.papel, border: `1px solid ${t.cor.papelQuente2}`, borderRadius: t.raio.sm, padding: '14px 18px', marginBottom: '22px', fontSize: '0.9rem', color: t.cor.tinta, lineHeight: 1.55 }}>
          <strong>Não exerce mandato de Deputado(a) Federal hoje.</strong> Por isso não há gastos de cota,
          votações nem presença a mostrar aqui. Quem já está no cargo tem esse histórico na
          {' '}<Link href="/deputados" style={{ color: t.cor.ouroTexto, fontWeight: 700 }}>lista de Deputados</Link>.
        </div>
      )}

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
          {m && <DadoBio rotulo="Comissões que integra" valor={m.n_comissoes ? `${m.n_comissoes}` : null} />}
          {m && <DadoBio rotulo="Cargos eletivos anteriores" valor={m.n_cargos_anteriores ? `${m.n_cargos_anteriores}` : null} />}
        </div>
      </section>

      {/* Situação da candidatura: o TSE ainda não publica. Dizer isso é mais honesto que
          esconder o campo, porque o leitor pode supor que já foi deferida. */}
      <section style={{ background: t.cor.papelQuente, borderRadius: t.raio.sm, padding: '14px 18px', marginBottom: '20px', fontSize: '0.85rem', color: t.cor.tinta, lineHeight: 1.5 }}>
        {c.situacao_candidatura ? (
          <><strong>Situação da candidatura:</strong> {c.situacao_candidatura}{c.situacao_detalhe ? `, ${c.situacao_detalhe}` : ''}</>
        ) : (
          <><strong>Situação da candidatura: ainda não julgada.</strong> A Justiça Eleitoral ainda não publicou
          o deferimento das candidaturas de 2026, então esta ficha não afirma que o registro está aprovado.</>
        )}
      </section>

      <section style={{ background: t.cor.papel, border: `1px solid ${t.cor.papelQuente2}`, borderRadius: t.raio.sm, padding: '14px 18px', marginBottom: '20px', fontSize: '0.85rem', color: t.cor.cinza, lineHeight: 1.5 }}>
        Deputado(a) Federal não é obrigado(a) por lei a apresentar um plano de governo na Justiça Eleitoral: essa exigência vale só para cargos majoritários (Presidente, Governador, Prefeito). Por isso não há um documento de propostas aqui.
      </section>

      <p style={{ fontSize: '0.78rem', color: t.cor.cinza, lineHeight: 1.6 }}>
        Fontes: <a href={c.fonte_api || 'https://divulgacandcontas.tse.jus.br/'} target="_blank" rel="noopener noreferrer" style={{ color: t.cor.ouroTexto }}>DivulgaCandContas / TSE</a> para os dados da candidatura
        {m && <> e <a href="https://dadosabertos.camara.leg.br/" target="_blank" rel="noopener noreferrer" style={{ color: t.cor.ouroTexto }}>Dados Abertos da Câmara</a> para o histórico do mandato</>}.
        {' '}Sem juízo de valor, só os dados oficiais.
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
