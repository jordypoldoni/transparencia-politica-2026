import { useState, useRef, useEffect } from 'react';
import { lembrarLista } from '../src/lib/voltarLista';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import ServicoAPI from '../src/servicos/servico_api';
import Avatar from '../components/Avatar';
import CardCandidato from '../components/CardCandidato';
import BotaoMeuVoto from '../components/BotaoMeuVoto';
import BotaoFavorito from '../components/BotaoFavorito';
import CampoBusca from '../components/CampoBusca';
import CampoSelect from '../components/CampoSelect';
import EscolhaCompacta from '../components/EscolhaCompacta';
import { NOMES_UF } from '../src/lib/cotas';
import { t } from '../src/estilo/tokens';
import { Seta } from '../components/icones';
import SeloSituacao from '../components/SeloSituacao';
import Paginacao from '../components/Paginacao';
import ApuracaoEleicao from '../components/ApuracaoEleicao';
import ConferenciaUrnas from '../components/ConferenciaUrnas';
import BarraControleEleicoes from '../components/BarraControleEleicoes';
import { turnoValido, disponivelNoTurno, SEGUNDO_TURNO } from '../src/lib/turnos';
import ReplayApuracao from '../components/ReplayApuracao';
import { replayLiberado, TEXTO_LIBERA_2T } from '../src/lib/replayLiberacao';
import { carregarSegundoTurno } from '../src/lib/candidatosSegundoTurno';
import { listarCandidatosEstaduais, UFS_ESTADUAL } from '../src/lib/candidatosEstaduais';
import SeloAtualizacao from '../components/SeloAtualizacao';
import { seloDoCargoCandidato } from '../src/lib/selosFonte';

const UFS = ['AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'];
const PORPAGINA = 25; // 5 colunas x 5 linhas, igual as listas de /deputados e /senadores

function abaEstilo(ativa) {
  return {
    textDecoration: 'none', display: 'inline-block', padding: '10px 20px', borderRadius: t.raio.pill,
    fontWeight: 800, fontSize: '0.92rem', color: ativa ? '#fff' : t.cor.tinta,
    background: ativa ? t.cor.verde : t.cor.papelQuente2,
  };
}

function CardCandidatoPresidencial({ pessoa, papel }) {
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

function ListaPresidente({ chapas }) {
  // A situação vinha AO VIVO do TSE pelo navegador. Saiu em 18/09: o Akamai do TSE recusa a
  // Vercel com 403, e além disso o que é buscado depois do carregamento não existe para o
  // Google. Agora vem do banco, junto com o resto da chapa, e entra no HTML servido.

  if (chapas.length === 0) return <p style={{ color: t.cor.cinza }}>Nenhum candidato coletado ainda.</p>;
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(300px, 100%), 1fr))', gap: '14px' }}>
      {chapas.map((c) => (
        // CORAÇÃO (26/09/2026): o link virou camada por trás do conteúdo, como no CardCandidato.
        <div key={c.presidente.slug} style={{ position: 'relative', height: '100%' }}
          onMouseOver={(e) => { const x = e.currentTarget.firstChild; x.style.boxShadow = t.sombra.hover; x.style.transform = 'translateY(-2px)'; }}
          onMouseOut={(e) => { const x = e.currentTarget.firstChild; x.style.boxShadow = t.sombra.clicavel; x.style.transform = 'none'; }}>
          <div style={{ position: 'relative', zIndex: 2, pointerEvents: 'none', background: t.cor.papelCartao, borderRadius: t.raio.md, padding: '18px', height: '100%', minWidth: 0, overflow: 'hidden', boxShadow: t.sombra.clicavel, transition: 'box-shadow .15s ease, transform .15s ease' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px', marginBottom: '14px' }}>
              <span style={{ fontSize: '0.78rem', fontWeight: 700, color: t.cor.cinza }}>{c.presidente.partido_sigla}{c.presidente.coligacao_nome ? ` · ${c.presidente.coligacao_nome}` : ''}</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
                {c.nr_candidato && (
                  <span style={{ fontFamily: t.fonte.titulo, fontWeight: 700, fontSize: '1.3rem', color: t.cor.ouroTexto }}>{c.nr_candidato}</span>
                )}
                <BotaoMeuVoto compacto cargo="presidente" chave={`/presidencial/${c.presidente.slug}`} rotulo={c.presidente.nome_urna}
                  foto={c.presidente.foto_url} detalhe={[c.presidente.partido_sigla, c.nr_candidato ? `nº ${c.nr_candidato}` : null].filter(Boolean).join(' · ')} />
                <BotaoFavorito tipo="candidato" chave={`/presidencial/${c.presidente.slug}`} rotulo={c.presidente.nome_urna}
                  detalhe={['Candidato(a) a Presidente', c.presidente.partido_sigla].filter(Boolean).join(' · ')} foto={c.presidente.foto_url} />
              </span>
            </div>
            <div style={{ display: 'grid', gap: '12px', minWidth: 0 }}>
              <CardCandidatoPresidencial pessoa={c.presidente} papel="Presidente" />
              {c.vice && <CardCandidatoPresidencial pessoa={c.vice} papel="Vice" />}
            </div>
            {/* REMOVIDO EM 18/09 o aviso "o TSE não informa qual vice pertence a qual chapa".
                Era falso. A ficha individual de cada candidato publica o parceiro de chapa, e
                os 28 pares são recíprocos e de cargos opostos, inclusive os dois do número 28,
                que a fonte separa em Marçal↔Avalanche e Avalanche↔Silvia. Dois cards com o
                mesmo número continuam aparecendo, e agora cada um mostra o vice certo, que é
                o que explica a duplicidade sem precisar de aviso nenhum. */}
            <SeloSituacao info={{ situacao: c.presidente.situacao_tse }} consultadoEm={c.presidente.ficha_coletada_em} />
            <span style={{ display: 'inline-block', marginTop: '10px', color: t.cor.ouroTexto, fontWeight: 700, fontSize: '0.8rem' }}>Ver ficha e proposta<Seta direcao="direita" size={14} emTexto /></span>
          </div>
          <Link href={`/presidencial/${c.presidente.slug}`} aria-label={`${c.presidente.nome_urna}, ver ficha e proposta`} style={{ position: 'absolute', inset: 0, zIndex: 1, borderRadius: t.raio.md }} />
        </div>
      ))}
    </div>
  );
}

