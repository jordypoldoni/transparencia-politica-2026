// Tela das listas de parlamentares, usada por /deputados, /deputados-estaduais e /senadores.
// 21/10/2026 (decisão do Jordy): o ranking de gastos saiu daqui. As listas são só busca (nome, partido e estado);
// a comparação dos gastos mora em /gastos-parlamentares.
//
// POR QUE ISTO NAO MORA MAIS NUM ARQUIVO DE PAGINA (12/09/2026):
// eu tinha deixado o componente em pages/deputados.js e exportado dali tambem o carregador
// de dados. O Next so remove do pacote do navegador o que esta em getServerSideProps; um
// export extra ele mantem, e junto foi o cliente do Supabase inteiro. As duas telas
// quebraram em producao com "Cannot read properties of undefined (reading 'isTTY')", que e
// codigo de servidor rodando no cliente. Regra: pagina fica fina, componente em components/,
// consulta em src/servicos/.
import { useState, useMemo, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import Avatar from './Avatar';
import BotaoFavorito from './BotaoFavorito';
import CampoSelect from './CampoSelect';
import CampoBusca from './CampoBusca';
import { NOMES_UF } from '../src/lib/cotas';
import { t } from '../src/estilo/tokens';
import { Seta } from './icones';
import { hrefPerfil, casaDoPerfil } from '../src/lib/casa';
import Paginacao from './Paginacao';
import { ASSEMBLEIAS, assembleiaDe, assembleiaPorUf, verbaDe } from '../src/lib/assembleias';
import { deUf } from '../src/lib/ufs';
import { useRouter } from 'next/router';
import { Pino } from './icones';

// Foto do eleito de 2022 no próprio TSE, montada pelo id (o payload não traz o endereço).
const fotoEleito2022 = (d) => `https://divulgacandcontas.tse.jus.br/divulga/rest/arquivo/img/2040602022/${String(d.id).replace(/^tse-/, '')}/${d.uf}`;

export default function ListaParlamentares({ deputados, qInicial, ufInicial, casaInicial, canonical = null, falhaNaLista = false }) {
  const [busca, setBusca] = useState(qInicial || '');
  const [uf, setUf] = useState(ufInicial || '');
  const [casa, setCasa] = useState(casaInicial || 'Câmara');
  // Sincroniza ao navegar entre Deputados/Senadores (mesma rota, props mudam no cliente).
  useEffect(() => { setCasa(casaInicial || 'Câmara'); setUf(ufInicial || ''); }, [casaInicial, ufInicial]);
  // "Senadores" é uma página própria; "Deputados" agrupa federais + estaduais.
  const assembleia = assembleiaDe(casa); // null quando a aba é federal, Senado ou Estaduais
  // PÁGINA ÚNICA DOS ESTADUAIS (29/09/2026, decisão do Jordy): 'Estaduais' junta todas as
  // Assembleias numa lista só, igual à dos federais. O campo de estado, no alto, filtra a lista.
  const ehEstaduais = casa === 'Estaduais';
  // `soEleito`: eleitos de 2022 nos estados sem cadastro da Assembleia (vêm do TSE, sem perfil).
  const daCasa = (d) => (ehEstaduais ? (String(d.casa || '').startsWith('Assembleia') || d.soEleito) : d.casa === casa);
  const assembleiaDoUf = ehEstaduais ? assembleiaPorUf(uf) : null;
  const router = useRouter();
  const escolherUf = (v) => {
    setUf(v || '');
    // O estado vai para o endereço, para o link compartilhado abrir no mesmo estado.
    router.replace({ pathname: router.pathname, query: v ? { uf: v } : {} }, undefined, { shallow: true, scroll: false });
  };
  // A ressalva de cada assembleia: só a do estado escolhido; sem estado, todas.
  const assembleiasDaTela = ehEstaduais ? (uf ? [assembleiaDoUf].filter(Boolean) : ASSEMBLEIAS) : (assembleia ? [assembleia] : []);
  const ufs = useMemo(
    () => Array.from(new Set(deputados.filter(daCasa).map((d) => d.uf).filter(Boolean))).sort(),
    [deputados, casa]
  );

  const filtrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return deputados.filter((d) => {
      const okCasa = daCasa(d);
      const okNome = !termo || d.nome.toLowerCase().includes(termo) || d.partido.toLowerCase().includes(termo);
      const okUf = !uf || d.uf === uf;
      return okCasa && okNome && okUf;
    });
  }, [deputados, busca, uf, casa]);

  // ---- Paginacao da grade -----------------------------------------------------------
  // 5 por linha x 5 linhas no desktop. Antes a tela despejava os 513 federais de uma vez.
  // Quem procura alguem especifico usa a busca; quem esta navegando nao rola 513 cartoes.
  // ORDEM: depende de `filtrados`, `busca`, `uf` e `casa`, todos declarados acima (TDZ).
  const POR_PAGINA = 25;
  const [pagina, setPagina] = useState(1);
  // Qualquer mudanca no recorte volta para a primeira pagina: senao o leitor fica parado
  // numa pagina 7 que o resultado novo nem tem.
  useEffect(() => { setPagina(1); }, [busca, uf, casa]);
  const totalPaginas = Math.max(1, Math.ceil(filtrados.length / POR_PAGINA));
  const paginaAtual = Math.min(pagina, totalPaginas);
  const daPagina = filtrados.slice((paginaAtual - 1) * POR_PAGINA, paginaAtual * POR_PAGINA);
  const irPara = (n) => {
    setPagina(Math.min(Math.max(1, n), totalPaginas));
    // Sem isto o leitor troca de pagina e continua olhando o rodape da anterior.
    if (typeof document !== 'undefined') {
      document.getElementById('grade-parlamentares')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // Botao do site: indigo com texto ambar, SEM borda, com sombra. Os proprios tokens ja
  // pedem isso ("diferenciacao sem bordas coloridas"); a versao anterior deste botao usava
  // uma linha cinza de contorno e destoava do resto.
  // Estas duas telas nao tinham <title> nem descricao nenhuma ate 12/09/2026: o Google
  // indexava a lista principal do site sem titulo.
  const tituloPagina = casa === 'Senado' ? 'Senadores: quanto cada um gastou e como votou | Lume'
    : ehEstaduais ? 'Deputados estaduais: quanto cada um gastou e como votou | Lume'
    : assembleia ? `Deputados estaduais ${assembleia.nomeCom}: gastos e votos | Lume`
    : 'Deputados federais: quanto cada um gastou e como votou | Lume';
  const descPagina = casa === 'Senado'
    ? 'Os 81 senadores e os suplentes em exercicio: quanto cada um usou da cota do Senado, como votou e a fidelidade ao partido. Fonte oficial do Senado Federal.'
    : ehEstaduais ? `Os deputados estaduais: quanto cada um usou da verba de gabinete e o que cada assembleia publica sobre o mandato. Fontes: ${ASSEMBLEIAS.map((a) => a.sigla).join(', ').replace(/, ([^,]*)$/, ' e $1')}.`
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
      {/* TÍTULO E ESTADO NA MESMA FAIXA (30/09/2026, pedido do Jordy): nos estaduais o campo de
          estado fica no alto, à direita, e filtra a lista. No celular desce para
          baixo do título. */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px 24px', flexWrap: 'wrap', margin: '0 0 16px' }}>
      <h1 style={{ fontFamily: t.fonte.titulo, fontWeight: 600, fontSize: 'clamp(1.8rem,4vw,2.6rem)', margin: 0 }}>
        {casa === 'Senado'
          ? 'Senadores'
          : ehEstaduais
          ? 'Deputados Estaduais'
          : assembleia
          ? `Deputados Estaduais ${assembleia.nomeCom}`
          : 'Deputados Federais'}
      </h1>
      {ehEstaduais && (
        <div style={{ flex: '0 1 300px', minWidth: '220px', marginLeft: 'auto' }}>
          <CampoSelect
            valor={uf}
            aoLabel="Estado dos deputados estaduais"
            placeholder="Escolha o estado"
            icone={<Pino />}
            aoSelecionar={escolherUf}
            opcoes={[{ valor: '', rotulo: 'Todos os estados' }, ...ufs.map((u) => ({ valor: u, rotulo: `${u} · ${NOMES_UF[u] || u}`, busca: `${u} ${NOMES_UF[u] || ''}` }))]}
          />
        </div>
      )}
      </div>

      {/* 29/09/2026: sem alternância no topo. Federais, estaduais e senadores são páginas
          próprias no menu Parlamentares. */}

      {/* A pagina carrega duas consultas em paralelo. Quando a da lista falha, dizer
          "0 deputados federais" e afirmar um numero falso: a verdade e que nao carregou. */}
      {falhaNaLista ? (
        <p style={{ color: t.cor.cinza, margin: '0 0 24px' }}>
          Não foi possível carregar a lista de parlamentares agora. Recarregue a página
          para tentar de novo.
        </p>
      ) : (
      <p style={{ color: t.cor.cinza, margin: '0 0 24px' }}>
        {filtrados.length}{' '}
        {casa === 'Senado'
          ? 'senadores'
          : ehEstaduais
          ? (!uf ? 'deputados estaduais em todos os estados' : assembleiaDoUf ? `deputados estaduais ${deUf(uf)}` : `deputados estaduais eleitos em 2022 ${deUf(uf)}`)
          : assembleia
          ? `deputados estaduais de ${assembleia.uf}`
          : 'deputados federais'}
        {/* "Clique para ver..." saiu dos estaduais em 30/09: os cartões dos eleitos de 2022 não
            abrem, e a frase prometia um clique que não existe. */}
        {ehEstaduais ? '.' : <>. Clique para ver {assembleia
          ? (assembleia.votos ? 'como cada um votou' : 'os gastos de gabinete')
          : 'gastos, votos e coerência'}.</>}
      </p>
      )}

      {/* O que esta assembleia publica e o que nao publica. Era um cartao com fundo de alerta
          e padding proprio: o padding empurrava o texto para dentro e desalinhava com a linha
          de cima, e o fundo dava a essa ressalva mais peso do que a propria descricao da
          pagina. Agora e texto corrido, na mesma margem do paragrafo anterior. */}
      {assembleiasDaTela.map((assembleia) => (
        <p key={assembleia.uf} className="nota-casa">
          <strong>{NOMES_UF[assembleia.uf] || assembleia.uf} ({assembleia.sigla}).</strong>{' '}
          {/* o nome do estado aqui abre a frase, então vai sem preposição */}
          {assembleia.votos
            ? 'A assembleia publica o voto de cada deputado, matéria por matéria, e é isso que mostramos aqui. '
            : assembleia.votosPendentes
            ? 'Os votos de cada deputado ainda não entraram no site. '
            : 'A assembleia não divulga votação nominal, então não há como mostrar como cada deputado votou. '}
          {!assembleia.gastos
            ? 'Os gastos de gabinete ainda não entraram.'
            : assembleia.gastoDetalhado
            ? `Os gastos da ${verbaDe(assembleia)} estão no ar, nota a nota, com fornecedor e CNPJ.`
            : 'Os gastos de gabinete estão no ar, mas a assembleia publica apenas o total de cada mês por categoria: dá para ver quanto e em quê, não para quem o dinheiro foi.'}
          {' '}Fonte: {assembleia.sigla}.
        </p>
      ))}

      {/* Busca + estado */}
      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '28px', position: 'sticky', top: '70px', zIndex: 10 }}>
        <div style={{ flex: 1, minWidth: '240px' }}>
          <CampoBusca valor={busca} aoMudar={setBusca} placeholder="Buscar por nome ou partido…" aoLabel="Buscar parlamentar" />
        </div>
        {/* Numa lista de um estado só, o seletor some sozinho. Nos estaduais ele traz os estados com assembleia. */}
        {!ehEstaduais && ufs.length > 1 && (
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

      <div id="grade-parlamentares" style={{ scrollMarginTop: '96px' }}>
      {/* POR QUE ALGUNS CARTÕES NÃO ABREM (29/09/2026, decisão do Jordy: sem clique, com o motivo
          na tela). Aparece só quando a lista mostrada tem eleitos de 2022. */}
      {filtrados.some((d) => d.soEleito) && (
        <p style={{ margin: '0 0 16px', padding: '12px 16px', borderRadius: t.raio.md, background: t.cor.papelQuente, color: t.cor.tinta, fontSize: '0.85rem', lineHeight: 1.55 }}>
          {uf ? (
            <>
              <strong>Por que os cartões não abrem.</strong> O site ainda não tem o cadastro da Assembleia
              Legislativa {deUf(uf)}, então a lista mostra quem foi eleito em 2022, segundo o TSE. Os cartões não abrem uma ficha porque ainda não coletamos os gastos nem os
              votos dessa Assembleia. Quem foi eleito pode não estar no cargo hoje (suplentes que assumiram
              não aparecem), e o partido mostrado é o da eleição.
            </>
          ) : (
            <>
              <strong>Por que alguns cartões não abrem.</strong> Nos estados em que o site ainda não tem o cadastro
              da Assembleia ({`todos menos ${ASSEMBLEIAS.map((a) => a.uf).join(' e ')}`}), a lista mostra quem foi
              eleito em 2022, segundo o TSE. Esses cartões não abrem uma ficha porque ainda não coletamos os
              gastos nem os votos dessas Assembleias. Quem foi eleito pode não estar no cargo hoje (suplentes que
              assumiram não aparecem), e o partido mostrado é o da eleição.
            </>
          )}
        </p>
      )}
      {filtrados.length > 0 ? (
        <>
        {/* .grade-parl (CSS em _app.js): 5 colunas no desktop, caindo para 4, 3 e 2 conforme
            a largura. O cartao e enxuto de proposito, para caber 5 numa linha sem espremer o
            nome. O que era a linha "Ver perfil" virou a seta a direita, que nao ocupa altura. */}
        <div className="grade-parl">
          {/* CORAÇÃO (26/09/2026): o link virou camada por trás do conteúdo, como no CardCandidato,
              porque botão dentro de link é HTML inválido e o clique no coração abriria o perfil. */}
          {daPagina.map((d) => d.soEleito ? (
            // Eleito de 2022 sem cadastro da Assembleia: cartão SEM clique, sem coração e sem
            // seta (não há perfil para abrir nem para guardar). O motivo está no aviso acima.
            <div key={d.id} title="Eleito em 2022. Ainda sem ficha no site: veja o aviso acima da lista."
              style={{ background: t.cor.papelCartao, borderRadius: t.raio.md, padding: '11px 12px', display: 'flex', gap: '8px', alignItems: 'center', height: '100%', boxShadow: t.sombra.clicavel, cursor: 'default' }}>
              <Avatar nome={d.nome} foto={fotoEleito2022(d)} size={40} />
              <div style={{ minWidth: 0, flex: 1 }}>
                <p style={{ margin: 0, fontWeight: 700, fontSize: '0.88rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{d.nome}</p>
                <p style={{ margin: '2px 0 0', color: t.cor.cinza, fontSize: '0.76rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{d.partido} · {d.uf || '-'}</p>
                <p style={{ margin: '2px 0 0', color: t.cor.cinza, fontSize: '0.72rem' }}>{d.cargo === 'Deputado Distrital' ? 'Eleito distrital em 2022' : 'Eleito em 2022'}</p>
              </div>
            </div>
          ) : (
            <div key={d.id} style={{ position: 'relative', height: '100%' }}
              onMouseOver={(e) => { const c = e.currentTarget.firstChild; c.style.boxShadow = t.sombra.hover; c.style.transform = 'translateY(-2px)'; }}
              onMouseOut={(e) => { const c = e.currentTarget.firstChild; c.style.boxShadow = t.sombra.clicavel; c.style.transform = 'none'; }}>
              <div style={{ position: 'relative', zIndex: 2, pointerEvents: 'none', background: t.cor.papelCartao, borderRadius: t.raio.md, padding: '11px 10px 11px 12px', display: 'flex', gap: '8px', alignItems: 'center', height: '100%', boxShadow: t.sombra.clicavel, transition: 'box-shadow .15s ease, transform .15s ease' }}>
                <Avatar nome={d.nome} foto={d.foto_url} size={40} />
                <div style={{ minWidth: 0, flex: 1 }}>
                  <p style={{ margin: 0, fontWeight: 700, fontSize: '0.88rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{d.nome}</p>
                  <p style={{ margin: '2px 0 0', color: t.cor.cinza, fontSize: '0.76rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{d.partido} · {d.uf || '-'}</p>
                </div>
                <BotaoFavorito tipo="parlamentar" chave={hrefPerfil(d)} rotulo={d.nome}
                  detalhe={[casaDoPerfil(d).cargoPadrao, d.partido, d.uf].filter(Boolean).join(' · ')} foto={d.foto_url} />
                <Seta direcao="direita" size={18} />
              </div>
              <Link href={hrefPerfil(d)} aria-label={`${d.nome}, ver perfil`} style={{ position: 'absolute', inset: 0, zIndex: 1, borderRadius: t.raio.md }} />
            </div>
          ))}
        </div>

        {/* Paginacao. O texto diz o intervalo real, nunca um numero fixo. */}
        <Paginacao pagina={paginaAtual} total={totalPaginas} aoMudar={irPara} margem="16px 0 0"
          detalhe={`Mostrando ${(paginaAtual - 1) * POR_PAGINA + 1} a ${(paginaAtual - 1) * POR_PAGINA + daPagina.length} de ${filtrados.length}`} />
        </>
      ) : (
        <p style={{ color: t.cor.cinza }}>Nenhum parlamentar encontrado com esse filtro.</p>
      )}
      </div>
    </div>
  );
}
