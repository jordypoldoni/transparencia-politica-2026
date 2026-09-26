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
import { lerRespostasLocais, salvarResposta } from '../src/lib/perfilUsuario';

// QUEM VOTA COMO VOCÊ (26/09/2026). Caminho principal do questionário de afinidade, SEM IA:
// a pessoa responde votações que já aconteceram e o resultado sai do voto registrado de cada
// parlamentar (src/lib/calcularAfinidade.js, pela rota /api/afinidade).
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

function Pergunta({ p, resposta, aoResponder }) {
  return (
    <div style={{ ...caixa, marginBottom: '12px' }}>
      <p style={{ margin: '0 0 6px', fontSize: '0.72rem', fontWeight: 800, letterSpacing: '0.05em', textTransform: 'uppercase', color: t.cor.ouroTexto }}>{p.tema}</p>
      <p style={{ margin: '0 0 8px', fontSize: '1.02rem', fontWeight: 700, color: t.cor.tinta, lineHeight: 1.4 }}>Você é a favor de {p.texto.charAt(0).toLowerCase() + p.texto.slice(1)}?</p>
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
      {itens.map((d) => {
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
function CartaoCandidato({ c, cargoRotulo, partido }) {
  return (
    <div style={caixa}>
      <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
        <Avatar nome={c.nome_urna} foto={c.foto_url} size={44} />
        <div style={{ minWidth: 0, flex: 1 }}>
          <Link href={c.href} style={{ color: t.cor.tinta, fontWeight: 700, textDecoration: 'none' }}>{c.nome_urna}</Link>
          <p style={{ margin: '2px 0 0', fontSize: '0.78rem', color: t.cor.cinza }}>{cargoRotulo} · {c.partido_sigla}{c.nr_candidato ? ` · nº ${c.nr_candidato}` : ''}</p>
        </div>
        <BotaoFavorito tipo="candidato" chave={c.href} rotulo={c.nome_urna}
          detalhe={[`Candidato(a) a ${cargoRotulo}`, c.partido_sigla].filter(Boolean).join(' · ')} foto={c.foto_url} />
      </div>
      {c.comparaveis > 0 ? (
        <>
          <p style={{ margin: '12px 0 0', fontSize: '0.92rem', color: t.cor.tinta }}>
            Votou como você em <strong>{c.iguais} de {c.comparaveis}</strong> {c.comparaveis === 1 ? 'votação' : 'votações'}
          </p>
          <details style={{ marginTop: '6px' }}>
            <summary style={{ cursor: 'pointer', fontSize: '0.8rem', fontWeight: 700, color: t.cor.ouroTexto }}>Ver voto a voto</summary>
            <Detalhes itens={c.detalhes} campo="votou" />
          </details>
        </>
      ) : (
        <p style={{ margin: '12px 0 0', fontSize: '0.84rem', color: t.cor.cinza, lineHeight: 1.5 }}>
          Não votou nenhuma dessas propostas (não tinha mandato na época, ou ainda não temos os votos da casa dele).
          {partido ? <> Os atuais parlamentares do {c.partido_sigla} votaram como você em <strong style={{ color: t.cor.tinta }}>{partido.iguais} de {partido.comparaveis}</strong>.</> : ''}
        </p>
      )}
    </div>
  );
}

function avisoEstadual(uf, indisponivel) {
  if (indisponivel) return 'Não foi possível consultar o TSE agora para listar os candidatos a deputado estadual. Tente de novo em instantes.';
  if (uf === 'DF') return 'No Distrito Federal o cargo é o de deputado distrital, que ainda não está no site.';
  if (uf === 'RS') return 'Das perguntas, só a das escolas cívico-militares foi votada na Assembleia do RS: os deputados estaduais gaúchos são comparados nela (e nas federais, se já tiveram mandato no Congresso).';
  if (uf === 'SP') return 'A Assembleia de SP (ALESP) não publica o voto de cada deputado, então não há como comparar os estaduais paulistas.';
  return `O site ainda não tem os votos da Assembleia Legislativa do ${uf}, então os estaduais daqui aparecem sem comparação.`;
}

function Resultado({ r, cargo, setCargo, busca, setBusca }) {
  const lista = r.cargos[cargo] || [];
  const rotuloCargo = CARGOS.find((c) => c.valor === cargo)?.rotulo || '';
  const partidoPorSigla = Object.fromEntries(r.partidos.map((p) => [semAcento(p.sigla), p]));
  const votaram = lista.filter((c) => c.comparaveis > 0);
  const termo = semAcento(busca.trim());
  const filtrados = termo
    ? lista.filter((c) => (/^\d+$/.test(termo) ? String(c.nr_candidato || '').startsWith(termo)
      : semAcento(c.nome_urna).includes(termo) || semAcento(c.partido_sigla) === termo))
    : votaram;
  const mostrar = filtrados.slice(0, 60);
  const opcoesCargo = CARGOS.map((c) => {
    const n = (r.cargos[c.valor] || []).filter((x) => x.comparaveis > 0).length;
    return { valor: c.valor, rotulo: `${c.rotulo} (${n})` };
  });

  return (
    <div id="resultado" style={{ marginTop: '30px' }}>
      <h2 style={{ fontFamily: t.fonte.titulo, fontWeight: 600, fontSize: '1.5rem', margin: '0 0 6px' }}>Candidatos do {r.uf} e como votaram</h2>
      <p style={{ color: t.cor.cinza, fontSize: '0.88rem', lineHeight: 1.5, margin: '0 0 14px', maxWidth: '75ch' }}>
        O número em cada cargo é quantos candidatos já votaram ao menos uma das suas respostas. A conta usa só voto Sim ou Não:
        abstenção e ausência não dizem posição e ficam de fora.
      </p>
      <div style={{ marginBottom: '12px' }}>
        {/* Mesmas pílulas de /deputados ("Federais · Estaduais"): o padrão do site para separar
            parlamentares por tipo. */}
        <div role="tablist" aria-label="Cargo" style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          {opcoesCargo.map((o) => (
            <button key={o.valor} type="button" role="tab" aria-selected={cargo === o.valor} onClick={() => { setCargo(o.valor); setBusca(''); }}
              style={pilula(cargo === o.valor)} onMouseOver={(e) => realce(e, true)} onMouseOut={(e) => realce(e, false)}>
              {o.rotulo}
            </button>
          ))}
        </div>
      </div>
      <div style={{ maxWidth: '520px', marginBottom: '12px' }}>
        <CampoBusca valor={busca} aoMudar={setBusca} placeholder="Buscar por nome, partido ou número…" aoLabel={`Buscar candidato a ${rotuloCargo}`} />
      </div>
      {cargo === 'deputado-estadual' && (
        <p style={{ color: t.cor.cinza, fontSize: '0.84rem', lineHeight: 1.5, margin: '0 0 12px', maxWidth: '75ch' }}>{avisoEstadual(r.uf, r.estadualIndisponivel)}</p>
      )}
      <p style={{ color: t.cor.cinza, fontSize: '0.84rem', margin: '0 0 14px' }}>
        {termo
          ? `${filtrados.length.toLocaleString('pt-BR')} ${filtrados.length === 1 ? 'candidato encontrado' : 'candidatos encontrados'}${filtrados.length > mostrar.length ? `, mostrando ${mostrar.length}: refine a busca` : ''}.`
          : `${votaram.length.toLocaleString('pt-BR')} de ${lista.length.toLocaleString('pt-BR')} candidatos a ${rotuloCargo} já votaram essas propostas.${lista.length > votaram.length ? ' Para conferir alguém que não aparece, busque pelo nome, partido ou número.' : ''}`}
      </p>
      {mostrar.length === 0 ? (
        <p style={{ color: t.cor.cinza }}>{termo ? 'Nenhum candidato com essa busca neste cargo.' : `Nenhum candidato a ${rotuloCargo} do ${r.uf} votou as propostas que você respondeu.`}</p>
      ) : (
        <div style={{ display: 'grid', gap: '10px', alignItems: 'start', gridTemplateColumns: 'repeat(auto-fill, minmax(min(320px, 100%), 1fr))' }}>
          {mostrar.map((c) => <CartaoCandidato key={c.href} c={c} cargoRotulo={rotuloCargo} partido={partidoPorSigla[semAcento(c.partido_sigla)]} />)}
        </div>
      )}

      <h2 style={{ fontFamily: t.fonte.titulo, fontWeight: 600, fontSize: '1.5rem', margin: '36px 0 6px' }}>Os partidos na disputa do {r.uf}</h2>
      <p style={{ color: t.cor.cinza, fontSize: '0.88rem', lineHeight: 1.5, margin: '0 0 16px', maxWidth: '75ch' }}>
        Como votaram os parlamentares que <strong style={{ color: t.cor.tinta }}>hoje</strong> estão em cada partido. Não é a orientação
        oficial do partido na época nem garante como um candidato sem mandato votaria: é a maioria dos atuais membros que votaram Sim ou Não.
      </p>
      <div style={{ display: 'grid', gap: '10px', alignItems: 'start', gridTemplateColumns: 'repeat(auto-fill, minmax(min(320px, 100%), 1fr))' }}>
        {r.partidos.map((p) => (
          <div key={p.sigla} style={caixa}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px' }}>
              <p style={{ margin: 0, fontWeight: 800, color: t.cor.tinta }}>{p.sigla}</p>
              <BotaoFavorito tipo="partido" chave={p.sigla} rotulo={p.sigla} detalhe="Partido" />
            </div>
            <p style={{ margin: '6px 0 0', fontSize: '0.88rem', color: t.cor.tinta }}>A maioria votou como você em <strong>{p.iguais} de {p.comparaveis}</strong></p>
            <details style={{ marginTop: '6px' }}>
              <summary style={{ cursor: 'pointer', fontSize: '0.8rem', fontWeight: 700, color: t.cor.ouroTexto }}>Ver voto a voto</summary>
              <Detalhes itens={p.detalhes} campo="maioria" />
            </details>
          </div>
        ))}
      </div>
      {r.semParlamentares.length > 0 && (
        <p style={{ color: t.cor.cinza, fontSize: '0.84rem', margin: '14px 0 0', lineHeight: 1.5 }}>
          Sem parlamentar que tenha votado essas propostas: {r.semParlamentares.join(', ')}.
        </p>
      )}
    </div>
  );
}

export default function Afinidade({ ufInicial }) {
  const router = useRouter();
  const [uf, setUf] = useState(ufInicial || '');
  const [respostas, setRespostas] = useState({});
  const [resultado, setResultado] = useState(null);
  const [cargo, setCargo] = useState('senador');
  const [busca, setBusca] = useState('');
  const [erro, setErro] = useState('');
  const [calculando, setCalculando] = useState(false);
  const rolagemPendente = useRef(null);
  const pronto = useRef(false);

  // Guarda a tela a cada mudança. Declarado ANTES do efeito que restaura: na montagem os dois
  // rodam em ordem, e este precisa rodar primeiro (com pronto=false) para não gravar a tela
  // vazia por cima da que vai ser restaurada.
  useEffect(() => {
    if (!pronto.current) return;
    try { sessionStorage.setItem(CHAVE_TELA, JSON.stringify({ uf, resultado, cargo, busca, rolagem: window.scrollY })); } catch (e) {}
  }, [uf, resultado, cargo, busca]);
  // Ao abrir: respostas deste navegador e, se a pessoa está VOLTANDO para esta aba, a tela como
  // ela deixou (resultado, cargo, busca, rolagem).
  useEffect(() => {
    const locais = lerRespostasLocais();
    setRespostas(Object.fromEntries(Object.entries(locais).map(([id, r]) => [id, r.resposta])));
    let tela = null;
    try { tela = JSON.parse(sessionStorage.getItem(CHAVE_TELA) || 'null'); } catch (e) {}
    if (tela && (!ufInicial || tela.uf === ufInicial)) {
      setUf(tela.uf || ufInicial || '');
      if (tela.resultado) setResultado(tela.resultado);
      if (tela.cargo) setCargo(tela.cargo);
      if (tela.busca) setBusca(tela.busca);
      rolagemPendente.current = tela.rolagem || null;
    } else if (!ufInicial) {
      try { const p = JSON.parse(localStorage.getItem('prefs') || '{}'); if (p.uf) setUf(p.uf); } catch (e) {}
    }
    pronto.current = true;
  }, [ufInicial]);

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
    if (resultado && rolagemPendente.current != null) {
      const y = rolagemPendente.current;
      rolagemPendente.current = null;
      requestAnimationFrame(() => window.scrollTo(0, y));
    }
  }, [resultado]);

  // A pergunta da Assembleia do RS só compara deputados estaduais gaúchos: só aparece para o RS.
  const perguntas = PERGUNTAS_AFINIDADE.filter((p) => !p.uf || p.uf === uf);
  const respondidas = perguntas.filter((p) => respostas[p.id]).length;
  const comPosicao = perguntas.filter((p) => respostas[p.id] === 'a_favor' || respostas[p.id] === 'contra').length;

  const responder = (id, r) => {
    setRespostas((atual) => ({ ...atual, [id]: r }));
    salvarResposta({ pergunta_id: id, resposta: r, origem: 'escolha' }).catch(() => {});
  };

  const calcular = async () => {
    setErro(''); setCalculando(true);
    try {
      const soDestas = Object.fromEntries(perguntas.filter((p) => respostas[p.id]).map((p) => [p.id, respostas[p.id]]));
      const r = await fetch('/api/afinidade', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ uf, respostas: soDestas }) });
      const j = await r.json();
      if (!r.ok) throw new Error(j.erro || 'Falha no cálculo.');
      setResultado(j);
      setBusca('');
      // Abre no primeiro cargo, na ordem das abas, que tem alguém com voto para comparar.
      setCargo((CARGOS.find((c) => (j.cargos[c.valor] || []).some((x) => x.comparaveis > 0)) || CARGOS[0]).valor);
      requestAnimationFrame(() => document.getElementById('resultado')?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
    } catch (e) { setErro(e.message); } finally { setCalculando(false); }
  };

  const opcoesUf = UFS.map((u) => ({ valor: u, rotulo: `${u} · ${NOMES_UF[u] || u}`, busca: `${u} ${NOMES_UF[u] || ''}` }));
  const desligado = !uf || comPosicao === 0 || calculando;

  return (
    <div className="pagina">
      <Head>
        <title>Quem vota como você | Lume Cidadão</title>
        <meta name="description" content="Responda votações que já aconteceram no Congresso e veja quais candidatos de 2026 votaram como você, pelo voto registrado de cada um. Sem cadastro." />
      </Head>
      <NavPraVoce />
      <div style={{ maxWidth: '860px' }}>
        <span style={{ fontSize: '0.78rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: t.cor.ouroTexto }}>Pra você</span>
        <h1 style={{ fontFamily: t.fonte.titulo, fontWeight: 600, fontSize: 'clamp(1.9rem,5vw,2.6rem)', lineHeight: 1.1, margin: '10px 0 12px' }}>Quem vota como você</h1>
        <div style={{ ...caixa, background: t.cor.papelQuente, boxShadow: 'none', marginBottom: '22px', fontSize: '0.92rem', color: t.cor.tinta, lineHeight: 1.6 }}>
          <strong>Cada pergunta abaixo é uma votação que já aconteceu</strong> no plenário da Câmara, do Senado ou da Assembleia do RS.
          Você diz o que pensa e nós comparamos com o <strong>voto registrado</strong> de cada parlamentar naquela votação: sem
          interpretação e sem inteligência artificial. Responda só as que quiser; em cada uma há uma explicação simples do assunto.
          Suas respostas ficam apenas neste navegador.
        </div>

        <div style={{ maxWidth: '420px', marginBottom: '22px' }}>
          <p style={{ margin: '0 0 8px', fontWeight: 700 }}>Seu estado</p>
          <CampoSelect opcoes={opcoesUf} valor={uf} placeholder="Escolha o estado" aoLabel="Seu estado" aoSelecionar={(u) => { setUf(u); setResultado(null); }} />
        </div>

        {perguntas.map((p) => <Pergunta key={p.id} p={p} resposta={respostas[p.id]} aoResponder={responder} />)}

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

      {resultado && <Resultado r={resultado} cargo={cargo} setCargo={setCargo} busca={busca} setBusca={setBusca} />}
    </div>
  );
}

export async function getServerSideProps({ query }) {
  const uf = String(query.uf || '').toUpperCase();
  return { props: { ufInicial: UFS.includes(uf) ? uf : '' } };
}
