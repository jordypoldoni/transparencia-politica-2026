import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import Avatar from '../components/Avatar';
import CampoSelect from '../components/CampoSelect';
import CampoBusca from '../components/CampoBusca';
import BotaoFavorito from '../components/BotaoFavorito';
import NavPraVoce from '../components/NavPraVoce';
import { t } from '../src/estilo/tokens';
import { NOMES_UF } from '../src/lib/cotas';
import { PERGUNTAS_AFINIDADE } from '../src/lib/perguntasAfinidade';
import { MIN_COMPARAVEIS, ordenarPorConcordancia } from '../src/lib/afinidade/nucleo';
import { faixaCoesao } from '../src/lib/afinidade/partidos';
import { CASAS_AFINIDADE } from '../src/lib/afinidade/casas';
import { lerRespostasLocais, salvarResposta, EVENTO_RESPOSTAS, ufLocal, definirUf, EVENTO_UF } from '../src/lib/perfilUsuario';

// QUEM VOTA COMO VOCÊ (26/09/2026). Caminho principal do questionário de afinidade, SEM IA:
// a pessoa responde votações que já aconteceram e o resultado sai do voto registrado de cada
// parlamentar (src/lib/afinidade/, pelas rotas /api/afinidade/parlamentares e /candidatos).
//
// Pedidos do Jordy na primeira revisão (26/09):
// - respostas em PÍLULAS no padrão do site (as de /deputados e da página Pra você), com a sombra
//   e o hover padrão; no cartão branco, a pílula inativa usa o papel quente, porque branco sobre
//   branco não aparecia. (Um segmented control foi tentado e recusado em 26/09: não é o padrão
//   do site para separar opções nessas telas.);
// - "Entender esta votação" em cada pergunta, para quem nunca ouviu falar do assunto;
// - resultado separado por cargo, como nas outras páginas, com busca por nome, partido e número;
// - voltar da ficha de um candidato devolve tudo como estava: respostas, cargo, busca, resultado
//   e a posição da rolagem (sessionStorage, que vale só para esta aba).

const UFS = ['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'];
const CASA = { senado: 'no Senado', camara: 'na Câmara', alergs: 'na Assembleia do RS' };
const MES = ['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez'];
const quando = (iso) => { const [a, m] = String(iso).split('-'); return `${MES[Number(m) - 1]}/${a}`; };
const ROTULO = { a_favor: 'a favor', contra: 'contra', sem_opiniao: 'sem opinião' };
const OPCOES_RESPOSTA = [
  { valor: 'a_favor', rotulo: 'A favor' },
  { valor: 'contra', rotulo: 'Contra' },
  { valor: 'sem_opiniao', rotulo: 'Sem opinião' },
];
// Mesma ordem das abas de /candidatos-2026.
const CARGOS = [
  { valor: 'senador', rotulo: 'Senador' },
  { valor: 'governador', rotulo: 'Governador' },
  { valor: 'deputado-federal', rotulo: 'Deputado Federal' },
  { valor: 'deputado-estadual', rotulo: 'Deputado Estadual' },
];
const CHAVE_TELA = 'lume:afinidade:tela';
const semAcento = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

// PÍLULA PADRÃO DO SITE (a de /deputados, "Federais · Estaduais"): pílula, sem borda, ativa em
// índigo com texto âmbar, sombra de clicável que cresce no hover. `noCartao`: a inativa vai em
// papelQuente2, porque dentro de um cartão branco a pílula branca some (pedido do Jordy, 26/09).
const pilula = (ativa, noCartao = false) => ({
  padding: '10px 20px', fontSize: '0.9rem', fontWeight: 700, fontFamily: t.fonte.corpo,
  borderRadius: t.raio.pill, cursor: 'pointer', border: 'none', whiteSpace: 'nowrap',
  background: ativa ? t.cor.verde : (noCartao ? t.cor.papelQuente2 : '#fff'), color: ativa ? t.cor.ouro : t.cor.tinta,
  boxShadow: t.sombra.botao, transition: 'box-shadow .15s, transform .15s',
});
const caixa = { background: t.cor.papelCartao, borderRadius: t.raio.md, padding: 'clamp(16px,3vw,22px)', boxShadow: t.sombra.sutil };
const botaoPadrao = (desligado) => ({
  padding: '12px 24px', fontSize: '0.95rem', fontWeight: 700, fontFamily: t.fonte.corpo, border: 'none',
  borderRadius: t.raio.pill, background: t.cor.verde, color: t.cor.ouro,
  boxShadow: desligado ? 'none' : t.sombra.botao, opacity: desligado ? 0.45 : 1,
  cursor: desligado ? 'not-allowed' : 'pointer', transition: 'box-shadow .15s, transform .15s',
});
const realce = (e, ligar) => {
  if (e.currentTarget.disabled) return;
  e.currentTarget.style.boxShadow = ligar ? t.sombra.botaoHover : t.sombra.botao;
  e.currentTarget.style.transform = ligar ? 'translateY(-1px)' : 'none';
};

function Entenda({ p }) {
  const e = p.explicacao;
  const titulo = { margin: '12px 0 4px', fontSize: '0.78rem', fontWeight: 800, letterSpacing: '0.04em', textTransform: 'uppercase', color: t.cor.tinta };
  const texto = { margin: 0, fontSize: '0.9rem', color: t.cor.tinta, lineHeight: 1.6 };
  return (
    <details style={{ marginBottom: '14px' }}>
      <summary style={{ cursor: 'pointer', fontSize: '0.86rem', fontWeight: 700, color: t.cor.ouroTexto }}>Entender esta votação</summary>
      <div style={{ background: t.cor.papelQuente, borderRadius: t.raio.sm, padding: '4px 16px 14px', marginTop: '10px' }}>
        <p style={titulo}>O que é</p>
        <p style={texto}>{e.oque}</p>
        <p style={titulo}>Na prática</p>
        <p style={texto}>{e.pratica}</p>
        <p style={titulo}>Quem votou a favor dizia que</p>
        <p style={texto}>{e.aFavor}</p>
        <p style={titulo}>Quem votou contra dizia que</p>
        <p style={texto}>{e.contra}</p>
      </div>
    </details>
  );
}