// Os dois cargos legislativos usam a MESMA lista (22/09/2026, quando o Senado entrou). O que
// muda por cargo mora aqui; busca, filtro por estado, paginação e o voltar com filtro são iguais.
const CARGOS_LISTA = {
  'deputado-federal': { chave: 'deputado-federal', api: '/api/candidatos-deputado-federal', rotulo: 'Deputado Federal', hrefBase: '/deputado-federal' },
  senador: { chave: 'senador', api: '/api/candidatos-senador', rotulo: 'Senador', hrefBase: '/candidato-senador' },
  governador: { chave: 'governador', api: '/api/candidatos-governador', rotulo: 'Governador', hrefBase: '/candidato-governador' },
  // DEPUTADO ESTADUAL (25/09/2026) é o primeiro cargo lido do TSE NA HORA, sem banco: ~20 mil
  // candidatos no país não cabem no plano gratuito. A fonte só lista por estado, então aqui o
  // estado é OBRIGATÓRIO (sem "Todos os estados") e não há contagem por UF antes de escolher.
  'deputado-estadual': { chave: 'deputado-estadual', api: '/api/candidatos-deputado-estadual', rotulo: 'Deputado Estadual', hrefBase: '/candidato-estadual', ufObrigatoria: true, aoVivo: true },
};


