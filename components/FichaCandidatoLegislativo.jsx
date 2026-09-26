import Head from 'next/head';
import Link from 'next/link';
import Avatar from './Avatar';
import { NOMES_UF, pctDoTeto } from '../src/lib/cotas';
import { t } from '../src/estilo/tokens';
import { hrefPerfil } from '../src/lib/casa';
import { useVoltarLista } from '../src/lib/voltarLista';
// FICHA DE CANDIDATO (22/09/2026; governador entrou em 24/09). Era o corpo de
// pages/deputado-federal/[slug].js; virou componente quando os 318 candidatos a SENADOR
// chegaram, para as duas páginas não serem duas cópias de 200 linhas com palavras trocadas.
// O que muda por cargo mora em CARGOS, logo abaixo. O que muda por PESSOA (ser a mesma casa,
// outra casa, ou ex-parlamentar) é calculado a partir do mandato que ela tem ou teve.
//
// Os mesmos componentes da ficha do presidenciavel: reuso, nao reimplementacao.
import SituacaoCandidatura from './SituacaoCandidatura';
import PatrimonioDeclarado from './PatrimonioDeclarado';
import DocumentosERedes from './DocumentosERedes';
import TrajetoriaEleitoral from './TrajetoriaEleitoral';
import BotaoVoltar from './BotaoVoltar';
import BotaoFavorito from './BotaoFavorito';
const caminhoDe = (url) => { try { return new URL(url).pathname; } catch { return String(url || ''); } };


const CARGOS = {
  'deputado-federal': {
    nome: 'Deputado(a) Federal',
    chaveLista: 'deputado-federal',
    listaPadrao: '/candidatos-2026?cargo=deputado-federal',
    listaParlamentares: { href: '/deputados', rotulo: 'lista de Deputados' },
    semPlano: 'Deputado(a) Federal não é obrigado(a) por lei a apresentar um plano de governo na Justiça Eleitoral: essa exigência vale só para cargos majoritários do Executivo (Presidente, Governador, Prefeito). Por isso não há um documento de propostas aqui.',
  },
  senador: {
    nome: 'Senador(a)',
    chaveLista: 'senador',
    listaPadrao: '/candidatos-2026?cargo=senador',
    listaParlamentares: { href: '/senadores', rotulo: 'lista de Senadores' },
    semPlano: 'Senador(a) não é obrigado(a) por lei a apresentar um plano de governo na Justiça Eleitoral: a eleição para o Senado é majoritária, mas a exigência vale só para o Executivo (Presidente, Governador, Prefeito). Por isso não há um documento de propostas aqui.',
  },
  // GOVERNADOR (24/09/2026) é o primeiro cargo do EXECUTIVO nesta ficha, e por isso muda duas
  // coisas: a chapa tem um vice em vez de dois suplentes, e o plano de governo é OBRIGATÓRIO
  // por lei, então aqui não cabe a ressalva de "não é obrigado a apresentar".
  governador: {
    nome: 'Governador(a)',
    chaveLista: 'governador',
    listaPadrao: '/candidatos-2026?cargo=governador',
    listaParlamentares: null,
    semMandato: 'Não exerce mandato no Congresso Nacional hoje, então não há gastos de cota, votações nem presença a mostrar aqui. Governo de estado não é acompanhado pelo site: o que temos do Executivo estadual são os gastos do estado, na seção de gastos públicos.',
    comPlano: 'Candidato(a) a Governador(a) é obrigado(a) por lei a entregar uma proposta de governo à Justiça Eleitoral. Quando o TSE publica o documento, ele aparece na seção de documentos abaixo, no original.',
  },
  // DEPUTADO ESTADUAL (25/09/2026): a ficha é lida do TSE NA HORA (pages/candidato-estadual), nada
  // no banco. A ligação com o mandato atual ainda NÃO existe: a lista do TSE diz "não é reeleição"
  // para todo mundo (Leonel Radde incluído), então o texto não pode afirmar que a pessoa não tem
  // mandato. Diz o que o site sabe e aponta a trajetória, que mostra se já foi eleito(a).
  'deputado-estadual': {
    nome: 'Deputado(a) Estadual',
    chaveLista: 'deputado-estadual',
    listaPadrao: '/candidatos-2026?cargo=deputado-estadual',
    listaParlamentares: null,
    semMandato: 'Esta ficha ainda não está ligada ao mandato que o(a) candidato(a) possa exercer hoje, então gastos e votos não aparecem aqui. A trajetória eleitoral abaixo mostra se já foi eleito(a) antes. Das Assembleias Legislativas, o site acompanha por enquanto as de SP e do RS, no menu Parlamentares.',
    semPlano: 'Deputado(a) Estadual não é obrigado(a) por lei a apresentar um plano de governo na Justiça Eleitoral: essa exigência vale só para cargos majoritários do Executivo (Presidente, Governador, Prefeito). Por isso não há um documento de propostas aqui.',
  },
};