// PERGUNTA RESPONDIDA FICA RECOLHIDA (27/09/2026, pedido do Jordy: "mostrando apenas a opção
// escolhida"). Com 10 a 14 perguntas, a página virava uma parede, e quem voltava para ver o
// resultado rolava por tudo de novo. Respondida = cartão curto com a pergunta e a resposta;
// "Mudar resposta" abre o cartão inteiro. Ao responder num cartão aberto, ele recolhe e o foco vai
// para o "Mudar resposta" dele, para quem usa teclado ou leitor de tela não se perder.
function Pergunta({ p, resposta, aoResponder, aberta, aoAbrir, focarMudar }) {
  const mudarRef = useRef(null);
  const recolhida = Boolean(resposta) && !aberta;
  useEffect(() => { if (recolhida && focarMudar) mudarRef.current?.focus(); }, [recolhida, focarMudar]);
  const titulo = <p style={{ margin: '0 0 8px', fontSize: '1.02rem', fontWeight: 700, color: t.cor.tinta, lineHeight: 1.4 }}>Você é a favor de {p.texto.charAt(0).toLowerCase() + p.texto.slice(1)}?</p>;
  const tema = <p style={{ margin: '0 0 6px', fontSize: '0.72rem', fontWeight: 800, letterSpacing: '0.05em', textTransform: 'uppercase', color: t.cor.ouroTexto }}>{p.tema}</p>;
  if (recolhida) {
    const rotulo = OPCOES_RESPOSTA.find((o) => o.valor === resposta)?.rotulo || resposta;
    return (
      <div style={{ ...caixa, marginBottom: '12px' }}>
        {tema}
        {titulo}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.86rem', color: t.cor.cinza }}>Sua resposta:</span>
          {/* A resposta no mesmo visual da pílula ativa, mas sem ser botão (não se clica nela). */}
          <span style={{ ...pilula(true, true), cursor: 'default', boxShadow: 'none', padding: '7px 16px', fontSize: '0.86rem' }}>{rotulo}</span>
          <button ref={mudarRef} type="button" aria-expanded="false" onClick={() => aoAbrir(p.id)}
            style={{ ...pilula(false, true), padding: '7px 16px', fontSize: '0.86rem' }} onMouseOver={(e) => realce(e, true)} onMouseOut={(e) => realce(e, false)}>
            Mudar resposta
          </button>
        </div>
      </div>
    );
  }
  return (
    <div style={{ ...caixa, marginBottom: '12px' }}>
      {tema}
      {titulo}
      <p style={{ margin: '0 0 10px', fontSize: '0.8rem', color: t.cor.cinza, lineHeight: 1.5 }}>
        {p.proposta}. Votada{' '}
        {p.votacoes.map((v, i) => (
          <span key={v.id}>
            {i > 0 && (i === p.votacoes.length - 1 ? ' e ' : ', ')}
            {CASA[v.casa]} em {quando(v.data)} (<Link href={`/votacao/${v.id}`} style={{ color: t.cor.ouroTexto, fontWeight: 700 }}>ver como cada um votou</Link>)
          </span>
        ))}.
      </p>
      <Entenda p={p} />
      <div role="radiogroup" aria-label="Sua posição" style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
        {OPCOES_RESPOSTA.map((o) => (
          <button key={o.valor} type="button" role="radio" aria-checked={resposta === o.valor} onClick={() => aoResponder(p.id, o.valor)}
            style={pilula(resposta === o.valor, true)} onMouseOver={(e) => realce(e, true)} onMouseOut={(e) => realce(e, false)}>
            {o.rotulo}
          </button>
        ))}
      </div>
    </div>
  );
}

// PLACAR (26/09/2026, pedido do Jordy). Antes o cartão dizia "Votou como você em 1 de 6
// votações", e quem respondeu 10 perguntas não entendia de onde vinha o 6. Agora há UMA CASA POR
// PERGUNTA RESPONDIDA, na ordem do questionário:
//   âmbar escuro = mesma posição · índigo = posição diferente · vazia = sem voto (ou, no partido,
//   sem maioria). A legenda embaixo repete tudo em texto, com o total de casas batendo com o
//   número de respostas, então a cor nunca é a única pista (WCAG 1.4.1).
// O âmbar é o #CC7A22 (3,29:1 contra o branco), não o #FF8A00 (2,36:1), para a casa aparecer.
const ORDEM_PERGUNTA = Object.fromEntries(PERGUNTAS_AFINIDADE.map((p, i) => [p.id, i]));
const emOrdem = (itens) => [...(itens || [])].sort((a, b) => (ORDEM_PERGUNTA[a.pergunta_id] ?? 99) - (ORDEM_PERGUNTA[b.pergunta_id] ?? 99));
const COR_CASA = { igual: '#CC7A22', diferente: t.cor.verde, sem: t.cor.papelQuente2 };
function Placar({ itens, campo }) {
  const casas = emOrdem(itens).map((d) => {
    const deles = campo === 'votou' ? d.votou : (d.maioria === 'dividido' ? null : d.maioria);
    return { id: d.pergunta_id, tipo: !deles ? 'sem' : deles === d.voce ? 'igual' : 'diferente' };
  });
  const n = (tipo) => casas.filter((c) => c.tipo === tipo).length;
  const semRotulo = campo === 'votou' ? 'sem voto' : 'sem maioria';
  const Ponto = ({ tipo }) => (
    <span aria-hidden="true" style={{ display: 'inline-block', width: '9px', height: '9px', borderRadius: '50%', background: COR_CASA[tipo],
      boxShadow: tipo === 'sem' ? 'inset 0 0 0 1px #B9AE9E' : 'none', marginRight: '5px', verticalAlign: '0' }} />
  );
  return (
    <div style={{ marginTop: '12px' }}>
      <div aria-hidden="true" style={{ display: 'flex', gap: '4px' }}>
        {casas.map((c) => (
          <span key={c.id} style={{ flex: 1, height: '10px', borderRadius: t.raio.pill, background: COR_CASA[c.tipo],
            boxShadow: c.tipo === 'sem' ? 'inset 0 0 0 1px #D9CFC0' : 'none' }} />
        ))}
      </div>
      <p style={{ margin: '8px 0 0', fontSize: '0.86rem', color: t.cor.tinta, display: 'flex', flexWrap: 'wrap', columnGap: '14px', rowGap: '2px' }}>
        <span><Ponto tipo="igual" /><strong>{n('igual')} {n('igual') === 1 ? 'igual' : 'iguais'}</strong></span>
        <span><Ponto tipo="diferente" />{n('diferente')} {n('diferente') === 1 ? 'diferente' : 'diferentes'}</span>
        <span style={{ color: t.cor.cinza }}><Ponto tipo="sem" />{n('sem')} {semRotulo}</span>
      </p>
    </div>
  );
}