// Busca de candidato a Deputado Federal: mesmo campo padrão do site (pílula, ícone de lupa,
// linha âmbar ao focar) e o MESMO comportamento de /deputados: digita e a lista já vai
// atualizando sozinha, sem botão "Buscar" e sem recarregar a página. A diferença é só por
// baixo dos panos: são 7.703 candidatos, não dá pra carregar tudo no cliente como em
// /deputados (~600 parlamentares), então cada busca vai a um endpoint fino
// (/api/candidatos-deputado-federal, mesmo padrão do /api/buscar-ente.js que já existia
// pra busca de município) em vez de filtrar um array já carregado.
function ListaDeputadoFederal({ dadosIniciais, resumo, filtrosIniciais, paginaInicial, cargo = 'deputado-federal' }) {
  const cfg = CARGOS_LISTA[cargo] || CARGOS_LISTA['deputado-federal'];
  const router = useRouter();
  const [uf, setUf] = useState(filtrosIniciais.uf || '');
  const [busca, setBusca] = useState(filtrosIniciais.busca || '');
  const partidoRef = useRef(filtrosIniciais.partido || ''); // sem controle na UI, só preserva se veio na URL
  const [pagina, setPagina] = useState(paginaInicial);
  const [dados, setDados] = useState(dadosIniciais);
  const [carregando, setCarregando] = useState(false);
  const debounceRef = useRef(null);
  const pedidoRef = useRef(0);

  const buscar = (ufAlvo, buscaAlvo, paginaAlvo) => {
    const id = ++pedidoRef.current;
    setCarregando(true);
    const partido = partidoRef.current;
    const params = new URLSearchParams();
    if (ufAlvo) params.set('uf', ufAlvo);
    if (partido) params.set('partido', partido);
    if (buscaAlvo) params.set('busca', buscaAlvo);
    if (paginaAlvo > 1) params.set('pagina', String(paginaAlvo));
    fetch(`${cfg.api}?${params.toString()}`)
      .then((r) => r.json())
      .then((data) => { if (id === pedidoRef.current) setDados(data); })
      .catch(() => { if (id === pedidoRef.current) setDados({ itens: [], total: 0 }); })
      .finally(() => { if (id === pedidoRef.current) setCarregando(false); });

    // Mantém a URL em dia (link compartilhável, botão voltar do navegador) sem recarregar a página.
    const q = new URLSearchParams({ cargo: cfg.chave });
    if (ufAlvo) q.set('uf', ufAlvo);
    if (partido) q.set('partido', partido);
    if (buscaAlvo) q.set('busca', buscaAlvo);
    if (paginaAlvo > 1) q.set('pagina', String(paginaAlvo));
    router.replace(`/candidatos-2026?${q.toString()}`, undefined, { shallow: true });
    lembrarLista(cfg.chave, `/candidatos-2026?${q.toString()}`);
  };

  // Quem chegou já filtrado (link compartilhado, ou volta pelo navegador) também fica anotado.
  useEffect(() => {
    const q = new URLSearchParams({ cargo: cfg.chave });
    if (filtrosIniciais.uf) q.set('uf', filtrosIniciais.uf);
    if (filtrosIniciais.partido) q.set('partido', filtrosIniciais.partido);
    if (filtrosIniciais.busca) q.set('busca', filtrosIniciais.busca);
    if (paginaInicial > 1) q.set('pagina', String(paginaInicial));
    lembrarLista(cfg.chave, `/candidatos-2026?${q.toString()}`);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const aoMudarBusca = (valor) => {
    setBusca(valor);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => { setPagina(1); buscar(uf, valor, 1); }, 250);
  };
  const aoMudarUf = (novaUf) => { setUf(novaUf); setPagina(1); buscar(novaUf, busca, 1); };
  const aoMudarPagina = (novaPagina) => { setPagina(novaPagina); buscar(uf, busca, novaPagina); };
  const limparFiltros = () => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    partidoRef.current = '';
    // Com estado obrigatório, limpar tira só a busca: voltar para "sem estado" esvaziaria a lista.
    const ufMantida = cfg.ufObrigatoria ? uf : '';
    setUf(ufMantida); setBusca(''); setPagina(1); buscar(ufMantida, '', 1);
  };

  const opcoesUf = cfg.ufObrigatoria
    ? UFS_ESTADUAL.map((u) => ({ valor: u, rotulo: `${u} · ${NOMES_UF[u] || u}${resumo.porUf[u] != null ? ` (${resumo.porUf[u].toLocaleString('pt-BR')})` : ''}`, busca: `${u} ${NOMES_UF[u] || ''}` }))
    : [
      { valor: '', rotulo: `Todos os estados (${resumo.total})`, busca: 'todos brasil nacional' },
      ...UFS.map((u) => ({ valor: u, rotulo: `${u} · ${NOMES_UF[u] || u} (${resumo.porUf[u] || 0})`, busca: `${u} ${NOMES_UF[u] || ''}` })),
    ];

  const temFiltro = cfg.ufObrigatoria ? !!busca : !!(uf || busca);
  const semEstado = cfg.ufObrigatoria && !uf;
  const totalPaginas = Math.max(1, Math.ceil((dados.total || 0) / PORPAGINA));

  return (
    <div>
      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'flex-start', marginBottom: '16px' }}>
        <div style={{ flex: '1 1 220px', minWidth: '200px' }}>
          <CampoSelect opcoes={opcoesUf} valor={uf} placeholder={cfg.ufObrigatoria ? 'Escolha o estado' : 'Todos os estados'} aoLabel="Filtrar por estado" aoSelecionar={aoMudarUf} />
        </div>
        <div style={{ flex: '2 1 240px', minWidth: 0 }}>
          <CampoBusca valor={busca} aoMudar={aoMudarBusca} placeholder="Buscar por nome, partido ou número…" aoLabel={`Buscar candidato a ${cfg.rotulo} por nome, partido ou número`} />
        </div>
        {temFiltro && (
          <button type="button" onClick={limparFiltros}
            style={{ display: 'flex', alignItems: 'center', fontSize: '0.85rem', fontWeight: 700, color: t.cor.ouroTexto, background: 'none', border: 'none', cursor: 'pointer', padding: '0 6px', fontFamily: t.fonte.corpo }}>
            Limpar filtros ✕
          </button>
        )}
      </div>

      {semEstado ? (
        // Sem estado escolhido não há o que listar: a fonte só responde por UF. Dizer por quê.
        <p style={{ color: t.cor.cinza, fontSize: '0.92rem', lineHeight: 1.5, margin: '0 0 14px', maxWidth: '70ch' }}>
          Escolha um estado para ver quem concorre à Assembleia Legislativa. No Distrito Federal o cargo
          equivalente é o de deputado distrital, que ainda não está no site.
        </p>
      ) : dados.erro && !carregando ? (
        // Falha da fonte não pode parecer "nenhum candidato".
        <p style={{ color: t.cor.alertaTexto, fontSize: '0.9rem', margin: '0 0 14px' }}>{dados.erro}</p>
      ) : (
      <>
      <p style={{ color: t.cor.cinza, fontSize: '0.86rem', margin: '0 0 14px' }}>
        {carregando ? 'Buscando…' : (
          <>
            {(dados.total || 0).toLocaleString('pt-BR')} candidato{dados.total === 1 ? '' : 's'} encontrado{dados.total === 1 ? '' : 's'}
            {uf ? ` em ${uf} · ${NOMES_UF[uf] || ''}` : ' em todo o Brasil'}.
            {cfg.aoVivo && filtrosIniciais.ufPadrao && uf === filtrosIniciais.uf && (filtrosIniciais.ufPadrao === 'local'
              ? ' Estado escolhido pela sua localização aproximada; troque no campo acima.'
              : ' SP aparece por padrão; escolha o seu estado no campo acima.')}
            {cfg.aoVivo && ' Lista consultada no TSE no momento da visita (renovada a cada 6 horas), não guardada no site.'}
          </>
        )}
      </p>

      {!carregando && dados.itens.length === 0 ? (
        <p style={{ color: t.cor.cinza }}>Nenhum candidato encontrado com esses filtros, tente limpar a busca ou trocar de estado.</p>
      ) : (
        <div className="grade-parl" style={{ opacity: carregando ? 0.5 : 1, transition: 'opacity .15s' }}>
          {/* .grade-parl (CSS em _app.js): a mesma grade de /deputados e /senadores, 5 colunas
              no desktop caindo para 4, 3 e 2. Aqui era auto-fill com 280px, que dava 4. */}
          {dados.itens.map((d) => <CardCandidato key={d.id} d={d} hrefBase={cfg.hrefBase} votar />)}
        </div>
      )}

      </>
      )}

      {!semEstado && (
        <Paginacao pagina={pagina} total={totalPaginas} aoMudar={aoMudarPagina} />
      )}
    </div>
  );
}

