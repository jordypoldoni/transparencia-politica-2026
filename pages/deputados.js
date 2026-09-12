import { useState, useMemo, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import ServicoAPI from '../src/servicos/servico_api';
import Avatar from '../components/Avatar';
import CampoSelect from '../components/CampoSelect';
import CampoBusca from '../components/CampoBusca';
import { NOMES_UF } from '../src/lib/cotas';
import { t } from '../src/estilo/tokens';
import { hrefPerfil } from '../src/lib/casa';

const brl = (v) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(v || 0);

// Uma aba por assembleia. Cada casa publica uma coisa diferente, e a página diz isso na cara do
// usuário em vez de deixar parecer que falta dado por descuido: SP abre gasto de gabinete e NÃO
// divulga voto nominal; o RS abre o voto e não expõe o gasto por deputado no mesmo formato.
// Para entrar com um novo estado, acrescente uma linha aqui (e o mapeamento no servico_api).
// `gastoDetalhado` separa DUAS coisas que parecem uma só: ter o gasto e ter a NOTA.
// SP publica nota a nota, com fornecedor e CNPJ. O RS publica só o total do mês por categoria —
// dá pra dizer quanto e em quê, nunca para quem. A tela precisa falar isso, senão o usuário
// clica esperando a nota e conclui que o site escondeu.
// `nomeCom` carrega a preposição junto com o nome do estado ("de São Paulo", "do Rio Grande
// do Sul"): o artigo varia por estado e montar isso na mão dá "de Rio Grande do Sul".
const ASSEMBLEIAS = [
  { casa: 'Assembleia (SP)', uf: 'SP', sigla: 'ALESP', nomeCom: 'de São Paulo', gastos: true, gastoDetalhado: true, votos: false },
  { casa: 'Assembleia (RS)', uf: 'RS', sigla: 'AL-RS', nomeCom: 'do Rio Grande do Sul', gastos: true, gastoDetalhado: false, votos: true },
];
const assembleiaDe = (casa) => ASSEMBLEIAS.find((a) => a.casa === casa) || null;

// Qual ano o ranking abre por padrão.
// Não é simplesmente o mais recente: quando a fonte para de publicar no meio do caminho, o ano
// corrente fica com um punhado de parlamentares e o ranking vira uma lista de um nome só (foi o
// que aconteceu com a Câmara em 2026, cuja API de despesas está devolvendo vazio desde agosto).
// Regra: se o ano mais recente tem menos de um terço dos parlamentares do ano anterior, ele é
// tratado como incompleto e o padrão cai para o ano anterior. O ano continua escolhível, e a
// tela diz por que o padrão não é ele.
function anoPadrao(anos, totais) {
  if (!anos.length) return null;
  const [maisNovo, anterior] = anos;
  if (anterior && (totais[maisNovo] || 0) * 3 < (totais[anterior] || 0)) return anterior;
  return maisNovo;
}

export default function Parlamentares({ deputados, qInicial, ufInicial, casaInicial, radares = {}, canonical = null }) {
  const [busca, setBusca] = useState(qInicial || '');
  const [uf, setUf] = useState(ufInicial || '');
  const [casa, setCasa] = useState(casaInicial || 'Câmara');
  // Sincroniza ao navegar entre Deputados/Senadores (mesma rota, props mudam no cliente).
  useEffect(() => { setCasa(casaInicial || 'Câmara'); setUf(ufInicial || ''); }, [casaInicial, ufInicial]);
  // "Senadores" é uma página própria; "Deputados" agrupa federais + estaduais.
  const grupo = casa === 'Senado' ? 'senador' : 'deputado';
  const assembleia = assembleiaDe(casa); // null quando a aba é federal ou Senado
  // Ranking de gastos da casa ativa (troca junto com as abas e com a rota Senadores).
  const radarCasa = radares[casa] || { anos: [], porAno: {}, porAnoMenores: {}, totais: {} };
  const [ano, setAno] = useState(null);
  // 'maiores' | 'menores'. Mostrar so quem mais gastou sugere que gastar mais e a historia;
  // as duas pontas dao ao leitor a referencia para julgar sozinho, que e a regra do site.
  const [sentido, setSentido] = useState('maiores');
  // Ao trocar de aba, volta para o ano padrão daquela casa: cada fonte publica até um ponto
  // diferente, então fixar o ano entre abas mostraria ranking vazio sem motivo aparente.
  useEffect(() => { setAno(anoPadrao(radarCasa.anos, radarCasa.totais)); }, [casa]); // eslint-disable-line react-hooks/exhaustive-deps
  const anoAtivo = ano ?? anoPadrao(radarCasa.anos, radarCasa.totais);
  const radar = anoAtivo
    ? (sentido === 'menores' ? (radarCasa.porAnoMenores?.[anoAtivo] || []) : (radarCasa.porAno[anoAtivo] || []))
    : [];
  const anoMaisNovo = radarCasa.anos[0] ?? null;
  // O ano corrente ficou de fora do padrão por estar incompleto? A tela explica, em vez de
  // deixar o leitor achar que o site está desatualizado.
  const anoIncompleto = anoMaisNovo && anoAtivo !== anoMaisNovo ? anoMaisNovo : null;

  // ---- Expansao do ranking, de 10 em 10 -------------------------------------------------
  // Os 10 primeiros vem no payload da pagina; o resto e buscado em /api/radar quando o
  // leitor pede. Medido em 12/09/2026: embutir 50 por casa/ano/ponta levaria esta pagina de
  // 248 kB para ~502 kB para todo mundo, inclusive quem nunca clica no botao.
  // ATENCAO A ORDEM DAS DECLARACOES: tudo aqui depende de `radar`, `anoAtivo`, `sentido` e
  // `casa`, que sao definidos acima. Usar antes e TDZ, e TDZ so quebra no build de producao
  // (mesma armadilha ja documentada neste arquivo para `dadosAno`/`secoes`).
  const PASSO = 10;
  const [extras, setExtras] = useState([]);
  const [carregandoMais, setCarregandoMais] = useState(false);
  const [erroMais, setErroMais] = useState(false);
  // Trocar de casa, de ano ou de ponta abre outro ranking: o que ja foi expandido nao vale.
  useEffect(() => { setExtras([]); setErroMais(false); }, [casa, anoAtivo, sentido]);

  const linhas = useMemo(() => {
    // Empate no valor pode fazer a mesma pessoa vir nas duas consultas (a do payload e a da
    // rota). Deduplicar por id e mais barato que tentar garantir ordenacao identica nas duas.
    const vistos = new Set();
    return [...radar, ...extras].filter((l) => {
      if (vistos.has(l.id)) return false;
      vistos.add(l.id);
      return true;
    });
  }, [radar, extras]);

  const totalDaCasa = radarCasa.totais[anoAtivo] || 0;
  const faltam = Math.max(0, totalDaCasa - linhas.length);

  const verMais = async () => {
    setCarregandoMais(true);
    setErroMais(false);
    try {
      // O offset conta o que ja foi BUSCADO, nao o que esta visivel. Se um empate fez a rota
      // devolver uma linha repetida, `linhas` tem menos itens que o buscado, e usar o tamanho
      // dela como offset puliria uma pessoa do ranking.
      const buscados = radar.length + extras.length;
      const q = new URLSearchParams({ casa, ano: String(anoAtivo), sentido, offset: String(buscados), limite: String(PASSO) });
      const r = await fetch(`/api/radar?${q.toString()}`);
      if (!r.ok) throw new Error(`resposta ${r.status}`);
      const dados = await r.json();
      setExtras((atuais) => [...atuais, ...(dados.linhas || [])]);
    } catch (e) {
      console.error('ver mais do ranking:', e.message);
      setErroMais(true);
    } finally {
      setCarregandoMais(false);
    }
  };

  // Assembleia sem gasto coletado não mostra ranking: sairia um bloco vazio parecendo erro.
  // O aviso da aba explica o que existe e o que não existe ali.
  const mostraRanking = (!assembleia || assembleia.gastos) && radarCasa.anos.length > 0;

  const ufs = useMemo(
    () => Array.from(new Set(deputados.filter((d) => d.casa === casa).map((d) => d.uf).filter(Boolean))).sort(),
    [deputados, casa]
  );

  const filtrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return deputados.filter((d) => {
      const okCasa = d.casa === casa;
      const okNome = !termo || d.nome.toLowerCase().includes(termo) || d.partido.toLowerCase().includes(termo);
      const okUf = !uf || d.uf === uf;
      return okCasa && okNome && okUf;
    });
  }, [deputados, busca, uf, casa]);

  const totalCasa = (c) => deputados.filter((d) => d.casa === c).length;

  const pilulaCasa = (ativa) => ({
    padding: '11px 22px', fontSize: '0.95rem', fontWeight: 700, fontFamily: t.fonte.corpo,
    borderRadius: t.raio.pill, cursor: 'pointer', border: 'none',
    background: ativa ? t.cor.verde : '#fff', color: ativa ? t.cor.ouro : t.cor.tinta,
    boxShadow: t.sombra.clicavel,
  });

  // Estas duas telas nao tinham <title> nem descricao nenhuma ate 12/09/2026: o Google
  // indexava a lista principal do site sem titulo.
  const tituloPagina = casa === 'Senado' ? 'Senadores: quanto cada um gastou e como votou | Lume'
    : assembleia ? `Deputados estaduais ${assembleia.nomeCom}: gastos e votos | Lume`
    : 'Deputados federais: quanto cada um gastou e como votou | Lume';
  const descPagina = casa === 'Senado'
    ? 'Os 81 senadores e os suplentes em exercicio: quanto cada um usou da cota do Senado, como votou e a fidelidade ao partido. Fonte oficial do Senado Federal.'
    : assembleia ? `Os deputados estaduais ${assembleia.nomeCom}: quanto cada um usou da verba de gabinete e o que a assembleia publica sobre o mandato. Fonte: ${assembleia.sigla}.`
    : 'Os 513 deputados federais: quanto cada um usou da cota parlamentar, como votou e a fidelidade ao partido. Fonte oficial da Camara dos Deputados.';

  return (
    <div className="pagina">
      <Head>
        <title>{tituloPagina}</title>
        <meta name="description" content={descPagina} />
        {canonical && <link rel="canonical" href={canonical} />}
        <meta property="og:title" content={tituloPagina} />
        <meta property="og:description" content={descPagina} />
      </Head>
      <h1 style={{ fontFamily: t.fonte.titulo, fontWeight: 600, fontSize: 'clamp(1.8rem,4vw,2.6rem)', margin: '0 0 16px' }}>
        {casa === 'Senado'
          ? 'Senadores'
          : assembleia
          ? `Deputados Estaduais ${assembleia.nomeCom}`
          : 'Deputados Federais'}
      </h1>

      {/* Alternância só entre deputados (federais x estaduais). Senadores é página própria. */}
      {grupo === 'deputado' && (
        <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', flexWrap: 'wrap' }} role="tablist" aria-label="Tipo de deputado">
          <button onClick={() => { setCasa('Câmara'); setUf(''); }} style={pilulaCasa(casa === 'Câmara')} role="tab" aria-selected={casa === 'Câmara'}>
            Federais ({totalCasa('Câmara')})
          </button>
          {ASSEMBLEIAS.filter((a) => totalCasa(a.casa) > 0).map((a) => (
            <button key={a.casa} onClick={() => { setCasa(a.casa); setUf(''); }} style={pilulaCasa(casa === a.casa)} role="tab" aria-selected={casa === a.casa}>
              Estaduais · {a.uf} ({totalCasa(a.casa)})
            </button>
          ))}
        </div>
      )}

      <p style={{ color: t.cor.cinza, margin: '0 0 24px' }}>
        {filtrados.length}{' '}
        {casa === 'Senado'
          ? 'senadores'
          : assembleia
          ? `deputados estaduais de ${assembleia.uf}`
          : 'deputados federais'}
        . Clique para ver {assembleia
          ? (assembleia.votos ? 'como cada um votou' : 'os gastos de gabinete')
          : 'gastos, votos e coerência'}.
      </p>

      {assembleia && (
        <div style={{ background: t.cor.alertaBg, borderRadius: t.raio.sm, padding: '12px 16px', margin: '0 0 20px', fontSize: '0.88rem', color: t.cor.tinta, lineHeight: 1.5 }}>
          <strong>{NOMES_UF[assembleia.uf] || assembleia.uf} ({assembleia.sigla}).</strong>{' '}
          {/* o nome do estado aqui abre a frase, então vai sem preposição */}
          {assembleia.votos
            ? 'A assembleia publica o voto de cada deputado, matéria por matéria, e é isso que mostramos aqui. '
            : 'A assembleia não divulga votação nominal, então não há como mostrar como cada deputado votou. '}
          {!assembleia.gastos
            ? 'Os gastos de gabinete ainda não entraram.'
            : assembleia.gastoDetalhado
            ? 'Os gastos de gabinete estão no ar, nota a nota, com fornecedor e CNPJ.'
            : 'Os gastos de gabinete estão no ar, mas a assembleia publica apenas o total de cada mês por categoria: dá para ver quanto e em quê, não para quem o dinheiro foi.'}
          {' '}Fonte: {assembleia.sigla}.
        </div>
      )}

      {/* Ranking de gastos — quem mais usou a verba (casa ativa) */}
      {mostraRanking && (
      <section style={{ margin: '0 0 28px' }}>
        <div style={{ background: t.cor.verde, borderRadius: t.raio.lg, padding: 'clamp(20px,3.5vw,32px)', color: '#fff' }}>
          <h2 style={{ fontFamily: t.fonte.titulo, fontWeight: 600, fontSize: 'clamp(1.3rem,2.6vw,1.7rem)', margin: '0 0 6px' }}>
            {sentido === 'menores' ? 'Quem menos usou a verba pública' : 'Quem mais usou a verba pública'}
          </h2>
          <p style={{ color: 'rgba(255,255,255,0.82)', maxWidth: '64ch', lineHeight: 1.5, margin: '0 0 18px', fontSize: '0.92rem' }}>
            {(() => {
              const verbo = sentido === 'menores' ? 'menos usaram' : 'mais usaram';
              if (casa === 'Senado') return `Senadores que ${verbo} a cota (CEAPS) em ${anoAtivo}.`;
              if (assembleia) return `Deputados estaduais de ${assembleia.uf} que ${verbo} a verba de gabinete em ${anoAtivo}.`;
              return `Deputados federais que ${verbo} a cota parlamentar em ${anoAtivo}.`;
            })()}{' '}
            {assembleia && !assembleia.gastoDetalhado
              ? 'Toque para ver em quê: o valor é o somado das categorias que a assembleia publica a cada mês, sem detalhe de nota.'
              : <>Toque para ver <em>em quê</em>.</>}{' '}
            Fonte: {casa === 'Senado' ? 'Senado Federal' : assembleia ? assembleia.sigla : 'Câmara dos Deputados'}.
          </p>

          {/* As duas pontas do ranking. Os dados de ambas ja vieram juntos (a consulta baixa
              todas as linhas), entao a troca e instantanea, sem nova requisicao. */}
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', margin: '0 0 14px' }} role="group" aria-label="Sentido do ranking">
            {[{ k: 'maiores', r: 'Quem mais usou' }, { k: 'menores', r: 'Quem menos usou' }].map(({ k, r }) => {
              const ativo = sentido === k;
              return (
                <button
                  key={k}
                  onClick={() => setSentido(k)}
                  aria-pressed={ativo}
                  style={{
                    padding: '7px 16px', fontSize: '0.86rem', fontWeight: 700, fontFamily: t.fonte.corpo,
                    borderRadius: t.raio.pill, cursor: 'pointer',
                    border: ativo ? 'none' : '1px solid rgba(255,255,255,0.35)',
                    background: ativo ? t.cor.ouro : 'transparent',
                    color: ativo ? t.cor.verde : 'rgba(255,255,255,0.9)',
                  }}
                >
                  {r}
                </button>
              );
            })}
          </div>

          {/* Seletor de ano. Os dados de todos os anos já vieram juntos, então a troca é
              instantânea, sem nova requisição. */}
          {radarCasa.anos.length > 1 && (
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', margin: '0 0 16px' }} role="group" aria-label="Ano do ranking">
              {radarCasa.anos.map((a) => {
                const ativo = a === anoAtivo;
                return (
                  <button
                    key={a}
                    onClick={() => setAno(a)}
                    aria-pressed={ativo}
                    style={{
                      padding: '7px 16px', fontSize: '0.86rem', fontWeight: 700, fontFamily: t.fonte.corpo,
                      borderRadius: t.raio.pill, cursor: 'pointer',
                      border: ativo ? 'none' : '1px solid rgba(255,255,255,0.35)',
                      background: ativo ? t.cor.ouro : 'transparent',
                      color: ativo ? t.cor.verde : 'rgba(255,255,255,0.9)',
                    }}
                  >
                    {a}
                  </button>
                );
              })}
              <span style={{ alignSelf: 'center', fontSize: '0.8rem', color: 'rgba(255,255,255,0.7)' }}>
                {radarCasa.totais[anoAtivo]} com gasto registrado
              </span>
            </div>
          )}

          {anoIncompleto && (
            <p style={{ color: 'rgba(255,255,255,0.78)', fontSize: '0.84rem', lineHeight: 1.5, margin: '0 0 16px', maxWidth: '64ch' }}>
              {anoIncompleto} aparece com apenas {radarCasa.totais[anoIncompleto]}{' '}
              {radarCasa.totais[anoIncompleto] === 1 ? 'parlamentar' : 'parlamentares'}, porque a fonte
              ainda não publicou o ano inteiro. Por isso o padrão é {anoAtivo}. O ano segue disponível acima.
            </p>
          )}
          {sentido === 'menores' && (
            <p style={{ color: 'rgba(255,255,255,0.78)', fontSize: '0.84rem', lineHeight: 1.5, margin: '0 0 16px', maxWidth: '64ch' }}>
              Gasto baixo nem sempre quer dizer economia: pode ser parlamentar que assumiu no meio
              do ano, ficou licenciado, ou cuja prestação de contas ainda não foi publicada. Por
              isso cada linha mostra em quantos dos 12 meses houve lançamento, e a situação atual
              de quem não está em exercício. Tire suas próprias conclusões com base nos dados.
            </p>
          )}
          {linhas.length === 0 ? (
            <p style={{ color: 'rgba(255,255,255,0.55)', margin: 0, fontSize: '0.95rem' }}>
              Dados temporariamente indisponíveis. Tente recarregar a página.
            </p>
          ) : (
            <ol style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gridTemplateColumns: 'minmax(0, 1fr)', gap: '8px' }}>
              {linhas.map((p, i) => (
                <li key={p.id}>
                  {/* .radar-linha (CSS em _app.js): no celular a linha quebra e o valor desce
                      para a linha de baixo. Sem isso o valor era empurrado para fora da tela. */}
                  <Link href={hrefPerfil(p)} className="radar-linha" style={{ textDecoration: 'none', color: 'inherit', background: 'rgba(255,255,255,0.07)', borderRadius: '6px', padding: '12px 16px' }}>
                    <span style={{ flexShrink: 0, width: '26px', fontFamily: t.fonte.titulo, fontWeight: 600, color: t.cor.ouro, fontSize: '1.2rem' }}>{i + 1}</span>
                    <Avatar nome={p.nome_urna} foto={p.foto_url} size={44} />
                    <span className="radar-nome" style={{ flex: 1, minWidth: 0 }}>
                      <span style={{ display: 'block', fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.nome_urna}</span>
                      <span style={{ fontSize: '0.82rem', opacity: 0.75 }}>
                        {p.partido_atual} · {p.uf_sede} · em {p.n_notas} {assembleia && !assembleia.gastoDetalhado ? 'lançamentos' : 'notas'}
                        {/* Meses com lançamento distingue quem gastou pouco de quem esteve pouco
                            tempo em exercício. Só aparece na ponta de baixo, que é onde a dúvida
                            existe; no topo seria ruído. */}
                        {sentido === 'menores' && p.meses_com_gasto ? ` · ${p.meses_com_gasto} de 12 meses` : ''}
                      </span>
                      {/* "Situação atual" com todas as letras, de propósito: o cadastro guarda o
                          estado de HOJE, não o daquele ano. Escrever só "Licença" faria o leitor
                          atribuir a um ano passado uma condição que pode ser recente. */}
                      {sentido === 'menores' && p.situacao_atual && p.situacao_atual !== 'Exercício' && (
                        <span style={{ display: 'block', fontSize: '0.78rem', marginTop: '2px', color: t.cor.ouro }}>
                          Situação atual: {p.situacao_atual}
                          {p.condicao_eleitoral && p.condicao_eleitoral !== 'Titular' ? ` (${p.condicao_eleitoral})` : ''}
                        </span>
                      )}
                    </span>
                    <span className="radar-valor" style={{ flexShrink: 0, textAlign: 'right' }}>
                      <span style={{ display: 'block', fontWeight: 800, fontSize: '1.05rem' }}>{brl(p.total)}</span>
                      <span style={{ fontSize: '0.72rem', opacity: 0.7 }}>ver no quê →</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ol>
          )}

          {/* Expansao de 10 em 10. O numero dito aqui e sempre `linhas.length`, nunca um 10
              fixo: a tela nao pode dizer "10" mostrando 30. */}
          {linhas.length > 0 && (
            <div style={{ marginTop: '14px', display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
              {faltam > 0 && (
                <button
                  onClick={verMais}
                  disabled={carregandoMais}
                  style={{
                    padding: '9px 20px', fontSize: '0.88rem', fontWeight: 700, fontFamily: t.fonte.corpo,
                    borderRadius: t.raio.pill, cursor: carregandoMais ? 'default' : 'pointer',
                    border: '1px solid rgba(255,255,255,0.35)', background: 'transparent',
                    color: 'rgba(255,255,255,0.9)', opacity: carregandoMais ? 0.6 : 1,
                  }}
                >
                  {carregandoMais ? 'Carregando…' : faltam <= PASSO ? `Ver os últimos ${faltam}` : `Ver mais ${PASSO}`}
                </button>
              )}
              <span style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.7)' }}>
                Mostrando {linhas.length} de {totalDaCasa}.
              </span>
              {erroMais && (
                <span style={{ fontSize: '0.8rem', color: t.cor.ouro }}>
                  Não deu para buscar agora. Tente de novo.
                </span>
              )}
            </div>
          )}
        </div>
      </section>
      )}

      {/* Busca + estado */}
      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '28px', position: 'sticky', top: '70px', zIndex: 10 }}>
        <div style={{ flex: 1, minWidth: '240px' }}>
          <CampoBusca valor={busca} aoMudar={setBusca} placeholder="Buscar por nome ou partido…" aoLabel="Buscar parlamentar" />
        </div>
        {/* Nas abas estaduais só existe uma UF, então o seletor some sozinho. */}
        {ufs.length > 1 && (
          <div style={{ flex: '0 1 240px', minWidth: '180px' }}>
            <CampoSelect
              valor={uf}
              aoLabel="Filtrar por estado"
              placeholder="Todos os estados"
              aoSelecionar={setUf}
              opcoes={[{ valor: '', rotulo: 'Todos os estados' }, ...ufs.map((u) => ({ valor: u, rotulo: `${u} · ${NOMES_UF[u] || u}`, busca: `${u} ${NOMES_UF[u] || ''}` }))]}
            />
          </div>
        )}
      </div>

      {filtrados.length > 0 ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(260px, 100%), 1fr))', gap: '14px' }}>
          {filtrados.map((d) => (
            <Link key={d.id} href={hrefPerfil(d)} style={{ textDecoration: 'none', color: 'inherit' }}>
              <div style={{ background: t.cor.papelCartao, borderRadius: t.raio.md, padding: '16px', display: 'flex', gap: '14px', alignItems: 'center', height: '100%', boxShadow: t.sombra.clicavel, transition: 'box-shadow .15s ease, transform .15s ease' }}
                onMouseOver={(e) => { e.currentTarget.style.boxShadow = t.sombra.hover; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                onMouseOut={(e) => { e.currentTarget.style.boxShadow = t.sombra.clicavel; e.currentTarget.style.transform = 'none'; }}>
                <Avatar nome={d.nome} foto={d.foto_url} size={56} />
                <div style={{ minWidth: 0 }}>
                  <p style={{ margin: '0 0 2px', fontWeight: 700, fontSize: '0.98rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{d.nome}</p>
                  <p style={{ margin: '0 0 6px', color: t.cor.cinza, fontSize: '0.82rem' }}>{d.partido} · {d.uf || '-'}</p>
                  <span style={{ color: t.cor.ouroTexto, fontWeight: 700, fontSize: '0.8rem' }}>Ver perfil →</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <p style={{ color: t.cor.cinza }}>Nenhum parlamentar encontrado com esse filtro.</p>
      )}
    </div>
  );
}

// Carrega os dados das duas listas. Fica aqui, exportado, porque /senadores usa a mesma
// tela: a unica diferenca e a casa que abre. Ver pages/senadores.js.
export async function carregarParlamentares(query, casaFixa, req) {
    const settled = await Promise.allSettled([
        ServicoAPI.listarDeputados(),
        // Uma consulta só traz o top 10 de TODAS as casas e TODOS os anos: a view radar_gastos é
        // pequena, e assim o seletor de ano troca no cliente, sem ida ao servidor.
        ServicoAPI.getRadaresPorCasaEAno(10),
    ]);
    const get = (i) => (settled[i].status === 'fulfilled' ? settled[i].value : []);
    const c = String(query.casa || '').toLowerCase();
    // Links antigos (?casa=sp, ?casa=alesp, ?casa=estaduais) continuam caindo em São Paulo;
    // ?casa=rs / ?casa=alergs abrem a aba do Rio Grande do Sul.
    const casaInicial = casaFixa
        || ((c.includes('alergs') || c === 'rs') ? 'Assembleia (RS)'
        : (c.includes('alesp') || c === 'sp' || c.includes('estad') || c.includes('assembleia')) ? 'Assembleia (SP)'
        : 'Câmara');
    const proto = req?.headers?.['x-forwarded-proto'] || 'http';
    const caminho = casaFixa === 'Senado' ? '/senadores' : '/deputados';
    return {
        deputados: JSON.parse(JSON.stringify(get(0))),
        qInicial: query.q || '',
        ufInicial: query.uf || '',
        casaInicial,
        radares: JSON.parse(JSON.stringify(get(1) || {})),
        canonical: req?.headers?.host ? `${proto}://${req.headers.host}${caminho}` : null,
    };
}

export async function getServerSideProps({ query, req }) {
    // A lista de senadores tem rota propria. Chamar de "/deputados" uma pagina intitulada
    // "Senadores" e o mesmo erro que /deputado/ para o perfil de um senador.
    if (String(query.casa || '').toLowerCase().includes('sen')) {
        return { redirect: { destination: '/senadores', permanent: true } };
    }
    return { props: await carregarParlamentares(query, null, req) };
}