// VOTO A VOTO (26/09, segunda versão, pedido do Jordy): cada votação no seu próprio bloco, com
// a pergunta em cima e, cada uma na sua linha, a posição da pessoa e a do parlamentar (ou da
// maioria do partido). A etiqueta à direita diz só se coincidiu, sem cor de certo ou errado:
// divergir de alguém não é erro de ninguém.
function Detalhes({ itens, campo }) {
  const texto = (pid) => PERGUNTAS_AFINIDADE.find((p) => p.id === pid)?.texto || pid;
  // Rótulo e valor COLADOS ("Você: contra"). Com o rótulo em coluna de largura fixa, a resposta
  // ficava longe do "Você" e a relação entre os dois se perdia (Jordy, 26/09).
  const Rotulo = ({ children }) => <span style={{ color: t.cor.cinza }}>{children}: </span>;
  const Valor = ({ children }) => <strong style={{ color: t.cor.tinta }}>{children}</strong>;
  return (
    <div style={{ display: 'grid', gap: '8px', marginTop: '10px' }}>
      {emOrdem(itens).map((d) => {
        const deles = campo === 'votou' ? d.votou : (d.maioria === 'dividido' ? null : d.maioria);
        const etiqueta = !deles ? null : deles === d.voce ? 'mesma posição' : 'posição diferente';
        return (
          <div key={d.pergunta_id} style={{ background: t.cor.papelQuente, borderRadius: t.raio.sm, padding: '10px 12px', fontSize: '0.82rem', lineHeight: 1.5 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', alignItems: 'flex-start', marginBottom: '6px' }}>
              <span style={{ color: t.cor.tinta, fontWeight: 600 }}>{texto(d.pergunta_id)}</span>
              {etiqueta && (
                <span style={{ flexShrink: 0, fontSize: '0.7rem', fontWeight: 800, padding: '3px 10px', borderRadius: t.raio.pill, background: '#fff', color: t.cor.tinta, whiteSpace: 'nowrap' }}>{etiqueta}</span>
              )}
            </div>
            <div><Rotulo>Você</Rotulo><Valor>{ROTULO[d.voce]}</Valor></div>
            <div>
              {campo === 'votou' ? (
                <><Rotulo>Parlamentar votou</Rotulo>{d.votou ? <><Valor>{ROTULO[d.votou]}</Valor> <span style={{ color: t.cor.cinza }}>{CASA[d.casa]}</span></> : <span style={{ color: t.cor.cinza }}>não votou Sim nem Não nessa votação</span>}</>
              ) : (
                <><Rotulo>Maioria do partido</Rotulo>{d.maioria === 'dividido'
                  ? <span style={{ color: t.cor.cinza }}>dividida ({d.placar.a_favor} a favor, {d.placar.contra} contra)</span>
                  : d.maioria ? <><Valor>{ROTULO[d.maioria]}</Valor> <span style={{ color: t.cor.cinza }}>({d.placar.a_favor} a favor, {d.placar.contra} contra)</span></>
                    : <span style={{ color: t.cor.cinza }}>nenhum atual membro votou</span>}</>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// Os cartões ficam numa grade com alignItems 'start': sem isso, abrir o "Ver voto a voto" de um
// esticava os vizinhos da mesma linha, e parecia que todos tinham aberto (visto pelo Jordy, 26/09).
// Cartão de uma pessoa com a comparação. Usado pelos dois módulos: parlamentares (voto real) e
// candidatos. O que muda entre eles vem por props: a linha de baixo do nome, o tipo do favorito e
// o texto de quem não tem voto.
function CartaoComparacao({ c, subtitulo, tipoFavorito, detalheFavorito, semVoto }) {
  return (
    <div style={caixa}>
      <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
        <Avatar nome={c.nome_urna} foto={c.foto_url} size={44} />
        <div style={{ minWidth: 0, flex: 1 }}>
          <Link href={c.href} style={{ color: t.cor.tinta, fontWeight: 700, textDecoration: 'none' }}>{c.nome_urna}</Link>
          <p style={{ margin: '2px 0 0', fontSize: '0.78rem', color: t.cor.cinza }}>{subtitulo}</p>
        </div>
        <BotaoFavorito tipo={tipoFavorito} chave={c.href} rotulo={c.nome_urna} detalhe={detalheFavorito} foto={c.foto_url} />
      </div>
      {c.comparaveis > 0 ? (
        <>
          <Placar itens={c.detalhes} campo="votou" />
          <details style={{ marginTop: '8px' }}>
            <summary style={{ cursor: 'pointer', fontSize: '0.8rem', fontWeight: 700, color: t.cor.ouroTexto }}>Ver voto a voto</summary>
            <Detalhes itens={c.detalhes} campo="votou" />
          </details>
        </>
      ) : (
        <p style={{ margin: '12px 0 0', fontSize: '0.84rem', color: t.cor.cinza, lineHeight: 1.5 }}>{semVoto}</p>
      )}
    </div>
  );
}

// MÓDULO 1: PARLAMENTARES EM EXERCÍCIO (27/09/2026, pedido do Jordy: "uma coisa para cada coisa").
// Só fatos: o voto registrado de quem HOJE tem mandato pelo estado escolhido. Candidatos de 2026
// ficam na outra aba, com a lógica deles.
const grade = { display: 'grid', gap: '10px', alignItems: 'start', gridTemplateColumns: 'repeat(auto-fill, minmax(min(320px, 100%), 1fr))' };

function ResultadoParlamentares({ r, casa, setCasa, busca, setBusca }) {
  const cfg = CASAS_AFINIDADE.find((c) => c.id === casa) || CASAS_AFINIDADE[0];
  const grupo = r.casas[cfg.id] || { lista: [] };
  const votaram = grupo.lista.filter((c) => c.comparaveis > 0);
  const termo = semAcento(busca.trim());
  const filtrados = termo ? grupo.lista.filter((c) => semAcento(c.nome_urna).includes(termo) || semAcento(c.partido_sigla) === termo) : votaram;
  const bastante = filtrados.filter((c) => c.comparaveis >= MIN_COMPARAVEIS || c.comparaveis === 0);
  const poucos = filtrados.filter((c) => c.comparaveis > 0 && c.comparaveis < MIN_COMPARAVEIS);
  const cartao = (c) => (
    <CartaoComparacao key={c.href} c={c} tipoFavorito="parlamentar"
      subtitulo={`${cfg.singular} · ${c.partido_sigla || 'sem partido'} · ${r.uf}`}
      detalheFavorito={[cfg.singular, c.partido_sigla, r.uf].filter(Boolean).join(' · ')}
      semVoto="Não votou nenhuma das votações que você respondeu: ou não tinha mandato na época, ou faltou, ou se absteve." />
  );
  return (
    <div>
      <p style={{ color: t.cor.cinza, fontSize: '0.88rem', lineHeight: 1.5, margin: '0 0 14px', maxWidth: '75ch' }}>
        Quem hoje tem mandato pelo {r.uf}, comparado pelo <strong style={{ color: t.cor.tinta }}>voto registrado</strong> em cada votação.
        Cada cartão tem uma casa por pergunta que você respondeu. <strong style={{ color: t.cor.tinta }}>Sem voto</strong> quer dizer que a
        proposta não passou pela casa onde a pessoa estava, ou que ela faltou, se absteve ou ainda não tinha mandato. Isso não conta
        nem a favor nem contra.
      </p>
      <div role="tablist" aria-label="Casa" style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '12px' }}>
        {CASAS_AFINIDADE.map((c) => {
          const g = r.casas[c.id] || { lista: [] };
          const n = g.semDados ? null : g.lista.filter((x) => x.comparaveis > 0).length;
          return (
            <button key={c.id} type="button" role="tab" aria-selected={casa === c.id} onClick={() => { setCasa(c.id); setBusca(''); }}
              style={pilula(casa === c.id)} onMouseOver={(e) => realce(e, true)} onMouseOut={(e) => realce(e, false)}>
              {c.rotulo}{n != null ? ` (${n})` : ''}
            </button>
          );
        })}
      </div>
      {grupo.semDados ? (
        <p style={{ ...caixa, background: t.cor.papelQuente, boxShadow: 'none', color: t.cor.tinta, fontSize: '0.9rem', lineHeight: 1.6, maxWidth: '75ch' }}>
          A Assembleia Legislativa do {r.uf} não publica como cada deputado estadual votou, ou o site ainda não coleta esses votos.
          Sem o voto registrado não há como comparar. Hoje o site tem os votos da Assembleia do RS.
        </p>
      ) : (
        <>
          <div style={{ maxWidth: '520px', marginBottom: '12px' }}>
            <CampoBusca valor={busca} aoMudar={setBusca} placeholder="Buscar por nome ou partido…" aoLabel={`Buscar ${cfg.rotulo.toLowerCase()}`} />
          </div>
          <p style={{ color: t.cor.cinza, fontSize: '0.84rem', margin: '0 0 14px' }}>
            {termo
              ? `${filtrados.length} ${filtrados.length === 1 ? 'encontrado' : 'encontrados'}.`
              : `${votaram.length} de ${grupo.lista.length} ${cfg.rotulo.toLowerCase()} do ${r.uf} votaram ao menos uma das suas respostas.${grupo.lista.length > votaram.length ? ' Para conferir alguém que não aparece, busque pelo nome.' : ''}`}
          </p>
          {filtrados.length === 0 ? (
            <p style={{ color: t.cor.cinza }}>{termo ? 'Ninguém com essa busca.' : 'Ninguém desta casa votou as propostas que você respondeu.'}</p>
          ) : (
            <>
              {bastante.length > 0 && <div style={grade}>{bastante.map(cartao)}</div>}
              {poucos.length > 0 && (
                <>
                  <h3 style={{ fontFamily: t.fonte.corpo, fontSize: '1rem', fontWeight: 800, margin: '26px 0 4px', color: t.cor.tinta }}>Votaram poucas dessas propostas</h3>
                  <p style={{ color: t.cor.cinza, fontSize: '0.84rem', lineHeight: 1.5, margin: '0 0 12px', maxWidth: '75ch' }}>
                    Menos de {MIN_COMPARAVEIS} das suas respostas têm voto dessas pessoas. Com tão poucos votos, a comparação diz pouco sobre elas.
                  </p>
                  <div style={grade}>{poucos.map(cartao)}</div>
                </>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}

// MÓDULO 2: CANDIDATOS 2026 (refeito em 27/09/2026, pedido do Jordy). Quase nenhum candidato
// votou essas propostas, então a comparação é com o PARTIDO, e a tela é AGRUPADA POR PARTIDO:
// um cartão por partido, com a estimativa (placar da maioria + coesão) em cima e os candidatos
// daquele cargo embaixo. Quem hoje tem mandato pelo estado ganha o selo "Tem mandato: ver voto
// real", que leva à aba de parlamentares já buscando o nome (o voto real mora no módulo 1).
const MOSTRAR_POR_PARTIDO = 5;
const MIN_MEMBROS = 3;

function LinhaCandidato({ c, sigla, cargoRotulo, aoVerVotoReal }) {
  return (
    <li style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
      <Avatar nome={c.nome_urna} foto={c.foto_url} size={36} />
      <div style={{ minWidth: 0, flex: 1 }}>
        <Link href={c.href} style={{ color: t.cor.tinta, fontWeight: 700, textDecoration: 'none', fontSize: '0.92rem', overflowWrap: 'anywhere' }}>{c.nome_urna}</Link>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 10px', alignItems: 'center', marginTop: '3px', fontSize: '0.78rem', color: t.cor.cinza }}>
          {c.nr_candidato && <span>nº {c.nr_candidato}</span>}
          {c.mandato && (
            <button type="button" onClick={() => aoVerVotoReal(c.mandato)} onMouseOver={(e) => realce(e, true)} onMouseOut={(e) => realce(e, false)}
              style={{ padding: '5px 12px', minHeight: '26px', fontSize: '0.74rem', fontWeight: 700, fontFamily: t.fonte.corpo, border: 'none', borderRadius: t.raio.pill,
                background: t.cor.verde, color: t.cor.ouro, cursor: 'pointer', boxShadow: t.sombra.botao, transition: 'box-shadow .15s, transform .15s' }}>
              Tem mandato: ver voto real
            </button>
          )}
        </div>
      </div>
      <BotaoFavorito tipo="candidato" chave={c.href} rotulo={c.nome_urna} detalhe={[`Candidato(a) a ${cargoRotulo}`, sigla].join(' · ')} foto={c.foto_url} />
    </li>
  );
}

// Uma frase sobre o quanto a estimativa vale. Base pequena vem antes da coesão: com 1 ou 2
// parlamentares, "100% com a maioria" é só o voto de uma pessoa.
function Coesao({ p }) {
  const estilo = { margin: '10px 0 0', fontSize: '0.84rem', color: t.cor.tinta, lineHeight: 1.5 };
  if (p.membros < MIN_MEMBROS) {
    return <p style={estilo}><strong>Base pequena:</strong> só {p.membros} {p.membros === 1 ? 'parlamentar de hoje do partido votou' : 'parlamentares de hoje do partido votaram'} essas propostas.</p>;
  }
  return (
    <p style={estilo}>
      <strong>{faixaCoesao(p.coesao)}:</strong> em média, {Math.round(p.coesao * 100)}% dos {p.membros} parlamentares de hoje do partido votaram com a maioria.
    </p>
  );
}

function CartaoPartido({ g, p, cargoRotulo, filtrado, aoVerVotoReal }) {
  const [todos, setTodos] = useState(false);
  const visiveis = todos || filtrado ? g.candidatos : g.candidatos.slice(0, MOSTRAR_POR_PARTIDO);
  const n = g.candidatos.length;
  return (
    <div style={caixa}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px' }}>
        <div style={{ minWidth: 0 }}>
          <p style={{ margin: 0, fontWeight: 800, fontSize: '1.05rem', color: t.cor.tinta }}>{g.sigla}</p>
          <p style={{ margin: '2px 0 0', fontSize: '0.78rem', color: t.cor.cinza }}>
            {filtrado ? `${n} ${n === 1 ? 'candidato encontrado' : 'candidatos encontrados'}` : `${n} ${n === 1 ? 'candidato' : 'candidatos'} a ${cargoRotulo}`}
          </p>
        </div>
        <BotaoFavorito tipo="partido" chave={g.sigla} rotulo={g.sigla} detalhe="Partido" />
      </div>
      {p && p.membros > 0 ? (
        <>
          <Placar itens={p.detalhes} campo="maioria" />
          <Coesao p={p} />
          <details style={{ marginTop: '8px' }}>
            <summary style={{ cursor: 'pointer', fontSize: '0.8rem', fontWeight: 700, color: t.cor.ouroTexto }}>Ver voto a voto do partido</summary>
            <Detalhes itens={p.detalhes} campo="maioria" />
          </details>
        </>
      ) : (
        <p style={{ margin: '12px 0 0', fontSize: '0.84rem', color: t.cor.cinza, lineHeight: 1.5 }}>
          Nenhum parlamentar que hoje está no partido votou as propostas que você respondeu. Sem estimativa.
        </p>
      )}
      {/* Rótulo entre a estimativa (do partido) e a lista (das pessoas): são coisas de natureza
          diferente no mesmo cartão, e sem ele a lista parecia continuação do placar. */}
      <p style={{ margin: '18px 0 10px', fontSize: '0.72rem', fontWeight: 800, letterSpacing: '0.05em', textTransform: 'uppercase', color: t.cor.ouroTexto }}>
        {filtrado ? 'Encontrados' : `Candidatos do ${g.sigla}`}
      </p>
      <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: '12px' }}>
        {visiveis.map((c) => <LinhaCandidato key={c.href} c={c} sigla={g.sigla} cargoRotulo={cargoRotulo} aoVerVotoReal={aoVerVotoReal} />)}
      </ul>
      {!todos && !filtrado && n > MOSTRAR_POR_PARTIDO && (
        <button type="button" onClick={() => setTodos(true)} onMouseOver={(e) => realce(e, true)} onMouseOut={(e) => realce(e, false)}
          style={{ ...pilula(false, true), marginTop: '14px', padding: '8px 16px', fontSize: '0.84rem' }}>
          Ver todos os {n} candidatos
        </button>
      )}
    </div>
  );
}

function avisoEstadual(uf, indisponivel) {
  if (indisponivel) return 'Não foi possível consultar o TSE agora para listar os candidatos a deputado estadual. Tente de novo em instantes.';
  if (uf === 'DF') return 'No Distrito Federal o cargo é o de deputado distrital, que ainda não está no site.';
  return `Para deputado estadual, a estimativa usa sobretudo votos do Congresso${uf === 'RS' ? ' (e as cinco votações da Assembleia do RS)' : ''}. Na Assembleia, o mesmo partido pode votar diferente.`;
}

function ResultadoCandidatos({ r, cargo, setCargo, busca, setBusca, aoVerVotoReal }) {
  const grupos = r.cargos[cargo] || [];
  const rotuloCargo = CARGOS.find((c) => c.valor === cargo)?.rotulo || '';
  const termo = semAcento(busca.trim());
  const bate = (c) => (/^\d+$/.test(termo) ? String(c.nr_candidato || '').startsWith(termo) : semAcento(c.nome_urna).includes(termo));
  // Busca pela sigla mostra o partido inteiro; por nome ou número, só quem bate, dentro do partido.
  const visiveis = termo
    ? grupos.map((g) => (semAcento(g.sigla) === termo ? g : { ...g, candidatos: g.candidatos.filter(bate), filtrado: true })).filter((g) => g.candidatos.length)
    : grupos;
  const est = (g) => r.partidos[g.sigla];
  const porConcordancia = (a, b) => ordenarPorConcordancia(est(a), est(b)) || a.sigla.localeCompare(b.sigla, 'pt-BR');
  const comEstimativa = visiveis.filter((g) => est(g)?.comparaveis >= MIN_COMPARAVEIS).sort(porConcordancia);
  const poucas = visiveis.filter((g) => est(g)?.comparaveis > 0 && est(g).comparaveis < MIN_COMPARAVEIS).sort(porConcordancia);
  const sem = visiveis.filter((g) => !(est(g)?.comparaveis > 0)).sort((a, b) => a.sigla.localeCompare(b.sigla, 'pt-BR'));
  const nCandidatos = visiveis.reduce((s, g) => s + g.candidatos.length, 0);
  const cartao = (g) => <CartaoPartido key={g.sigla} g={g} p={est(g)} cargoRotulo={rotuloCargo} filtrado={!!g.filtrado} aoVerVotoReal={aoVerVotoReal} />;
  const subtitulo = { fontFamily: t.fonte.corpo, fontSize: '1rem', fontWeight: 800, margin: '26px 0 4px', color: t.cor.tinta };
  const explica = { color: t.cor.cinza, fontSize: '0.84rem', lineHeight: 1.5, margin: '0 0 12px', maxWidth: '75ch' };

  return (
    <div>
      <p style={{ color: t.cor.cinza, fontSize: '0.88rem', lineHeight: 1.5, margin: '0 0 14px', maxWidth: '75ch' }}>
        Quase nenhum candidato votou essas propostas, então aqui a comparação é com o <strong style={{ color: t.cor.tinta }}>partido</strong>:
        como votaram os parlamentares que hoje estão nele. É uma <strong style={{ color: t.cor.tinta }}>estimativa</strong>, e cada candidato
        pode pensar diferente do partido. A frase embaixo do placar diz o quanto ela vale: num partido que vota unido, vale mais do que num
        partido dividido. Quem hoje tem mandato pelo {r.uf} tem o selo <strong style={{ color: t.cor.tinta }}>Tem mandato</strong>, que mostra o voto real.
      </p>
      <div role="tablist" aria-label="Cargo" style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '12px' }}>
        {CARGOS.map((c) => {
          const n = (r.cargos[c.valor] || []).reduce((s, g) => s + g.candidatos.length, 0);
          return (
            <button key={c.valor} type="button" role="tab" aria-selected={cargo === c.valor} onClick={() => { setCargo(c.valor); setBusca(''); }}
              style={pilula(cargo === c.valor)} onMouseOver={(e) => realce(e, true)} onMouseOut={(e) => realce(e, false)}>
              {c.rotulo} ({n.toLocaleString('pt-BR')})
            </button>
          );
        })}
      </div>
      <div style={{ maxWidth: '520px', marginBottom: '12px' }}>
        <CampoBusca valor={busca} aoMudar={setBusca} placeholder="Buscar por nome, partido ou número…" aoLabel={`Buscar candidato a ${rotuloCargo}`} />
      </div>
      {cargo === 'deputado-estadual' && <p style={explica}>{avisoEstadual(r.uf, r.estadualIndisponivel)}</p>}
      <p style={{ color: t.cor.cinza, fontSize: '0.84rem', margin: '0 0 14px' }}>
        {termo
          ? `${nCandidatos.toLocaleString('pt-BR')} ${nCandidatos === 1 ? 'candidato encontrado' : 'candidatos encontrados'} em ${visiveis.length} ${visiveis.length === 1 ? 'partido' : 'partidos'}.`
          : `${nCandidatos.toLocaleString('pt-BR')} candidatos a ${rotuloCargo} no ${r.uf}, em ${visiveis.length} ${visiveis.length === 1 ? 'partido' : 'partidos'}. Partidos mais parecidos com você primeiro.`}
      </p>
      {visiveis.length === 0 && (
        <p style={{ color: t.cor.cinza }}>{termo ? 'Nenhum candidato com essa busca neste cargo.' : `Nenhum candidato a ${rotuloCargo} no ${r.uf}.`}</p>
      )}
      {comEstimativa.length > 0 && <div style={grade}>{comEstimativa.map(cartao)}</div>}
      {poucas.length > 0 && (
        <>
          <h3 style={subtitulo}>Estimativa com poucas votações</h3>
          <p style={explica}>Nesses partidos, menos de {MIN_COMPARAVEIS} das suas respostas têm uma maioria definida. A estimativa diz pouco.</p>
          <div style={grade}>{poucas.map(cartao)}</div>
        </>
      )}
      {sem.length > 0 && (
        <>
          <h3 style={subtitulo}>Partidos sem estimativa</h3>
          <p style={explica}>Nenhum parlamentar que hoje está nesses partidos votou as propostas que você respondeu, ou o partido ficou dividido em todas. Os candidatos aparecem sem comparação.</p>
          <div style={grade}>{sem.map(cartao)}</div>
        </>
      )}
    </div>
  );
}

export default function Afinidade({ ufInicial }) {
  const router = useRouter();
  const [uf, setUf] = useState(ufInicial || '');
  const [respostas, setRespostas] = useState({});
  const [resultado, setResultado] = useState(null); // candidatos 2026 (módulo 2)
  const [cargo, setCargo] = useState('senador');
  const [busca, setBusca] = useState('');
  const [parl, setParl] = useState(null);           // parlamentares em exercício (módulo 1)
  const [casa, setCasa] = useState('camara');
  const [buscaParl, setBuscaParl] = useState('');
  const [aba, setAba] = useState('parlamentares');
  const [erro, setErro] = useState('');
  const [calculando, setCalculando] = useState(false);
  const rolagemPendente = useRef(null);
  const pronto = useRef(false);
  const ufEscolhida = useRef(Boolean(ufInicial)); // veio na URL, ou a pessoa escolheu o estado nesta página (ou voltou para um resultado)

  // Guarda a tela a cada mudança. Declarado ANTES do efeito que restaura: na montagem os dois
  // rodam em ordem, e este precisa rodar primeiro (com pronto=false) para não gravar a tela
  // vazia por cima da que vai ser restaurada.
  useEffect(() => {
    if (!pronto.current) return;
    try { sessionStorage.setItem(CHAVE_TELA, JSON.stringify({ uf, resultado, cargo, busca, parl, casa, buscaParl, aba, rolagem: window.scrollY })); } catch (e) {}
  }, [uf, resultado, cargo, busca, parl, casa, buscaParl, aba]);
  // Ao abrir: respostas deste navegador e, se a pessoa está VOLTANDO para esta aba, a tela como
  // ela deixou (resultado, cargo, busca, rolagem).
  useEffect(() => {
    const locais = lerRespostasLocais();
    setRespostas(Object.fromEntries(Object.entries(locais).map(([id, r]) => [id, r.resposta])));
    let tela = null;
    try { tela = JSON.parse(sessionStorage.getItem(CHAVE_TELA) || 'null'); } catch (e) {}
    if (tela && (!ufInicial || tela.uf === ufInicial)) {
      setUf(tela.uf || ufInicial || '');
      ufEscolhida.current = true;
      // Resultado no formato antigo (antes do módulo 2 refeito, 27/09) não é restaurado.
      if (tela.resultado && tela.resultado.partidos && !Array.isArray(tela.resultado.partidos)) setResultado(tela.resultado);
      if (tela.cargo) setCargo(tela.cargo);
      if (tela.busca) setBusca(tela.busca);
      if (tela.parl) setParl(tela.parl);
      if (tela.casa) setCasa(tela.casa);
      if (tela.buscaParl) setBuscaParl(tela.buscaParl);
      if (tela.aba) setAba(tela.aba);
      rolagemPendente.current = tela.rolagem || null;
    } else if (!ufInicial) {
      setUf(ufLocal()); // o estado da pessoa (o do perfil desce para cá na sincronização)
    }
    pronto.current = true;
  }, [ufInicial]);
  // Respostas que DESCEM do perfil depois que a página já abriu (login em outro aparelho, ver
  // src/lib/sincronizacao.js): entram na tela sem recarregar.
  useEffect(() => {
    const atualizar = () => {
      const locais = lerRespostasLocais();
      setRespostas(Object.fromEntries(Object.entries(locais).map(([id, r]) => [id, r.resposta])));
    };
    // O estado que desce do perfil vale, a não ser que a pessoa já tenha escolhido nesta página.
    const atualizarUf = () => { if (!ufEscolhida.current) setUf((atual) => ufLocal() || atual); };
    window.addEventListener(EVENTO_RESPOSTAS, atualizar);
    window.addEventListener(EVENTO_UF, atualizarUf);
    return () => { window.removeEventListener(EVENTO_RESPOSTAS, atualizar); window.removeEventListener(EVENTO_UF, atualizarUf); };
  }, []);

  useEffect(() => {
    const salvarRolagem = () => {
      try {
        const tela = JSON.parse(sessionStorage.getItem(CHAVE_TELA) || '{}');
        sessionStorage.setItem(CHAVE_TELA, JSON.stringify({ ...tela, rolagem: window.scrollY }));
      } catch (e) {}
    };
    router.events.on('routeChangeStart', salvarRolagem);
    window.addEventListener('beforeunload', salvarRolagem);
    return () => { router.events.off('routeChangeStart', salvarRolagem); window.removeEventListener('beforeunload', salvarRolagem); };
  }, [router]);
  // Volta à posição depois que o resultado restaurado desenhou.
  useEffect(() => {
    if ((resultado || parl) && rolagemPendente.current != null) {
      const y = rolagemPendente.current;
      rolagemPendente.current = null;
      requestAnimationFrame(() => window.scrollTo(0, y));
    }
  }, [resultado, parl]);

  // A pergunta da Assembleia do RS só compara deputados estaduais gaúchos: só aparece para o RS.
  const perguntas = PERGUNTAS_AFINIDADE.filter((p) => !p.uf || p.uf === uf);
  const respondidas = perguntas.filter((p) => respostas[p.id]).length;
  const comPosicao = perguntas.filter((p) => respostas[p.id] === 'a_favor' || respostas[p.id] === 'contra').length;

  // Cartões respondidos que a pessoa abriu para mudar ("Mudar resposta" ou "Abrir todas").
  const [abertas, setAbertas] = useState(() => new Set());
  const [todasAbertas, setTodasAbertas] = useState(false);
  const [focarMudar, setFocarMudar] = useState(null);
  const responder = (id, r) => {
    setRespostas((atual) => ({ ...atual, [id]: r }));
    salvarResposta({ pergunta_id: id, resposta: r, origem: 'escolha' }).catch(() => {});
    // Respondeu: o cartão recolhe (menos no modo "todas abertas", em que a pessoa quer ver tudo).
    setAbertas((a) => { if (!a.has(id)) return a; const n = new Set(a); n.delete(id); return n; });
    if (!todasAbertas) setFocarMudar(id);
  };
  const abrir = (id) => { setFocarMudar(null); setAbertas((a) => new Set(a).add(id)); };

  const calcular = async () => {
    setErro(''); setCalculando(true);
    try {
      const soDestas = Object.fromEntries(perguntas.filter((p) => respostas[p.id]).map((p) => [p.id, respostas[p.id]]));
      // Os dois módulos em paralelo: parlamentares (voto real) e candidatos 2026.
      const pedir = async (rota) => {
        const r = await fetch(rota, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ uf, respostas: soDestas }) });
        const j = await r.json();
        if (!r.ok) throw new Error(j.erro || 'Falha no cálculo.');
        return j;
      };
      const [jp, jc] = await Promise.all([pedir('/api/afinidade/parlamentares'), pedir('/api/afinidade/candidatos')]);
      setParl(jp); setResultado(jc);
      setBusca(''); setBuscaParl('');
      // Abre na primeira casa e no primeiro cargo que têm alguém com voto para comparar.
      setCasa((CASAS_AFINIDADE.find((c) => (jp.casas[c.id]?.lista || []).some((x) => x.comparaveis > 0)) || CASAS_AFINIDADE[0]).id);
      setCargo((CARGOS.find((c) => (jc.cargos[c.valor] || []).length > 0) || CARGOS[0]).valor);
      requestAnimationFrame(() => document.getElementById('resultado')?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
    } catch (e) { setErro(e.message); } finally { setCalculando(false); }
  };

  // PONTE do módulo 2 para o 1: o selo "Tem mandato" abre a aba de parlamentares na casa da
  // pessoa, já buscando o nome dela.
  const verVotoReal = (m) => {
    setAba('parlamentares'); setCasa(m.casa); setBuscaParl(m.nome);
    requestAnimationFrame(() => document.getElementById('resultado')?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  };

  const opcoesUf = UFS.map((u) => ({ valor: u, rotulo: `${u} · ${NOMES_UF[u] || u}`, busca: `${u} ${NOMES_UF[u] || ''}` }));
  const desligado = !uf || comPosicao === 0 || calculando;
  // ?ver=1 (vem do cartão da cédula, 27/09/2026): quem já respondeu cai direto no resultado. Roda
  // uma vez, quando o estado e as respostas deste navegador já estão na tela.
  const verPedido = useRef(false);
  useEffect(() => {
    if (verPedido.current || router.query.ver !== '1' || !uf || comPosicao === 0 || resultado || parl) return;
    verPedido.current = true;
    calcular();
  }, [router.query.ver, uf, comPosicao, resultado, parl]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="pagina">
      <Head>
        <title>Quem vota como você | Lume Cidadão</title>
        <meta name="description" content="Responda votações que já aconteceram no Congresso e compare com o voto registrado dos parlamentares do seu estado e com os candidatos de 2026. Sem cadastro." />
      </Head>
      <NavPraVoce />
      <div style={{ maxWidth: '860px' }}>
        <span style={{ fontSize: '0.78rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: t.cor.ouroTexto }}>Pra você</span>
        <h1 style={{ fontFamily: t.fonte.titulo, fontWeight: 600, fontSize: 'clamp(1.9rem,5vw,2.6rem)', lineHeight: 1.1, margin: '10px 0 12px' }}>Quem vota como você</h1>
        <div style={{ ...caixa, background: t.cor.papelQuente, boxShadow: 'none', marginBottom: '22px', fontSize: '0.92rem', color: t.cor.tinta, lineHeight: 1.6 }}>
          <strong>Cada pergunta abaixo é uma votação que já aconteceu</strong> no plenário da Câmara, do Senado ou da Assembleia do RS.
          Você diz o que pensa e nós comparamos com o <strong>voto registrado</strong> de cada parlamentar naquela votação: sem
          interpretação e sem inteligência artificial. Responda só as que quiser; em cada uma há uma explicação simples do assunto.
          Sem conta, suas respostas ficam só neste navegador. Com conta e autorização no perfil, elas aparecem também nos seus outros aparelhos.
        </div>

        <div style={{ maxWidth: '420px', marginBottom: '22px' }}>
          <p style={{ margin: '0 0 8px', fontWeight: 700 }}>Seu estado</p>
          <CampoSelect opcoes={opcoesUf} valor={uf} placeholder="Escolha o estado" aoLabel="Seu estado" aoSelecionar={(u) => { ufEscolhida.current = true; setUf(u); setResultado(null); setParl(null); definirUf(u).catch(() => {}); }} />
        </div>

        {respondidas > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px 14px', flexWrap: 'wrap', margin: '0 0 12px' }}>
            <span style={{ fontSize: '0.86rem', color: t.cor.cinza }}>
              {respondidas} de {perguntas.length} respondidas{todasAbertas ? '' : ', recolhidas com a sua resposta'}.
            </span>
            <button type="button" aria-pressed={todasAbertas} onClick={() => { setTodasAbertas((v) => !v); setAbertas(new Set()); setFocarMudar(null); }}
              style={{ ...pilula(false), padding: '7px 16px', fontSize: '0.84rem' }} onMouseOver={(e) => realce(e, true)} onMouseOut={(e) => realce(e, false)}>
              {todasAbertas ? 'Recolher as respondidas' : 'Abrir todas'}
            </button>
          </div>
        )}
        {perguntas.map((p) => (
          <Pergunta key={p.id} p={p} resposta={respostas[p.id]} aoResponder={responder}
            aberta={todasAbertas || abertas.has(p.id)} aoAbrir={abrir} focarMudar={focarMudar === p.id} />
        ))}

        <div style={{ display: 'flex', gap: '14px', alignItems: 'center', flexWrap: 'wrap', marginTop: '18px' }}>
          <button type="button" onClick={calcular} disabled={desligado} style={botaoPadrao(desligado)}
            onMouseOver={(e) => realce(e, true)} onMouseOut={(e) => realce(e, false)}>
            {calculando ? 'Calculando…' : resultado ? 'Atualizar resultado' : 'Ver quem votou como você'}
          </button>
          <span style={{ fontSize: '0.84rem', color: t.cor.cinza }}>
            {respondidas} de {perguntas.length} respondidas{!uf ? ' · escolha o seu estado' : comPosicao === 0 ? ' · responda ao menos uma com a favor ou contra' : ''}
          </span>
        </div>
        {erro && <p style={{ color: t.cor.alertaTexto, marginTop: '12px' }}>{erro}</p>}
      </div>

      {(parl || resultado) && (
        <div id="resultado" style={{ marginTop: '30px' }}>
          <h2 style={{ fontFamily: t.fonte.titulo, fontWeight: 600, fontSize: '1.5rem', margin: '0 0 12px' }}>Quem votou como você no {uf}</h2>
          {/* DOIS MÓDULOS, DUAS ABAS (27/09/2026): quem tem mandato (fato) e quem é candidato em 2026. */}
          <div role="tablist" aria-label="O que comparar" style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '18px' }}>
            {[['parlamentares', 'Parlamentares em exercício'], ['candidatos', 'Candidatos 2026']].map(([v, rotulo]) => (
              <button key={v} type="button" role="tab" aria-selected={aba === v} onClick={() => setAba(v)}
                style={{ ...pilula(aba === v), fontSize: '0.95rem', padding: '11px 22px' }} onMouseOver={(e) => realce(e, true)} onMouseOut={(e) => realce(e, false)}>{rotulo}</button>
            ))}
          </div>
          {aba === 'parlamentares' && parl && <ResultadoParlamentares r={parl} casa={casa} setCasa={setCasa} busca={buscaParl} setBusca={setBuscaParl} />}
          {aba === 'candidatos' && resultado && <ResultadoCandidatos r={resultado} cargo={cargo} setCargo={setCargo} busca={busca} setBusca={setBusca} aoVerVotoReal={verVotoReal} />}
        </div>
      )}
    </div>
  );
}

export async function getServerSideProps({ query }) {
  const uf = String(query.uf || '').toUpperCase();
  return { props: { ufInicial: UFS.includes(uf) ? uf : '' } };
}