// ALTERNADOR "Candidatos | Apuração" (02/10/2026): as duas visões moram na mesma página de
// Eleições 2026. A apuração é a mesma rota com ?visao=apuracao, para não criar menu nem página nova.
function AlternarVisao({ visao, cargo, turno = 1 }) {
  // Celular (22/10/2026): campo de escolha, como o de cargo, em vez de pastilhas lado a lado.
  const sufixo = turno === 2 ? '&turno=2' : '';
  return (
    <div style={{ marginBottom: '10px' }}>
      <EscolhaCompacta rotulo="Visão da página" valor={visao} opcoes={[
        { valor: 'candidatos', rotulo: 'Candidatos', href: `/candidatos-2026?cargo=${cargo}${sufixo}` },
        { valor: 'apuracao', rotulo: 'Apuração', href: `/candidatos-2026?visao=apuracao&cargo=${cargo}${sufixo}` },
        { valor: 'replay', rotulo: 'Replay', href: '/candidatos-2026?visao=replay' },
      ]} />
    </div>
  );
}

// Endereços da barra de controle (computador). O 1º turno é o padrão e não leva `turno` no endereço.
// O Replay não tem cargo e, ao entrar nele por outra visão, abre sempre no 1º turno (o 2º só abre pelo seletor de turno, depois da hora).
const hrefEleicoes = (visao, cargo, turno) => visao === 'replay'
  ? `/candidatos-2026?visao=replay${turno === 2 ? '&turno=2' : ''}`
  : `/candidatos-2026?${visao === 'apuracao' ? 'visao=apuracao&' : ''}cargo=${cargo}${turno === 2 ? '&turno=2' : ''}`;

const CARGOS_APURACAO = [
  { valor: 'presidente', rotulo: 'Presidente' },
  { valor: 'governador', rotulo: 'Governador' },
  { valor: 'senador', rotulo: 'Senador' },
  { valor: 'deputado-federal', rotulo: 'Deputado Federal' },
  { valor: 'deputado-estadual', rotulo: 'Deputado Estadual' },
];

// SELETOR DE TURNO (11/10/2026): mesmo padrão das abas da página (abaEstilo). O 1º turno é o padrão e
// não leva `turno` no endereço, então os links antigos continuam iguais. O 2º turno só tem presidente
// e governador (src/lib/turnos.js); se o cargo não existir nele, a página abre em presidente.
function SeletorTurno({ turno, cargo, visao = 'apuracao', turno2Travado = false }) {
  const base = visao === 'replay' ? '/candidatos-2026?visao=replay' : `/candidatos-2026?${visao === 'apuracao' ? 'visao=apuracao&' : ''}cargo=${cargo}`;
  return (
    <div style={{ marginBottom: '16px' }}>
      <EscolhaCompacta rotulo="Turno" valor={turno} opcoes={[
        { valor: 1, rotulo: '1º turno', href: base },
        { valor: 2, rotulo: '2º turno', href: `${base}&turno=2`, desabilitado: turno2Travado },
      ]} />
    </div>
  );
}

function PaginaApuracao({ cargo, ufInicial, turno }) {
  const hrefDe = (c) => `/candidatos-2026?visao=apuracao&cargo=${c}${turno === 2 ? '&turno=2' : ''}`;
  const cargosDoTurno = CARGOS_APURACAO.filter((c) => disponivelNoTurno(turno, c.valor, SEGUNDO_TURNO.ufs[0]));
  return (
    <div className="pagina">
      <Head>
        <title>Apuração 2026: resultados das eleições, seção por seção | Lume</title>
        <meta name="description" content="Resultado oficial da apuração das eleições de 2026, lido do TSE: seções apuradas, comparecimento, votos válidos, brancos, nulos e candidatos por votos. Atualiza sozinho." />
        <link rel="canonical" href="https://www.lumecidadao.com.br/candidatos-2026?visao=apuracao" />
      </Head>
      <h1 style={{ fontFamily: t.fonte.titulo, fontWeight: 600, fontSize: 'clamp(1.8rem,4vw,2.6rem)', margin: '0 0 10px' }}>
        Apuração 2026
      </h1>
      <p style={{ color: t.cor.cinza, margin: '0 0 16px', lineHeight: 1.5 }}>
        {turno === 2 ? 'Resultado oficial do 2º turno, em 25 de outubro, lido do TSE conforme as seções são apuradas.' : 'Resultado oficial das eleições de 4 de outubro, lido do TSE conforme as seções são apuradas.'} Só número e fonte.
      </p>
      <div className="so-celular">
        <AlternarVisao visao="apuracao" cargo={cargo} turno={turno} />
        <SeletorTurno turno={turno} cargo={cargo} />
      </div>
      <nav aria-label="Cargo" className="so-celular" style={{ marginBottom: '20px' }}>
        <EscolhaCompacta rotulo="Cargo" valor={cargo} opcoes={cargosDoTurno.map((c) => ({ ...c, href: hrefDe(c.valor) }))} />
      </nav>
      <BarraControleEleicoes visao="apuracao" turno={turno} cargo={cargo}
        hrefVisao={(v) => hrefEleicoes(v, cargo, turno)} hrefTurno={(n) => hrefEleicoes('apuracao', cargo, n)}
        cargos={cargosDoTurno.map((c) => ({ valor: c.valor, rotulo: c.rotulo, href: hrefDe(c.valor) }))} />
      <ApuracaoEleicao key={`${cargo}|${turno}`} cargo={cargo} ufInicial={ufInicial} turno={turno} />
      {/* Desceu para o fim da página (12/10/2026): ficava entre os filtros e os dados que eles filtram. */}
      <div style={{ marginTop: '24px' }}><ConferenciaUrnas /></div>
    </div>
  );
}