// Casa do mandato que a pessoa tem ou teve, para dizer a fonte certa dos números.
const casaDoMandato = (m) => (/senado/i.test(m?.fonte_api || '') || /senador/i.test(m?.cargo_atual || '') ? 'senado' : 'camara');
const FONTE_CASA = { camara: 'Câmara dos Deputados', senado: 'Senado Federal' };

// SUPLENTES (22/09/2026). Chapa de senador tem 1º e 2º suplente, eleitos junto com o titular,
// sem voto próprio. Assumem a vaga quando o titular sai: licença, cargo no governo, renúncia ou
// morte. A ordem vem do rótulo que o TSE manda ("1º Suplente"), não da posição na lista.
function Suplentes({ suplentes }) {
  const lista = Array.isArray(suplentes) ? suplentes : [];
  return (
    <section style={{ background: t.cor.papelCartao, borderRadius: t.raio.md, padding: 'clamp(18px,3vw,26px)', boxShadow: t.sombra.sutil, marginBottom: '20px' }}>
      <h2 style={{ fontSize: '1rem', margin: '0 0 6px' }}>Suplentes da chapa</h2>
      <p style={{ margin: '0 0 16px', fontSize: '0.88rem', color: t.cor.cinza, lineHeight: 1.5 }}>
        Quem assume a vaga se o titular sair do cargo (licença, cargo no governo, renúncia ou morte).
        São eleitos junto, na mesma chapa, sem receber voto próprio.
      </p>
      {lista.length === 0 ? (
        <p style={{ margin: 0, fontSize: '0.88rem', color: t.cor.tinta }}>O TSE não informa suplentes nesta candidatura.</p>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(240px, 100%), 1fr))', gap: '12px' }}>
          {lista.map((s, i) => (
            <div key={s.sq || i} style={{ background: t.cor.papelQuente, borderRadius: t.raio.md, padding: '14px 16px' }}>
              <p style={{ margin: '0 0 4px', fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: t.cor.tinta }}>
                {s.cargo || `Suplente (${s.posicao}º na lista da fonte)`}
              </p>
              <p style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: t.cor.tinta }}>{s.nome || 'Nome não informado'}</p>
              {(s.partido || s.nome_completo) && (
                <p style={{ margin: '2px 0 0', fontSize: '0.82rem', color: t.cor.tinta }}>
                  {[s.nome_completo && s.nome_completo !== s.nome ? s.nome_completo : null, s.partido].filter(Boolean).join(' · ')}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

// O VICE (24/09/2026). Na chapa majoritária do Executivo é uma pessoa só, eleita junto com o
// titular e sem voto próprio, que assume o governo se o titular sair. Mesma ideia da seção de
// suplentes do senador, e por isso o mesmo desenho.
function Vice({ vice, titular }) {
  return (
    <section style={{ background: t.cor.papelCartao, borderRadius: t.raio.md, padding: 'clamp(18px,3vw,26px)', boxShadow: t.sombra.sutil, marginBottom: '20px' }}>
      <h2 style={{ fontSize: '1rem', margin: '0 0 6px' }}>Vice da chapa</h2>
      <p style={{ margin: '0 0 16px', fontSize: '0.88rem', color: t.cor.cinza, lineHeight: 1.5 }}>
        Quem assume o governo do estado se o titular sair do cargo (licença, renúncia, cassação
        ou morte). É eleito junto, na mesma chapa, sem receber voto próprio.
      </p>
      {!vice ? (
        <p style={{ margin: 0, fontSize: '0.88rem', color: t.cor.tinta }}>O TSE não informa o vice nesta candidatura.</p>
      ) : (
        <div style={{ background: t.cor.papelQuente, borderRadius: t.raio.md, padding: '14px 16px', maxWidth: '420px' }}>
          <p style={{ margin: '0 0 4px', fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: t.cor.tinta }}>
            {vice.cargo || 'Vice-Governador(a)'}
          </p>
          <p style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: t.cor.tinta }}>{vice.nome || 'Nome não informado'}</p>
          {(vice.partido || vice.nome_completo) && (
            <p style={{ margin: '2px 0 0', fontSize: '0.82rem', color: t.cor.tinta }}>
              {[vice.nome_completo && vice.nome_completo !== vice.nome ? vice.nome_completo : null, vice.partido].filter(Boolean).join(' · ')}
            </p>
          )}
          {/* A fonte marca como não apto quem ainda não teve o registro aceito. Dizer isso é
              melhor do que apresentar a pessoa como vice confirmado.
              25/09/2026: nas 5 chapas com vice não apto, quem estava INDEFERIDO era o titular, e o
              vice só acompanhava a chapa. "Ainda não considera apto" dava a entender pendência.
              Quando o titular não está apto, a frase diz isso, com a situação escrita pela fonte. */}
          {vice.apto === false && titular?.apto === false && (
            <p style={{ margin: '8px 0 0', fontSize: '0.8rem', color: t.cor.alertaTexto, lineHeight: 1.45 }}>
              A chapa não está apta: a candidatura do titular consta como{titular.situacao ? <> <strong style={{ fontWeight: 700 }}>{titular.situacao}</strong></> : ' não apta'} no
              TSE, e o registro do vice segue a situação do titular.
            </p>
          )}
          {vice.apto === false && titular?.apto !== false && (
            <p style={{ margin: '8px 0 0', fontSize: '0.8rem', color: t.cor.alertaTexto, lineHeight: 1.45 }}>
              A Justiça Eleitoral ainda não considera este registro apto. A chapa pode mudar até a eleição.
            </p>
          )}
        </div>
      )}
      {/* Quem saiu da chapa é informação, não lixo: em 19 das 201 chapas de governador a ficha
          do TSE ainda lista o vice substituído junto do atual. */}
      {vice?.substituidos?.length > 0 && (
        <p style={{ margin: '14px 0 0', fontSize: '0.82rem', color: t.cor.cinza, lineHeight: 1.5 }}>
          Antes da chapa atual, a candidatura registrou {vice.substituidos.length === 1 ? 'outro nome' : 'outros nomes'} para vice:{' '}
          {vice.substituidos.map((x) => `${x.nome}${x.partido ? ` (${x.partido})` : ''}`).join(', ')}. A substituição consta da própria ficha do TSE.
        </p>
      )}
    </section>
  );
}

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

export default function FichaCandidatoLegislativo({ candidato, canonical, cargo = 'deputado-federal' }) {
  const cfg = CARGOS[cargo] || CARGOS['deputado-federal'];
  const voltarPara = useVoltarLista(cfg.chaveLista, cfg.listaPadrao);
  const c = candidato;
  const m = c.mandato; // resumo do mandato atual, quando é a mesma pessoa
  const nomeUf = NOMES_UF[c.uf] || c.uf;
  const trocouPartido = m && m.partido_mandato && !mesmaSigla(c.partido_sigla, m.partido_mandato);
  // Três casos, e cada um pede uma frase diferente. Entre os 318 candidatos a senador, 23 são
  // senadores buscando reeleição, 30 são deputados tentando mudar de casa e 3 são ex-senadores.
  const casaM = m ? casaDoMandato(m) : null;
  const fonteMandato = casaM ? FONTE_CASA[casaM] : null;
  // 'Mesmo cargo' so faz sentido entre cargos legislativos: um governador nunca esta
  // buscando reeleicao para a casa onde teve mandato.
  const mesmoCargo = m && cargo !== 'governador' && ((cargo === 'senador') === (casaM === 'senado'));
  const exercendo = m && m.em_exercicio !== false;
  const cargoMandato = casaM === 'senado' ? 'Senador(a)' : 'Deputado(a) Federal';

  const teto = m?.gasto?.media_mensal
    ? pctDoTeto({ fonteApi: m.fonte_api, casa: null, uf: m.uf_sede }, m.gasto.media_mensal)
    : null;

  const titulo = `${c.nome_urna} (${c.partido_sigla || ''}), candidato(a) a ${cfg.nome} por ${c.uf} 2026`;
  const desc = m
    ? `${c.nome_urna} ${exercendo ? 'exerce' : 'já exerceu'} mandato de ${cargoMandato} por ${nomeUf} e concorre a ${cfg.nome} em 2026. Veja gastos, votos e presença do mandato, com a fonte oficial.`
    : `Ficha oficial de ${c.nome_urna}: partido, coligação e dados da candidatura a ${cfg.nome} por ${nomeUf}, direto da fonte (TSE).`;

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

      {/* Volta para a lista COM o filtro que a pessoa tinha (src/lib/voltarLista.js). Até 22/09
          este link tinha endereço fixo e zerava a busca. */}
      <BotaoVoltar href={voltarPara} />

      <div style={{ display: 'flex', gap: '18px', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap' }}>
        <Avatar nome={c.nome_urna} foto={c.foto_url} size={88} />
        <div style={{ minWidth: 0 }}>
          <p style={{ margin: '0 0 4px', fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: t.cor.ouroTexto }}>
            Candidato(a) a {cfg.nome} · {c.uf} · 2026
          </p>
          <h1 style={{ fontFamily: t.fonte.titulo, fontWeight: 600, fontSize: 'clamp(1.5rem,3.4vw,2.1rem)', margin: '0 0 4px' }}>{c.nome_urna}</h1>
          <p style={{ margin: 0, color: t.cor.cinza, fontSize: '0.95rem' }}>{c.partido_sigla}{c.nr_candidato ? ` · nº ${c.nr_candidato}` : ''}{c.coligacao_nome ? ` · ${c.coligacao_nome}` : ''}</p>
        </div>
        {/* Coração (26/09/2026). A chave é o endereço desta ficha, tirado do canonical. */}
        <BotaoFavorito tipo="candidato" chave={caminhoDe(canonical)} rotulo={c.nome_urna} noCartao={false}
          detalhe={[`Candidato(a) a ${cfg.nome}`, c.partido_sigla, c.uf].filter(Boolean).join(' · ')} foto={c.foto_url} />
      </div>

      {/* Faixa de identidade: já tem mandato? mudou de partido para esta eleição? */}
      {m && (
        <div style={{ background: t.cor.papelQuente2, borderRadius: t.raio.sm, padding: '14px 18px', marginBottom: '22px', fontSize: '0.92rem', color: t.cor.tinta, lineHeight: 1.55 }}>
          {!exercendo ? (
            <strong>Já exerceu mandato de {cargoMandato} por {nomeUf} e concorre a {cfg.nome} em 2026.</strong>
          ) : mesmoCargo ? (
            <strong>Já é {cfg.nome} por {nomeUf} e concorre à reeleição.</strong>
          ) : (
            <strong>Hoje é {cargoMandato} por {nomeUf} e concorre a {cfg.nome} em 2026.</strong>
          )}
          {trocouPartido && (
            <> Concorre pelo <strong>{c.partido_sigla}</strong>, mas exerce o mandato atual pelo <strong>{m.partido_mandato}</strong>.</>
          )}
          {' '}{exercendo ? 'Abaixo está o que fez com o mandato que tem hoje.' : 'Abaixo estão os números desse mandato.'}
        </div>
      )}

      {/* A chapa vem junto do nome: quem assume a vaga é informação sobre o candidato. */}
      {cargo === 'senador' && <Suplentes suplentes={c.suplentes} />}
      {cargo === 'governador' && <Vice vice={c.vice} titular={{ apto: c.apto_tse, situacao: c.situacao_tse }} />}

      {/* Os quatro números. Só aparecem para quem tem mandato: não há o que prestar de contas
          sobre um mandato que não existe. */}
      {m && (
        <section style={{ marginBottom: '26px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(230px, 100%), 1fr))', gap: '14px' }}>
            {m.gasto && (
              <Numero
                valor={brl(m.gasto.total)}
                rotulo={`Gastou de cota parlamentar em ${m.gasto.ano}`}
                contexto={teto
                  ? `Média de ${brl(m.gasto.media_mensal)} por mês, num teto de ${brl(teto.teto)} para ${c.uf}. Equivale a ${teto.pct}% do limite.`
                  : `Em ${m.gasto.n_notas} notas fiscais.`}
                fonte={fonteMandato}
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
              fonte={fonteMandato}
            />
            {m.presenca && (
              <Numero
                valor={`${Math.round(m.presenca.percentual)}%`}
                rotulo="Presença nas votações"
                contexto={`Registrou voto em ${m.presenca.compareceu} das ${m.presenca.total} votações nominais do período. Ausência justificada também conta como não registrada.`}
                fonte={fonteMandato}
              />
            )}
            {m.n_proposicoes != null && (
              <Numero
                valor={m.n_proposicoes >= 500 ? '500+' : m.n_proposicoes}
                rotulo="Proposições que apresentou"
                contexto="Inclui coautorias. Propor não é aprovar: a proposta pode nunca ter ido a voto."
                fonte={fonteMandato}
              />
            )}
          </div>

          <div style={{ marginTop: '14px', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <Link href={hrefPerfil(m)} style={{ background: t.cor.verde, color: t.cor.ouro, padding: '11px 22px', borderRadius: t.raio.pill, textDecoration: 'none', fontWeight: 700, fontSize: '0.92rem', boxShadow: t.sombra.botao }}>
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
          {cfg.semMandato ? cfg.semMandato : (
            <>
              <strong>Não exerce mandato no Congresso hoje.</strong> Por isso não há gastos de cota,
              votações nem presença a mostrar aqui. Quem já está no cargo tem esse histórico na
              {' '}<Link href={cfg.listaParlamentares.href} style={{ color: t.cor.ouroTexto, fontWeight: 700 }}>{cfg.listaParlamentares.rotulo}</Link>.
            </>
          )}
        </div>
      )}

      <section style={{ background: t.cor.papelCartao, borderRadius: t.raio.md, padding: 'clamp(18px,3vw,26px)', boxShadow: t.sombra.sutil, marginBottom: '20px' }}>
        <h2 style={{ fontSize: '1rem', margin: '0 0 16px' }}>Quem é</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(200px, 100%), 1fr))', gap: '18px 24px' }}>
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

      {/* Situação da candidatura. Ate 20/09 esta pagina afirmava que a Justiça Eleitoral "ainda
          não publicou o deferimento": deixou de ser verdade quando a ficha do TSE passou a ser
          coletada para os 7.703, e afirmação desatualizada num site de transparência é pior que
          ausência. Com ficha coletada mostramos a seção completa (a mesma do presidenciável);
          sem ela, a ressalva honesta continua, agora dizendo o motivo certo. */}
      {c.ficha_coletada_em ? (
        <SituacaoCandidatura ficha={c} />
      ) : (
        <section style={{ background: t.cor.papelQuente, borderRadius: t.raio.sm, padding: '14px 18px', marginBottom: '20px', fontSize: '0.85rem', color: t.cor.tinta, lineHeight: 1.5 }}>
          {c.situacao_candidatura ? (
            <><strong>Situação da candidatura:</strong> {c.situacao_candidatura}{c.situacao_detalhe ? `, ${c.situacao_detalhe}` : ''}</>
          ) : (
            <><strong>Situação da candidatura: ainda não buscamos a ficha deste candidato.</strong> A
            situação publicada pela Justiça Eleitoral entra aqui assim que a coleta passar por esta
            unidade da federação.</>
          )}
        </section>
      )}

      {/* Trajetória antes de patrimônio: quem é a pessoa vem antes de quanto ela tem. */}
      <TrajetoriaEleitoral ficha={c} />

      <PatrimonioDeclarado ficha={c} />

      <section style={{ background: t.cor.papel, border: `1px solid ${t.cor.papelQuente2}`, borderRadius: t.raio.sm, padding: '14px 18px', marginBottom: '20px', fontSize: '0.85rem', color: t.cor.cinza, lineHeight: 1.5 }}>
        {cfg.comPlano || cfg.semPlano}
      </section>

      <DocumentosERedes ficha={c} />

      <p style={{ fontSize: '0.78rem', color: t.cor.cinza, lineHeight: 1.6 }}>
        Fontes: <a href={c.fonte_api || 'https://divulgacandcontas.tse.jus.br/'} target="_blank" rel="noopener noreferrer" style={{ color: t.cor.ouroTexto }}>DivulgaCandContas / TSE</a> para os dados da candidatura
        {m && (casaM === 'senado'
          ? <> e <a href="https://www12.senado.leg.br/dados-abertos" target="_blank" rel="noopener noreferrer" style={{ color: t.cor.ouroTexto }}>Dados Abertos do Senado</a> para o histórico do mandato</>
          : <> e <a href="https://dadosabertos.camara.leg.br/" target="_blank" rel="noopener noreferrer" style={{ color: t.cor.ouroTexto }}>Dados Abertos da Câmara</a> para o histórico do mandato</>)}.
        {' '}Sem juízo de valor, só os dados oficiais.
      </p>
    </div>
  );
}

