import { useState, useMemo } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import ServicoAPI from '../../src/servicos/servico_api';
import { t } from '../../src/estilo/tokens';
import { Seta, Pino } from '../../components/icones';
import Avatar from '../../components/Avatar';
import ReportarErro from '../../components/ReportarErro';
import ChamadaAfinidade from '../../components/ChamadaAfinidade';
import Trilha from '../../components/Trilha';
import CampoSelect from '../../components/CampoSelect';
import CampoBusca from '../../components/CampoBusca';
import EscolhaCompacta from '../../components/EscolhaCompacta';
import DadosEstruturados from '../../components/DadosEstruturados';
import { hrefPerfil, casaDoPerfil } from '../../src/lib/casa';
import SeloAtualizacao from '../../components/SeloAtualizacao';
import { fonteGastosEstadual, fonteVotosDoPerfil } from '../../src/lib/selosFonte';
import { agruparPorCasa, montarLinhas, ordenar, ordensDisponiveis, filtrar, resumoDoGrupo, fraseResumo, reais } from '../../src/lib/bancadaEstado';
import { grafo, organizacao, site, migalhas, pagina as paginaLd } from '../../src/lib/dadosEstruturados';
import { CEAP_FONTE, CEAPS_FONTE, ATO_MESA_DIVULGACAO } from '../../src/lib/cotas';

const NOMES = { AC:'Acre', AL:'Alagoas', AP:'Amapá', AM:'Amazonas', BA:'Bahia', CE:'Ceará', DF:'Distrito Federal', ES:'Espírito Santo', GO:'Goiás', MA:'Maranhão', MT:'Mato Grosso', MS:'Mato Grosso do Sul', MG:'Minas Gerais', PA:'Pará', PB:'Paraíba', PR:'Paraná', PE:'Pernambuco', PI:'Piauí', RJ:'Rio de Janeiro', RN:'Rio Grande do Norte', RS:'Rio Grande do Sul', RO:'Rondônia', RR:'Roraima', SC:'Santa Catarina', SP:'São Paulo', SE:'Sergipe', TO:'Tocantins' };
const OPCOES_UF = Object.entries(NOMES).map(([uf, nome]) => ({ valor: uf, rotulo: `${uf} · ${nome}`, busca: `${uf} ${nome}` }));

// REFEITA EM 18/10/2026 (pedido do Jordy: "UX péssima"). Antes eram três listas de cartões da largura
// inteira, uma embaixo da outra, só com o gasto total e um "1, 2, 3" que parecia pódio. Agora:
//  - trilha + menu "Parlamentares" aceso, para a pessoa saber onde está;
//  - seletor de estado na própria página (canto direito do título, como nos estaduais);
//  - UMA casa por vez, em abas (pílulas no computador, campo no celular, padrão do site);
//  - uma frase que responde à pergunta ("quanto gastam os parlamentares do meu estado");
//  - por parlamentar, três números lado a lado: gasto por mês, uso do teto e votos registrados.
// Sem nota, sem cor de aprovação e sem número de posição (D-003): a barra do teto é de uma cor só.
// A conta mora em src/lib/bancadaEstado.js (tem teste).

const CSS = `
  .est-cab, .est-linha { display: grid; grid-template-columns: var(--cols); align-items: center; column-gap: 16px; }
  .est-cab { padding: 0 16px 8px; font-size: 0.7rem; font-weight: 800; letter-spacing: 0.06em; text-transform: uppercase; color: ${t.cor.cinza}; }
  .est-linha { position: relative; padding: 12px 16px; text-decoration: none; color: inherit; background: ${t.cor.papelCartao}; border-radius: ${t.raio.md}; box-shadow: ${t.sombra.clicavel}; transition: box-shadow .15s, transform .15s; }
  .est-linha:hover { box-shadow: ${t.sombra.hover}; transform: translateY(-1px); }
  .est-linha:focus-visible { outline: none; box-shadow: inset 0 0 0 2.5px ${t.cor.ouro}, ${t.sombra.anelFoco}; }
  .est-stats { display: contents; }
  .est-sr { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }
  .est-rot { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }
  .est-ir { justify-self: end; font-size: 0.78rem; font-weight: 700; color: ${t.cor.ouroTexto}; white-space: nowrap; }
  .est-lista { list-style: none; padding: 0; margin: 0; display: grid; gap: 10px; }
  @media (max-width: 559px) { .est-ctl { flex: 1 1 100% !important; max-width: none !important; } }
  @media (max-width: 959px) {
    .est-cab { display: none; }
    .est-linha { grid-template-columns: minmax(0, 1fr); row-gap: 10px; padding: 12px 14px; }
    .est-quem { padding-right: 22px; }
    .est-stats { display: grid; grid-template-columns: var(--cols-m); gap: 8px; background: ${t.cor.papelQuente}; border-radius: ${t.raio.sm}; padding: 8px 10px; }
    .est-rot { position: static; width: auto; height: auto; overflow: visible; clip: auto; display: block; font-size: 0.66rem; font-weight: 800; letter-spacing: 0.05em; text-transform: uppercase; color: ${t.cor.cinza}; margin-bottom: 2px; white-space: normal; }
    .est-ir { position: absolute; top: 16px; right: 12px; }
    .est-ir-txt { display: none; }
  }
`;