// REPLAY (22/10/2026, D-077): terceira visão de Eleições 2026 (?visao=replay). O 1º turno está aberto; o 2º turno aparece
// no seletor, mas só fica clicável a partir das 12h de 26/10/2026 (src/lib/replayLiberacao.js, checado no servidor).
// O replay do 2º turno em si só existe depois dos boletins de urna do 2º turno (D-073), então, mesmo liberado, a visão
// do 2º turno mostra um aviso e leva para a apuração ao vivo.
function PaginaReplay({ turno, liberado2t }) {
  const travado = !liberado2t;
  return (
    <div className="pagina">
      <Head>
        <title>Replay da apuração de 2026: veja as urnas chegarem, estado por estado | Lume</title>
        <meta name="description" content="Reveja a apuração do 1º turno de 2026 minuto a minuto: em que ordem as urnas chegaram ao TSE e como os votos foram sendo contados, estado por estado." />
        <link rel="canonical" href="https://www.lumecidadao.com.br/candidatos-2026?visao=replay" />
      </Head>
      <h1 style={{ fontFamily: t.fonte.titulo, fontWeight: 600, fontSize: 'clamp(1.8rem,4vw,2.6rem)', margin: '0 0 10px' }}>
        Replay da apuração {turno === 2 ? 'do 2º turno' : 'do 1º turno'} de 2026
      </h1>
      <div className="so-celular">
        <AlternarVisao visao="replay" cargo="presidente" />
        <SeletorTurno visao="replay" turno={turno} cargo="presidente" turno2Travado={travado} />
      </div>
      <BarraControleEleicoes visao="replay" turno={turno} cargo="presidente"
        hrefVisao={(v) => hrefEleicoes(v, 'presidente', 1)} hrefTurno={(n) => hrefEleicoes('replay', 'presidente', n)}
        turno2={{ desabilitado: travado, dica: TEXTO_LIBERA_2T }} />
      {travado && <p style={{ margin: '0 0 14px', color: t.cor.cinza, fontSize: '0.88rem' }}>{TEXTO_LIBERA_2T}</p>}
      {turno === 2
        ? (
          <section style={{ background: t.cor.papelCartao, borderRadius: t.raio.md, boxShadow: t.sombra.media, padding: '20px', color: t.cor.cinza, lineHeight: 1.5 }}>
            <p style={{ margin: '0 0 10px' }}>O replay do 2º turno é montado depois que o TSE publica os boletins de urna, alguns dias após a votação.</p>
            <Link href="/candidatos-2026?visao=apuracao&turno=2" style={abaEstilo(true)}>Ver a apuração do 2º turno</Link>
          </section>
        )
        : <ReplayApuracao />}
    </div>
  );
}

export default function Candidatos2026(props) {
  if (props.visao === 'replay') return <PaginaReplay turno={props.turno} liberado2t={props.liberado2t} />;
  if (props.visao === 'apuracao') return <PaginaApuracao cargo={props.cargo} ufInicial={props.ufInicial} turno={props.turno} />;
  if (props.turno === 2) return <PaginaCandidatosSegundoTurno {...props} />;
  return <PaginaCandidatos {...props} />;
}