const pilula = (ativa) => ({
  padding: '10px 20px', fontSize: '0.9rem', fontWeight: 700, fontFamily: t.fonte.corpo,
  borderRadius: t.raio.pill, cursor: 'pointer', border: 'none', whiteSpace: 'nowrap',
  background: ativa ? t.cor.verde : '#fff', color: ativa ? t.cor.ouro : t.cor.tinta,
  boxShadow: t.sombra.botao, transition: 'box-shadow .15s, transform .15s',
});
const realce = (e, ligar) => {
  e.currentTarget.style.boxShadow = ligar ? t.sombra.botaoHover : t.sombra.botao;
  e.currentTarget.style.transform = ligar ? 'translateY(-1px)' : 'none';
};

function Barra({ pct }) {
  return (
    <span aria-hidden="true" style={{ display: 'block', height: '8px', borderRadius: t.raio.pill, background: t.cor.papelQuente2, overflow: 'hidden', marginTop: '5px' }}>
      <span style={{ display: 'block', height: '100%', width: `${Math.min(pct, 100)}%`, background: t.cor.verde, borderRadius: t.raio.pill }} />
    </span>
  );
}

function Linha({ l, cols }) {
  const { d, media, pct, votos, situacao } = l;
  const casa = casaDoPerfil(d);
  // A assembleia do RS publica só o agregado mensal por categoria: não existe nota fiscal nem
  // fornecedor. Falar em "notas" ali descreveria um dado que não existe.
  const detalhe = casa.temNotaFiscal ? `em ${d.n_notas} notas` : `em ${d.meses_com_gasto ?? d.n_notas} meses com gasto`;
  const semDado = <span style={{ color: t.cor.cinza, fontSize: '0.82rem' }}>sem dado</span>;
  return (
    <li>
      <Link href={hrefPerfil(d)} className="est-linha" style={{ '--cols': cols.grade }}>
        <span className="est-quem" style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
          <Avatar nome={d.nome_urna} foto={d.foto_url} size={44} />
          <span style={{ minWidth: 0 }}>
            <span style={{ display: 'block', fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{d.nome_urna}</span>
            <span style={{ display: 'block', fontSize: '0.8rem', color: t.cor.cinza, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {d.partido_atual} · {detalhe}{situacao ? ` · ${situacao}` : ''}
            </span>
          </span>
        </span>
        <span className="est-stats" style={{ '--cols-m': cols.mobile }}>
          <span>
            <span className="est-rot">Gasto por mês</span>
            {media == null ? semDado : (
              <>
                <span style={{ display: 'block', fontWeight: 800 }}>{reais(media)}</span>
                <span style={{ display: 'block', fontSize: '0.72rem', color: t.cor.cinza, whiteSpace: 'nowrap' }}>
                  {d.meses_base != null ? `${reais(d.total_base)} em ${d.meses_base} ${d.meses_base === 1 ? 'mês' : 'meses'}` : `${reais(d.total)} no ano`}
                </span>
              </>
            )}
          </span>
          {cols.teto && (
            <span>
              <span className="est-rot">Uso do teto</span>
              {pct == null ? semDado : (
                <>
                  <span style={{ display: 'block', fontWeight: 800 }}>{pct}% <span style={{ fontWeight: 500, fontSize: '0.74rem', color: t.cor.cinza }}>do teto</span></span>
                  <Barra pct={pct} />
                </>
              )}
            </span>
          )}
          {cols.votos && (
            <span>
              <span className="est-rot">Votos<span className="est-sr"> registrados</span></span>
              {votos == null ? semDado : (
                <>
                  <span style={{ display: 'block', fontWeight: 800 }}>{votos.compareceu} <span style={{ fontWeight: 500, fontSize: '0.82rem', color: t.cor.cinza }}>de {votos.total}</span></span>
                  <span style={{ display: 'block', fontSize: '0.74rem', color: t.cor.cinza }}>votações</span>
                </>
              )}
            </span>
          )}
        </span>
        <span className="est-ir"><span className="est-ir-txt">ver perfil</span><Seta direcao="direita" size={13} emTexto /></span>
      </Link>
    </li>
  );
}

// Como ler a tabela: ressalva sobre a LISTA, então vira faixa de largura inteira colada no topo dela,
// com superfície própria (Diretrizes de Design). Três frases curtas ficam à vista (a regra da comparação,
// o que o gasto não mede e o que o voto não conta); as definições e as fontes dos tetos ficam um toque
// abaixo, porque quem já sabe não precisa relê-las a cada visita.
function ComoLer({ grupo, nome, temTeto, temVotos, totalVotos, ehRS }) {
  const [aberto, setAberto] = useState(false);
  const visiveis = [];
  if (grupo.chave === 'federal') visiveis.push(`Todos os deputados federais de ${nome} têm o mesmo teto mensal da cota: compare só dentro desta aba, nunca com senadores ou estaduais.`);
  if (grupo.chave === 'senado') visiveis.push('São poucos senadores por estado, então os valores aparecem lado a lado, sem posição. O teto do Senado é diferente do da Câmara.');
  if (grupo.chave === 'estadual') visiveis.push('Cada Assembleia tem a sua verba e publica no seu ritmo: não compare com outro estado nem com os federais.');
  visiveis.push('Gasto alto ou baixo, sozinho, não mede o trabalho de ninguém.');
  if (temVotos) visiveis.push('Votos registrados não contam ausência justificada (licença, missão), e quem assumiu depois teve menos votações para participar.');
  if (temVotos && grupo.chave === 'estadual' && ehRS) visiveis.push('A Assembleia do RS só publica votos Sim e Não: quem se absteve ou faltou aparece igual, sem voto.');
  if (grupo.chave === 'estadual' && (!temTeto || !temVotos)) {
    const faltam = [!temTeto && 'o teto desta verba', !temVotos && 'a presença nas votações desta Assembleia'].filter(Boolean).join(' nem ');
    visiveis.push(`O Lume ainda não tem ${faltam}, por isso ${!temTeto && !temVotos ? 'essas colunas não aparecem' : 'essa coluna não aparece'}.`);
  }
  const fonteTeto = grupo.chave === 'federal' ? CEAP_FONTE : grupo.chave === 'senado' ? CEAPS_FONTE : null;
  const link = { color: t.cor.ouroTexto, fontWeight: 600 };
  const p = (i) => ({ margin: i ? '6px 0 0' : 0, fontSize: '0.84rem', lineHeight: 1.5, color: t.cor.tinta });
  return (
    <div style={{ background: t.cor.papelQuente, borderRadius: t.raio.md, padding: '12px 16px', margin: '0 0 18px' }}>
      {visiveis.map((x, i) => <p key={i} style={p(i)}>{x}</p>)}
      <button type="button" aria-expanded={aberto} onClick={() => setAberto((a) => !a)}
        style={{ margin: '8px 0 0', padding: '4px 0', minHeight: '24px', border: 'none', background: 'transparent', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px', fontFamily: t.fonte.corpo, fontSize: '0.84rem', fontWeight: 700, color: t.cor.ouroTexto }}>
        Como lemos os números <Seta aberta={aberto} size={14} />
      </button>
      {aberto && (
        <div style={{ marginTop: '4px' }}>
          <p style={p(0)}><strong>Gasto por mês:</strong> {grupo.chave === 'estadual'
            ? 'total do ano dividido pelos meses com gasto no ano. É a mesma conta do perfil.'
            : 'gasto dos meses em que a pessoa esteve em exercício (15 dias ou mais), dividido por esses meses. Só entram meses já fechados, 30 dias depois do fim do mês, quando quase todas as notas já foram emitidas. Mês em exercício sem gasto entra na conta. É a mesma conta do perfil.'}</p>
          {grupo.chave === 'federal' && <p style={p(1)}><strong>Divulgação da atividade parlamentar:</strong> no perfil de cada deputado essa categoria aparece em linha separada, já incluída na média. Nos 120 dias antes da eleição (a partir de 6 de junho de 2026), o <a href={ATO_MESA_DIVULGACAO} target="_blank" rel="noopener noreferrer" style={link}>Ato da Mesa nº 108/2013, art. 11</a> veda a impressão e a distribuição de produtos gráficos de divulgação por deputado candidato, salvo se ele não for candidato. Por isso o gasto dessa categoria pode variar entre quem concorre e quem não concorre.</p>}
          {temTeto && <p style={p(1)}><strong>Uso do teto:</strong> gasto por mês dividido pelo teto mensal da {grupo.chave === 'senado' ? 'cota do Senado' : 'cota da Câmara'} para o estado{fonteTeto && <> (<a href={fonteTeto} target="_blank" rel="noopener noreferrer" style={link}>tabela oficial</a>)</>}. Acima de 100% quer dizer que a média ficou acima do valor dessa tabela; confira na fonte.</p>}
          {temVotos && <p style={p(1)}><strong>Votos registrados:</strong> votações nominais em que a pessoa votou Sim, Não, Abstenção ou Obstrução, entre as {totalVotos} que o Lume tem desta casa.</p>}
          {ehRS && grupo.chave === 'estadual' && <p style={p(1)}>A Assembleia do RS publica só o total mensal por categoria, sem as notas.</p>}
        </div>
      )}
    </div>
  );
}

function Estado({ uf, nome, deputados, presenca, inicial, canonical }) {
  const router = useRouter();
  const titulo = `Parlamentares de ${nome} (${uf}): gastos e votos | Lume`;
  const desc = `Deputados federais, senadores e deputados estaduais de ${nome}: quanto cada um usou da verba pública em 2026 e como votaram. Em linguagem clara, com a fonte oficial de cada casa.`;

  const grupos = useMemo(() => agruparPorCasa(deputados).map((g) => ({ ...g, linhas: montarLinhas(g, uf, presenca) })), [deputados, uf, presenca]);
  const [chave, setChave] = useState(grupos.some((g) => g.chave === inicial) ? inicial : grupos[0]?.chave);
  const [busca, setBusca] = useState('');
  const [ordem, setOrdem] = useState('gasto-maior');

  const grupo = grupos.find((g) => g.chave === chave) || grupos[0];
  const temTeto = !!grupo && grupo.linhas.some((l) => l.pct != null);
  const temVotos = !!grupo && grupo.linhas.some((l) => l.votos != null);
  const totalVotos = temVotos ? grupo.linhas.find((l) => l.votos).votos.total : 0;
  const ordens = grupo ? ordensDisponiveis(grupo.linhas) : [];
  const ordemAtual = ordens.some((o) => o.valor === ordem) ? ordem : (ordens[0] ? ordens[0].valor : 'nome');
  const visiveis = useMemo(() => (grupo ? ordenar(filtrar(grupo.linhas, busca), ordemAtual) : []), [grupo, busca, ordemAtual]);
  const resumo = grupo ? resumoDoGrupo(grupo.linhas, grupo.chave, uf) : null;
  const frase = grupo ? fraseResumo(grupo, resumo) : null;

  // Colunas da tabela. Computador: nome, gasto, (teto), (votos) e "ver perfil" na ponta; os números ficam
  // perto do nome (proximidade) e só o convite a clicar vai para o fim. Celular: os números viram uma
  // faixa de 1 a 3 colunas dentro do cartão, com a do gasto um pouco mais larga (tem a segunda linha "no ano").
  const nStats = 1 + (temTeto ? 1 : 0) + (temVotos ? 1 : 0);
  const cols = {
    teto: temTeto, votos: temVotos,
    mobile: nStats === 3 ? '1.3fr 1fr 1fr' : nStats === 2 ? '1.2fr 1fr' : '1fr',
    grade: ['minmax(200px, 340px)', '150px', temTeto ? '170px' : null, temVotos ? '150px' : null, 'minmax(84px, 1fr)'].filter(Boolean).join(' '),
  };

  const trocarCasa = (c) => {
    setChave(c); setBusca(''); setOrdem('gasto-maior');
    router.replace(`/estado/${uf}?casa=${c}`, undefined, { shallow: true, scroll: false });
  };
  const rotuloAba = (g) => `${g.titulo} (${g.lista.length})`;
  const selosGastos = grupo && (grupo.chave === 'federal' ? { fonte: 'gastos_camara', nome: 'Gastos da Câmara' }
    : grupo.chave === 'senado' ? { fonte: 'gastos_senado', nome: 'Gastos do Senado' }
    : fonteGastosEstadual(uf) ? { ...fonteGastosEstadual(uf), nome: `Gastos da Assembleia (${uf})` } : null);
  const selosVotos = grupo && temVotos ? fonteVotosDoPerfil(grupo.lista[0]) : null;

  const ld = grafo(
    organizacao(), site(),
    migalhas([{ nome: 'Início', caminho: '/' }, { nome: 'Parlamentares', caminho: '/deputados' }, { nome, caminho: `/estado/${uf}` }]),
    paginaLd({ nome: titulo, descricao: desc, caminho: `/estado/${uf}`, tipo: 'CollectionPage' }),
  );

  return (
    <>
      <Head>
        <title>{titulo}</title>
        <meta name="description" content={desc} />
        <link rel="canonical" href={canonical} />
        <meta property="og:title" content={titulo} />
        <meta property="og:description" content={desc} />
      </Head>
      <DadosEstruturados dados={ld} id="ld-estado" />
      <style jsx global>{CSS}</style>
      <div className="pagina">
        <Trilha itens={[{ nome: 'Início', href: '/' }, { nome: 'Parlamentares', href: '/deputados' }, { nome }]} />

        {/* Título à esquerda e o campo de estado ao lado dele, no canto direito (mesmo arranjo dos
            deputados estaduais). Controle e título são do mesmo assunto: ficam na mesma linha. */}
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', justifyContent: 'space-between', gap: '14px 24px', marginBottom: '10px' }}>
          <div style={{ minWidth: 0 }}>
            <h1 style={{ fontFamily: t.fonte.titulo, fontWeight: 600, fontSize: 'clamp(1.9rem,5vw,2.8rem)', margin: 0, lineHeight: 1.1 }}>
              Parlamentares de {nome}
            </h1>
          </div>
          <div style={{ flex: '0 1 280px', minWidth: '200px', width: '100%', maxWidth: '280px' }}>
            <CampoSelect opcoes={OPCOES_UF} valor={uf} placeholder="Trocar de estado" aoLabel="Trocar de estado" icone={<Pino />}
              aoSelecionar={(u) => { if (u !== uf) router.push(`/estado/${u}`); }} />
          </div>
        </div>
        <p style={{ color: t.cor.cinza, margin: '0 0 20px', maxWidth: '70ch', lineHeight: 1.5 }}>
          Quanto cada um usou da verba pública em 2026 e quantas votações registrou. Toque em um nome para ver o perfil e a fonte de cada número.
        </p>

        {grupos.length > 1 && (
          <>
            <div className="so-celular" style={{ marginBottom: '16px' }}>
              <EscolhaCompacta rotulo="Casa" valor={grupo.chave} aoEscolher={trocarCasa}
                opcoes={grupos.map((g) => ({ valor: g.chave, rotulo: rotuloAba(g) }))} />
            </div>
            <div role="tablist" aria-label="Casa" className="so-computador" style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '20px' }}>
              {grupos.map((g) => (
                <button key={g.chave} type="button" role="tab" aria-selected={g.chave === grupo.chave} onClick={() => trocarCasa(g.chave)}
                  style={pilula(g.chave === grupo.chave)} onMouseOver={(e) => realce(e, true)} onMouseOut={(e) => realce(e, false)}>
                  {rotuloAba(g)}
                </button>
              ))}
            </div>
          </>
        )}

        {grupo && (
          <section aria-label={grupo.titulo}>
            {frase && (
              <p style={{ fontFamily: t.fonte.titulo, fontWeight: 500, fontSize: 'clamp(1.1rem,2.6vw,1.35rem)', lineHeight: 1.4, margin: '0 0 10px', maxWidth: '62ch' }}>{frase}</p>
            )}
            <div style={{ margin: '0 0 16px' }}>
              {selosGastos && <SeloAtualizacao {...selosGastos} semLink={!!selosVotos} style={{ margin: '0 0 2px' }} />}
              {selosVotos && <SeloAtualizacao {...selosVotos} nome={`Votos (${grupo.chave === 'senado' ? 'Senado' : grupo.chave === 'federal' ? 'Câmara' : `Assembleia ${uf}`})`} style={{ margin: 0 }} />}
            </div>

            <ComoLer grupo={grupo} nome={nome} temTeto={temTeto} temVotos={temVotos} totalVotos={totalVotos} ehRS={uf === 'RS'} />

            {(temVotos || uf === 'RS') && <ChamadaAfinidade uf={uf} alvo={`de quem representa ${nome}`} style={{ margin: '0 0 16px' }} />}

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px 14px', marginBottom: '10px' }}>
              <div className="est-ctl" style={{ flex: '1 1 260px', maxWidth: '460px', minWidth: 0 }}>
                <CampoBusca valor={busca} aoMudar={setBusca} placeholder="Buscar por nome ou partido…" aoLabel={`Buscar entre ${grupo.plural}`} />
              </div>
              <div className="est-ctl" style={{ flex: '0 1 320px', minWidth: '240px' }}>
                <EscolhaCompacta rotulo="Ordenar" prefixo="Ordenar por" valor={ordemAtual} aoEscolher={setOrdem}
                  opcoes={ordens.map((o) => ({ valor: o.valor, rotulo: o.rotulo }))} />
              </div>
            </div>
            <p aria-live="polite" style={{ color: t.cor.cinza, fontSize: '0.84rem', margin: '0 0 12px' }}>
              {busca.trim()
                ? `${visiveis.length} ${visiveis.length === 1 ? 'encontrado' : 'encontrados'} de ${grupo.lista.length}.`
                : `${grupo.lista.length} ${grupo.lista.length === 1 ? grupo.singular : grupo.plural}, ordenados por ${ordens.find((o) => o.valor === ordemAtual)?.rotulo.toLowerCase()}.`}
            </p>

            <div className="est-cab" aria-hidden="true" style={{ '--cols': cols.grade }}>
              <span>Parlamentar</span>
              <span>Gasto por mês</span>
              {temTeto && <span>Uso do teto</span>}
              {temVotos && <span>Votos registrados</span>}
              <span />
            </div>
            <ul className="est-lista">
              {visiveis.map((l) => <Linha key={l.d.id} l={l} cols={cols} />)}
            </ul>
            {visiveis.length === 0 && <p style={{ color: t.cor.cinza }}>Ninguém encontrado para “{busca}”.</p>}
          </section>
        )}

        {grupos.length === 0 && <p style={{ color: t.cor.cinza }}>Ainda não há dados de gastos para {nome}.</p>}

        <p style={{ marginTop: '32px' }}>
          <Link href="/deputados" style={{ color: t.cor.verde, fontWeight: 700, textDecoration: 'none' }}><Seta direcao="esquerda" size={14} emTexto />ver parlamentares de todos os estados</Link>
        </p>
        <p style={{ marginTop: '12px' }}>
          <ReportarErro assunto={`Página do estado ${nome}`} />
        </p>
      </div>
    </>
  );
}

// key={uf}: ao trocar de estado pelo seletor a página é a mesma e o React guardaria a aba, a busca e a ordem do estado anterior.
export default function PaginaEstado(props) { return <Estado key={props.uf} {...props} />; }

export async function getServerSideProps({ params, query, req }) {
  const uf = String(params.uf || '').toUpperCase();
  const nome = NOMES[uf];
  if (!nome) return { notFound: true };
  const deputados = await ServicoAPI.getRadarPorEstado(uf, 2026);
  // Presença de todos de uma vez, por casa (uma leitura de votos por casa, não uma por pessoa).
  const grupos = agruparPorCasa(deputados).map((g) => ({ chave: g.chave, ids: g.lista.map((d) => d.id) }));
  const presenca = await ServicoAPI.getPresencaDoEstado(grupos);
  const proto = req.headers['x-forwarded-proto'] || 'http';
  const canonical = `${proto}://${req.headers.host}/estado/${uf}`;
  const inicial = ['federal', 'senado', 'estadual'].includes(query.casa) ? query.casa : null;
  return { props: { uf, nome, deputados: JSON.parse(JSON.stringify(deputados)), presenca: JSON.parse(JSON.stringify(presenca)), inicial, canonical } };
}