// CANDIDATOS NO 2º TURNO (11/10/2026): só quem foi ao 2º turno. Presidente com o mesmo cartão da lista de
// sempre; governador, 2 por estado, agrupados por estado, com o mesmo cartão das outras listas. Quem é
// finalista vem do TSE (src/lib/finalistasTurno2.js) e o cruzamento com o banco fica em
// src/lib/candidatosSegundoTurno.js. Sem busca, filtro nem paginação: são 2 chapas e 12 candidatos.
function PaginaCandidatosSegundoTurno({ cargo, chapas, governadores, semCadastro, erro, totalGovernador }) {
  // Contagem vem do TSE (props.totalGovernador) e vale em qualquer aba; os cards só existem na aba Governador.
  const totalGov = totalGovernador != null ? totalGovernador : governadores.reduce((n, g) => n + g.itens.length, 0);
  const href = (c) => `/candidatos-2026?cargo=${c}&turno=2`;
  const avisoTse = (
    <p style={{ color: t.cor.alertaTexto, lineHeight: 1.5 }}>
      Não foi possível consultar o TSE agora para saber quem disputa o 2º turno. Tente de novo em alguns minutos. Você também pode consultar direto no{' '}
      <a href="https://resultados.tse.jus.br/" target="_blank" rel="noopener noreferrer" style={{ color: t.cor.ouroTexto, fontWeight: 700 }}>portal de resultados do TSE</a>.
    </p>
  );
  const nota = { margin: '0 0 12px', fontSize: '0.84rem', color: t.cor.cinza, lineHeight: 1.5 };
  return (
    <div className="pagina">
      <Head>
        <title>Candidatos do 2º turno 2026: Presidente e Governador | Lume</title>
        <meta name="description" content="Quem disputa o 2º turno das eleições de 2026, em 25 de outubro: candidatos a Presidente e a Governador (AC, AM, DF, ES, RN e TO), com partido, coligação e situação da candidatura, direto da fonte oficial (TSE)." />
        <link rel="canonical" href="https://www.lumecidadao.com.br/candidatos-2026" />
      </Head>
      <h1 style={{ fontFamily: t.fonte.titulo, fontWeight: 600, fontSize: 'clamp(1.8rem,4vw,2.6rem)', margin: '0 0 10px' }}>
        Candidatos 2026
      </h1>
      <p style={{ color: t.cor.cinza, margin: '0 0 16px', lineHeight: 1.5 }}>
        Quem disputa o 2º turno, em 25 de outubro: a Presidência e os governos de AC, AM, DF, ES, RN e TO. Só aparecem os dois candidatos de cada disputa. Dados oficiais do{' '}
        <a href="https://www.tse.jus.br/" target="_blank" rel="noopener noreferrer" style={{ color: t.cor.ouroTexto, fontWeight: 700 }}>TSE</a>, sem análise ou opinião.
      </p>
      <div style={{ margin: '-8px 0 18px' }}>
        <SeloAtualizacao fonte="ficha_presidenciaveis" tipo="ficha" nome="Presidente" semLink style={{ margin: '0 0 2px' }} />
        <SeloAtualizacao fonte="candidatos_governador" tipo="ficha" nome="Governador" style={{ margin: 0 }} />
      </div>
      <div className="so-celular">
        <AlternarVisao visao="candidatos" cargo={cargo} turno={2} />
        <SeletorTurno visao="candidatos" turno={2} cargo={cargo} />
        <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', flexWrap: 'wrap' }}>
          <Link href={href('presidente')} style={abaEstilo(cargo === 'presidente')}>Presidente (2)</Link>
          <Link href={href('governador')} style={abaEstilo(cargo === 'governador')}>Governador{erro ? '' : ` (${totalGov})`}</Link>
        </div>
      </div>
      <BarraControleEleicoes visao="candidatos" turno={2} cargo={cargo}
        hrefVisao={(v) => hrefEleicoes(v, cargo, 2)} hrefTurno={(n) => hrefEleicoes('candidatos', cargo, n)}
        cargos={[
          { valor: 'presidente', rotulo: 'Presidente (2)', href: href('presidente') },
          { valor: 'governador', rotulo: `Governador${erro ? '' : ` (${totalGov})`}`, href: href('governador') },
        ]} />

      {erro && avisoTse}

      {!erro && cargo === 'presidente' && (
        <>
          <ListaPresidente chapas={chapas} />
          {semCadastro > 0 && <p style={{ ...nota, marginTop: '12px' }}>{semCadastro === 1 ? '1 candidato do 2º turno ainda não tem ficha no Lume.' : `${semCadastro} candidatos do 2º turno ainda não têm ficha no Lume.`}</p>}
        </>
      )}

      {!erro && cargo === 'governador' && governadores.map((g) => (
        <section key={g.uf} style={{ marginBottom: '26px' }}>
          <h2 style={{ fontFamily: t.fonte.titulo, fontWeight: 600, fontSize: '1.25rem', margin: '0 0 10px' }}>{g.uf} · {NOMES_UF[g.uf] || g.uf}</h2>
          {g.falhou && <p style={{ color: t.cor.alertaTexto, lineHeight: 1.5, margin: 0 }}>Não foi possível saber agora quem disputa este governo. Tente de novo em alguns minutos.</p>}
          {!g.falhou && (
            <div className="grade-parl">
              {g.itens.map((d) => <CardCandidato key={d.id} d={d} hrefBase="/candidato-governador" votar />)}
            </div>
          )}
          {!g.falhou && g.semCadastro > 0 && <p style={{ ...nota, marginTop: '10px' }}>{g.semCadastro === 1 ? '1 candidato desta disputa ainda não tem ficha no Lume.' : `${g.semCadastro} candidatos desta disputa ainda não têm ficha no Lume.`}</p>}
        </section>
      ))}

      <p style={{ ...nota, marginTop: '20px', maxWidth: '75ch' }}>
        A lista de quem disputa o 2º turno é conferida no TSE a cada hora, então uma substituição de candidato aparece aqui sozinha. O resultado da votação está na aba Apuração.
      </p>
    </div>
  );
}

function PaginaCandidatos({ cargo, chapas, deputados, resumo, resumoSenado, resumoGoverno, filtros, pagina }) {
  const totalPresidente = chapas.length;
  // Contagem dos estaduais vem DEPOIS de a página abrir (/api/resumo-deputado-estadual): exige as
  // 26 listas do TSE. Enquanto não chega, ou se algum estado falhar, a aba fica sem número.
  const [resumoEstadual, setResumoEstadual] = useState({ total: null, porUf: {} });
  useEffect(() => {
    let vivo = true;
    fetch('/api/resumo-deputado-estadual')
      .then((r) => r.json())
      .then((d) => { if (vivo && d && d.completo) setResumoEstadual({ total: d.total, porUf: d.porUf || {} }); })
      .catch(() => {});
    return () => { vivo = false; };
  }, []);
  return (
    <div className="pagina">
      <Head>
        <title>Candidatos 2026: Presidente, Governador, Senador, Deputado Federal e Estadual | Lume</title>
        <meta name="description" content="Todos os candidatos à Presidência, aos governos estaduais, ao Senado, à Câmara dos Deputados e às Assembleias Legislativas em 2026: partido, coligação e situação da candidatura de cada um, sem análise ou opinião, direto da fonte oficial (TSE)." />
        <link rel="canonical" href="https://www.lumecidadao.com.br/candidatos-2026" />
      </Head>

      <h1 style={{ fontFamily: t.fonte.titulo, fontWeight: 600, fontSize: 'clamp(1.8rem,4vw,2.6rem)', margin: '0 0 10px' }}>
        Candidatos 2026
      </h1>
      <p style={{ color: t.cor.cinza, margin: '0 0 16px', lineHeight: 1.5 }}>
        Quem disputa a Presidência, os governos estaduais, o Senado, a Câmara dos Deputados e as Assembleias Legislativas em 2026: partido, coligação e a situação da candidatura de cada um(a). Dados oficiais do{' '}
        <a href="https://www.tse.jus.br/" target="_blank" rel="noopener noreferrer" style={{ color: t.cor.ouroTexto, fontWeight: 700 }}>TSE</a>, sem análise ou opinião, tire suas próprias conclusões com base nos dados.
      </p>
      {seloDoCargoCandidato(cargo) && <SeloAtualizacao {...seloDoCargoCandidato(cargo)} style={{ margin: '-8px 0 16px' }} />}

      <div className="so-celular">
        <AlternarVisao visao="candidatos" cargo={cargo} />
        <SeletorTurno visao="candidatos" turno={1} cargo={cargo} />
      </div>

      {/* Celular (27/09/2026): um campo de escolha no lugar das cinco pílulas, que ocupavam 4 linhas. */}
      <nav aria-label="Cargo" className="so-celular" style={{ marginBottom: '20px' }}>
        <EscolhaCompacta rotulo="Cargo" valor={cargo} opcoes={[
          { valor: 'presidente', rotulo: `Presidente (${totalPresidente})`, href: '/candidatos-2026?cargo=presidente' },
          { valor: 'senador', rotulo: `Senador (${(resumoSenado.total || 0).toLocaleString('pt-BR')})`, href: '/candidatos-2026?cargo=senador' },
          { valor: 'governador', rotulo: `Governador (${(resumoGoverno.total || 0).toLocaleString('pt-BR')})`, href: '/candidatos-2026?cargo=governador' },
          { valor: 'deputado-federal', rotulo: `Deputado Federal (${(resumo.total || 0).toLocaleString('pt-BR')})`, href: '/candidatos-2026?cargo=deputado-federal' },
          { valor: 'deputado-estadual', rotulo: `Deputado Estadual${resumoEstadual.total != null ? ` (${resumoEstadual.total.toLocaleString('pt-BR')})` : ''}`, href: '/candidatos-2026?cargo=deputado-estadual' },
        ]} />
      </nav>
      {/* Ordem pedida pelo Jordy em 25/09: Governador antes de Deputado Federal, e os dois legislativos da UF
          (federal e estadual) lado a lado no fim. Deputado Estadual fica sem contagem até o total chegar: a lista
          é lida do TSE por estado, e o total do país pede 27 consultas. */}
      <BarraControleEleicoes visao="candidatos" turno={1} cargo={cargo}
        hrefVisao={(v) => hrefEleicoes(v, cargo, 1)} hrefTurno={(n) => hrefEleicoes('candidatos', cargo, n)}
        cargos={[
          { valor: 'presidente', rotulo: `Presidente (${totalPresidente})`, href: '/candidatos-2026?cargo=presidente' },
          { valor: 'senador', rotulo: `Senador (${(resumoSenado.total || 0).toLocaleString('pt-BR')})`, href: '/candidatos-2026?cargo=senador' },
          { valor: 'governador', rotulo: `Governador (${(resumoGoverno.total || 0).toLocaleString('pt-BR')})`, href: '/candidatos-2026?cargo=governador' },
          { valor: 'deputado-federal', rotulo: `Dep. Federal (${(resumo.total || 0).toLocaleString('pt-BR')})`, href: '/candidatos-2026?cargo=deputado-federal' },
          { valor: 'deputado-estadual', rotulo: `Dep. Estadual${resumoEstadual.total != null ? ` (${resumoEstadual.total.toLocaleString('pt-BR')})` : ''}`, href: '/candidatos-2026?cargo=deputado-estadual' },
        ]} />

      {cargo === 'presidente' ? (
        <ListaPresidente chapas={chapas} />
      ) : (
        // key troca o componente inteiro ao mudar de aba: sem ela, o estado da busca de um cargo
        // vazaria para o outro, porque o React reaproveitaria o mesmo componente.
        <ListaDeputadoFederal key={cargo} cargo={cargo} dadosIniciais={deputados}
          resumo={cargo === 'senador' ? resumoSenado : cargo === 'governador' ? resumoGoverno : cargo === 'deputado-estadual' ? resumoEstadual : resumo}
          filtrosIniciais={filtros} paginaInicial={pagina} />
      )}
    </div>
  );
}

export async function getServerSideProps({ query, req }) {
  const cargo = ['deputado-federal', 'senador', 'governador', 'deputado-estadual'].includes(query.cargo) ? query.cargo : 'presidente';
  // APURAÇÃO (02/10/2026): não lê o banco. O resultado vem de /api/apuracao no navegador. O estado
  // abre pelo endereço, senão pela região aproximada de quem visita (cabeçalho da Vercel), senão SP.
  // REPLAY (22/10/2026, D-077): não lê o banco nem o TSE. Turno 2 antes da hora volta para o 1º turno.
  if (query.visao === 'replay') {
    const liberado2t = replayLiberado(2);
    const turno = turnoValido(query.turno) === 2 && liberado2t ? 2 : 1;
    return { props: { visao: 'replay', turno, liberado2t } };
  }
  if (query.visao === 'apuracao') {
    const pedida = String(query.uf || '').toUpperCase();
    const regiao = String(req.headers['x-vercel-ip-country-region'] || '').toUpperCase();
    const local = String(req.headers['x-vercel-ip-country'] || '').toUpperCase() === 'BR' && UFS.includes(regiao) ? regiao : '';
    // Turno inválido cai no 1º turno. No 2º, cargo fora de presidente/governador vira presidente, e o
    // estado precisa ser um dos que têm disputa (senão o primeiro da lista).
    const turno = turnoValido(query.turno) || 1;
    const cargoDoTurno = turno === 2 && !SEGUNDO_TURNO.cargos.includes(cargo) ? 'presidente' : cargo;
    const ufsDoTurno = turno === 2 ? SEGUNDO_TURNO.ufs : UFS;
    const ufInicial = ufsDoTurno.includes(pedida) ? pedida : (ufsDoTurno.includes(local) ? local : (turno === 2 ? ufsDoTurno[0] : 'SP'));
    return { props: { visao: 'apuracao', cargo: cargoDoTurno, ufInicial, turno } };
  }
  // 2º TURNO (11/10/2026): só presidente e governador, só quem foi ao 2º turno (src/lib/candidatosSegundoTurno.js).
  if ((turnoValido(query.turno) || 1) === 2) return { props: await carregarSegundoTurno(cargo) };
  const filtros = {
    uf: query.uf ? String(query.uf).toUpperCase().slice(0, 2) : '',
    partido: query.partido ? String(query.partido).toUpperCase() : '',
    busca: query.busca ? String(query.busca).slice(0, 80) : '',
    reeleicao: query.reeleicao === '1',
  };
  // DEPUTADO ESTADUAL abre JÁ com um estado (pedido do Jordy em 25/09): as outras abas abrem com
  // candidatos na tela, e esta abria vazia pedindo o estado. Ordem: o que veio no endereço; senão
  // o estado aproximado de quem visita, que a Vercel informa pelo IP no cabeçalho
  // x-vercel-ip-country-region (não guardamos nada); senão SP, o maior colégio eleitoral.
  // A tela diz qual estado está mostrando e o seletor continua ali para trocar.
  if (query.cargo === 'deputado-estadual' && !filtros.uf) {
    const pais = String(req.headers['x-vercel-ip-country'] || '').toUpperCase();
    const regiao = String(req.headers['x-vercel-ip-country-region'] || '').toUpperCase();
    const porLocal = pais === 'BR' && UFS_ESTADUAL.includes(regiao);
    filtros.uf = porLocal ? regiao : 'SP';
    filtros.ufPadrao = porLocal ? 'local' : 'sp';
  }
  const pagina = Math.max(1, parseInt(query.pagina, 10) || 1);

  const [chapas, resumo, resumoSenado, resumoGoverno] = await Promise.all([
    ServicoAPI.listarPresidenciaveis(2026).catch(() => []),
    ServicoAPI.resumoCandidatosDeputadoFederal(2026).catch(() => ({ total: 0, porUf: {} })),
    ServicoAPI.resumoCandidatosSenador(2026).catch(() => ({ total: 0, porUf: {} })),
    ServicoAPI.resumoCandidatosGovernador(2026).catch(() => ({ total: 0, porUf: {} })),
  ]);

  let deputados = { itens: [], total: 0 };
  if (cargo === 'senador') {
    deputados = await ServicoAPI.listarCandidatosSenador({
      ano: 2026, uf: filtros.uf || null, busca: filtros.busca || null, pagina, porPagina: PORPAGINA,
    }).catch(() => ({ itens: [], total: 0 }));
  } else if (cargo === 'governador') {
    deputados = await ServicoAPI.listarCandidatosGovernador({
      ano: 2026, uf: filtros.uf || null, busca: filtros.busca || null, pagina, porPagina: PORPAGINA,
    }).catch(() => ({ itens: [], total: 0 }));
  } else if (cargo === 'deputado-estadual') {
    // Lido do TSE na hora (src/lib/candidatosEstaduais.js). A primeira página já vem no HTML;
    // se a fonte falhar, a tela diz que falhou em vez de mostrar zero.
    deputados = await listarCandidatosEstaduais({
      uf: filtros.uf, busca: filtros.busca, pagina, porPagina: PORPAGINA,
    }).catch(() => ({ itens: [], total: 0, erro: 'Não foi possível consultar o TSE agora. Tente de novo em alguns minutos.' }));
  } else if (cargo === 'deputado-federal') {
    deputados = await ServicoAPI.listarCandidatosDeputadoFederal({
      ano: 2026, uf: filtros.uf || null, partido: filtros.partido || null,
      busca: filtros.busca || null, reeleicao: filtros.reeleicao, pagina, porPagina: PORPAGINA,
    }).catch(() => ({ itens: [], total: 0 }));
  }
  const totalPaginas = Math.max(1, Math.ceil((deputados.total || 0) / PORPAGINA));

  return {
    props: {
      cargo,
      chapas: JSON.parse(JSON.stringify(chapas)),
      deputados: JSON.parse(JSON.stringify(deputados)),
      resumo: JSON.parse(JSON.stringify(resumo)),
      resumoSenado: JSON.parse(JSON.stringify(resumoSenado)),
      resumoGoverno: JSON.parse(JSON.stringify(resumoGoverno)),
      filtros,
      pagina,
      totalPaginas,
    },
  };
}
