import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import ServicoAPI from '../src/servicos/servico_api';
import CardCandidato from '../components/CardCandidato';
import ResumoMeuVoto from '../components/ResumoMeuVoto';
import NavPraVoce from '../components/NavPraVoce';
import { t } from '../src/estilo/tokens';
import { NOMES_UF } from '../src/lib/cotas';
import { ARTIGO_UF, nomeDe, emUf, deUf, paraUf } from '../src/lib/ufs';
import { definirUf, ufLocal, EVENTO_UF, guardarUfCookie, COOKIE_UF, lerRespostasLocais, EVENTO_RESPOSTAS } from '../src/lib/perfilUsuario';
import { PERGUNTAS_AFINIDADE } from '../src/lib/perguntasAfinidade';
import BotaoCompartilhar from '../components/BotaoCompartilhar';

const UFS = ['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'];

// Preposição por estado: src/lib/ufs.js (saiu daqui em 30/09/2026).

const pilula = (ativo) => ({
  padding: '9px 16px', fontSize: '0.9rem', fontWeight: 700, fontFamily: t.fonte.corpo,
  borderRadius: t.raio.pill, cursor: 'pointer', border: 'none',
  background: ativo ? t.cor.verde : '#fff', color: ativo ? t.cor.ouro : t.cor.tinta,
  boxShadow: t.sombra.botao, transition: 'background .15s, box-shadow .15s, transform .15s',
});

// ----- CÉDULA -----
// Um bloco por cargo, numerado na ordem em que a urna pergunta em 04/10/2026.
function BlocoCargo({ ordem, cargo, nota, children }) {
  return (
    <section style={{ marginBottom: '34px' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px', flexWrap: 'wrap', marginBottom: '4px' }}>
        <span style={{ fontFamily: t.fonte.titulo, fontWeight: 700, fontSize: '1.05rem', color: t.cor.ouroTexto }}>{ordem}º</span>
        <h2 style={{ fontFamily: t.fonte.titulo, fontWeight: 600, fontSize: '1.45rem', margin: 0 }}>{cargo}</h2>
      </div>
      {nota && <p style={{ color: t.cor.cinza, fontSize: '0.88rem', margin: '0 0 14px', lineHeight: 1.5, maxWidth: '70ch' }}>{nota}</p>}
      {children}
    </section>
  );
}

// Cargo que o site ainda não coletou. Melhor dizer que falta do que deixar o leitor achar
// que a cédula dele acabou ali.
function AindaNaoTemos({ texto }) {
  return (
    <div style={{ background: t.cor.papelQuente, borderRadius: t.raio.md, padding: '14px 18px', color: t.cor.cinza, fontSize: '0.88rem', lineHeight: 1.5 }}>
      {texto}
    </div>
  );
}

function Cedula({ uf, cedula }) {
  const federais = cedula?.federais || { comMandato: [], total: 0 };
  const senadores = cedula?.senadores || [];
  const governadores = cedula?.governadores || [];
  const chapas = cedula?.chapas || [];
  const estaduais = cedula?.estaduais || null;

  return (
    <>
      <BlocoCargo ordem={1} cargo="Deputado Federal"
        nota={`${federais.total.toLocaleString('pt-BR')} pessoas disputam as cadeiras ${deUf(uf)} na Câmara.${federais.comMandato.length > 0 ? ` Abaixo, ${federais.comMandato.length === 1 ? 'o único que já tem' : `os ${federais.comMandato.length} que já têm`} mandato hoje: desses o site mostra também em que gastaram a cota e como votaram.` : ''}`}>
        {federais.comMandato.length > 0 ? (
          <div className="grade-parl">
            {federais.comMandato.map((d) => <CardCandidato key={d.id} d={d} hrefBase="/deputado-federal" selo="já tem mandato" votar ufVoto={uf} />)}
          </div>
        ) : (
          <AindaNaoTemos texto={`Nenhum candidato ${deUf(uf)} tem mandato na Câmara hoje.`} />
        )}
        <div style={{ marginTop: '14px' }}>
          <Link href={`/candidatos-2026?cargo=deputado-federal&uf=${uf}`}
            style={{ display: 'inline-block', padding: '11px 20px', borderRadius: t.raio.pill, background: t.cor.verde, color: t.cor.ouro, fontWeight: 700, fontSize: '0.88rem', textDecoration: 'none', boxShadow: t.sombra.botao }}>
            Ver os {federais.total.toLocaleString('pt-BR')} candidatos do {uf} →
          </Link>
        </div>
      </BlocoCargo>

      {/* DEPUTADO ESTADUAL (27/09/2026): igual ao federal, com o total e os cartões de quem já tem
          mandato na Assembleia (ServicoAPI.estaduaisDaCedula). Antes era só um botão, e parecia que
          faltava o cargo. */}
      <BlocoCargo ordem={2} cargo="Deputado Estadual"
        nota={uf === 'DF' ? 'No Distrito Federal o cargo equivalente é o de deputado distrital, que ainda não está no site.'
          : !estaduais ? `Quem disputa a Assembleia Legislativa ${deUf(uf)}. A lista vem direto do TSE, que não respondeu agora: o botão abaixo abre a lista completa.`
          : `${estaduais.total.toLocaleString('pt-BR')} pessoas disputam as cadeiras ${deUf(uf)} na Assembleia Legislativa.${estaduais.comMandato.length > 0 ? ` Abaixo, ${estaduais.comMandato.length === 1 ? 'o único que já tem' : `os ${estaduais.comMandato.length} que já têm`} mandato hoje.` : ''}`}>
        {uf === 'DF' ? (
          <AindaNaoTemos texto="Deputado distrital ainda não está no site." />
        ) : (
          <>
            {estaduais?.comMandato?.length > 0 ? (
              <div className="grade-parl">
                {estaduais.comMandato.map((d) => <CardCandidato key={d.slug} d={d} hrefBase="/candidato-estadual" selo="já tem mandato" votar ufVoto={uf} />)}
              </div>
            ) : estaduais && !estaduais.temCadastro ? (
              <AindaNaoTemos texto={`O site ainda não tem o cadastro dos deputados estaduais ${deUf(uf)}, então não dá para marcar quem já tem mandato. Todos os candidatos estão na lista abaixo.`} />
            ) : estaduais ? (
              <AindaNaoTemos texto={`Nenhum candidato ${deUf(uf)} tem mandato na Assembleia hoje.`} />
            ) : null}
            <div style={{ marginTop: '14px' }}>
              <Link href={`/candidatos-2026?cargo=deputado-estadual&uf=${uf}`}
                style={{ display: 'inline-block', padding: '11px 20px', borderRadius: t.raio.pill, background: t.cor.verde, color: t.cor.ouro, fontWeight: 700, fontSize: '0.88rem', textDecoration: 'none', boxShadow: t.sombra.botao }}>
                {estaduais?.total ? `Ver os ${estaduais.total.toLocaleString('pt-BR')} candidatos do ${uf} →` : `Ver os candidatos a deputado estadual do ${uf} →`}
              </Link>
            </div>
          </>
        )}
      </BlocoCargo>

      <BlocoCargo ordem={3} cargo="Senador"
        nota={`Em 2026 cada estado elege dois senadores, e você vota em dois nomes diferentes. Cada candidato traz dois suplentes, que assumem a cadeira se ele sair: os suplentes estão na ficha de cada um. São ${senadores.length} candidatos ${emUf(uf)}.`}>
        {senadores.length > 0 ? (
          <div className="grade-parl">
            {senadores.map((s) => <CardCandidato key={s.id} d={s} hrefBase="/candidato-senador" selo={s.agente_id ? 'já tem mandato' : null} votar ufVoto={uf} />)}
          </div>
        ) : (
          <AindaNaoTemos texto={`Nenhum candidato ao Senado coletado ${paraUf(uf)} até agora.`} />
        )}
      </BlocoCargo>

      <BlocoCargo ordem={4} cargo="Governador"
        nota={`Você vota em um nome. Cada chapa leva um vice, que assume o governo se o titular sair: o vice está na ficha de cada candidato. São ${governadores.length} ${emUf(uf)}.`}>
        {governadores.length > 0 ? (
          <div className="grade-parl">
            {governadores.map((g) => <CardCandidato key={g.id} d={g} hrefBase="/candidato-governador" votar ufVoto={uf} />)}
          </div>
        ) : (
          <AindaNaoTemos texto={`Nenhum candidato a governador coletado ${paraUf(uf)} até agora.`} />
        )}
      </BlocoCargo>

      <BlocoCargo ordem={5} cargo="Presidente"
        nota="O único cargo que todo mundo vota igual, em qualquer estado. O nome ao lado de cada chapa é o vice, que assume se o presidente deixar o cargo.">
        {chapas.length > 0 ? (
          <div className="grade-parl">
            {chapas.map((c) => (
              <CardCandidato key={c.presidente.slug} hrefBase="/presidencial"
                d={{ ...c.presidente, nr_candidato: c.nr_candidato, uf: null }}
                selo={c.vice ? `vice: ${c.vice.nome_urna}` : null} votar />
            ))}
          </div>
        ) : (
          <AindaNaoTemos texto="Nenhuma chapa presidencial coletada ainda." />
        )}
      </BlocoCargo>
    </>
  );
}

// SUA CÉDULA (refeita em 26/09/2026, pedido do Jordy). A versão anterior fazia duas perguntas
// que não conversam ("seu estado" e "seus temas") e tinha UM botão só. O resultado dependia da
// combinação: só estado abria a cédula; estado e temas abriam a cédula MAIS uma lista de votações
// da Câmara; só temas abria "Seus temas", sem cédula nenhuma. Quem marcava um tema achava que
// estava montando a cédula, e não estava: tema não muda quem está na urna.
//
// Agora a página faz UMA coisa: a cédula do estado. Uma pergunta, e tocar no estado já abre.
// Se o site já sabe o estado (escolhido antes, ou pela conexão), ele vem sugerido num botão.
// Votações por tema foram para onde já existe filtro de tema: /votacoes/camara?tema=...
// Links antigos com ?temas= continuam funcionando (ver getServerSideProps).
//
// Saíram daqui, por serem repetição: o cartão "Quem vota como você?" na tela de escolha (é a
// segunda pílula do menu logo acima) e a lista "Seus favoritos" (tem página própria no mesmo
// menu). Na cédula aberta, o convite ao "Quem vota como você?" continua, com o estado escolhido.
const botaoPrimario = {
  display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '15px 26px', fontSize: '1.02rem', fontWeight: 700,
  fontFamily: t.fonte.corpo, color: t.cor.ouro, background: t.cor.verde, borderRadius: t.raio.pill, textDecoration: 'none',
  boxShadow: t.sombra.botao, transition: 'box-shadow .15s, transform .15s',
};
const realce = (e, ligar) => {
  e.currentTarget.style.boxShadow = ligar ? t.sombra.botaoHover : t.sombra.botao;
  e.currentTarget.style.transform = ligar ? 'translateY(-1px)' : 'none';
};

export default function Comecar({ modo, ufSel, ufConexao, cedula, trocando = false, ufAtual = '' }) {
  const router = useRouter();
  const [ufSalva, setUfSalva] = useState(ufAtual);

  useEffect(() => {
    if (modo === 'resultado') {
      // O estado da cédula aberta vira o estado da pessoa (navegador e, com autorização, perfil).
      definirUf(ufSel).catch(() => {});
      return undefined;
    }
    const ler = () => { const u = ufLocal(); if (UFS.includes(u)) setUfSalva(u); };
    ler();
    // Quem tem estado guardado só no navegador (de antes do cookie, 27/09/2026): grava o cookie e
    // vai direto para a cédula, como o servidor faria. Na troca de estado, fica aqui.
    const salvo = ufLocal();
    if (!trocando && UFS.includes(salvo)) { guardarUfCookie(salvo); router.replace(`/comecar?uf=${salvo}`); return undefined; }
    window.addEventListener(EVENTO_UF, ler); // o do perfil pode descer depois de a página abrir
    return () => window.removeEventListener(EVENTO_UF, ler);
  }, [modo, ufSel, trocando, router]);

  // ----- CÉDULA ABERTA -----
  if (modo === 'resultado') {
    return (
      <div className="pagina">
        <Head>
          <title>{`Sua cédula em ${ufSel}: quem você vota em 2026 | Lume`}</title>
          <meta name="description" content={`Quem disputa a sua cédula ${emUf(ufSel)} em 4 de outubro de 2026: deputado federal, deputado estadual, senador, governador e presidente, com a ficha de cada candidato.`} />
        </Head>

        <NavPraVoce />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '12px', marginBottom: '10px' }}>
          <div>
            <span style={{ fontSize: '0.78rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: t.cor.ouroTexto }}>Eleição de 4 de outubro de 2026</span>
            <h1 style={{ fontFamily: t.fonte.titulo, fontWeight: 600, fontSize: 'clamp(1.7rem,4vw,2.4rem)', margin: '6px 0 0' }}>Sua cédula {emUf(ufSel)}</h1>
          </div>
          {/* Controles irmãos juntos (regra do site): compartilhar a cédula do estado e trocar de estado. */}
          {/* Celular (27/09/2026): lado a lado, menores, e "Compartilhar" sem o complemento. */}
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'flex-start' }}>
            <BotaoCompartilhar url={() => `${window.location.origin}/comecar?uf=${ufSel}`} titulo={`Cédula ${deUf(ufSel)} em 2026`}
              texto={`Quem disputa cada cargo ${emUf(ufSel)} em 4 de outubro, com a ficha de cada candidato`} claro
              rotulo={<><span className="so-computador-inline">Compartilhar a cédula</span><span className="so-celular-inline">Compartilhar</span></>} />
            <Link href="/comecar?trocar=1" className="botao-compacto" style={{ textDecoration: 'none', color: t.cor.tinta, fontWeight: 700, fontSize: '0.9rem', padding: '9px 16px', borderRadius: t.raio.pill, background: '#fff', boxShadow: t.sombra.botao, whiteSpace: 'nowrap' }}
              onMouseOver={(e) => realce(e, true)} onMouseOut={(e) => realce(e, false)}>Trocar estado</Link>
          </div>
        </div>

        <p style={{ color: t.cor.cinza, margin: '0 0 24px', maxWidth: '70ch', lineHeight: 1.5 }}>
          Quem vota {emUf(ufSel)} escolhe cinco cargos, nesta ordem na urna.
        </p>

        {/* Convite ao questionário, já com o estado: é o próximo passo natural de quem viu a cédula. */}
        <ConviteAfinidade uf={ufSel} />

        {/* MEU VOTO (27/09/2026, pedido do Jordy): em quem a pessoa pretende votar, cargo por cargo. */}
        <section style={{ background: '#fff', borderRadius: t.raio.md, padding: 'clamp(16px,3vw,22px)', boxShadow: t.sombra.sutil, marginBottom: '34px', maxWidth: '760px' }}>
          <ResumoMeuVoto uf={ufSel} />
        </section>

        <Cedula uf={ufSel} cedula={cedula} />
      </div>
    );
  }

  // ----- ESCOLHA DO ESTADO -----
  // REVISTA EM 27/09/2026 (análise de UX pedida pelo Jordy). Antes a tela misturava dois jeitos de
  // usar: o estado sugerido aparecia no botão grande E destacado na lista, o que lê como "já está
  // selecionado, confirme", mas tocar numa sigla já abria a cédula. E quem já tinha estado passava
  // por esta tela à toa. Agora:
  // - com estado conhecido, o servidor (cookie lume_uf) ou o navegador vão direto para a cédula;
  //   esta tela só aparece para quem não tem estado ou veio de "Trocar estado";
  // - sem estado: o palpite pela conexão (pode errar: VPN, viagem) é o botão, com o aviso; as
  //   siglas ficam todas iguais;
  // - trocando: sem botão grande; a sigla atual marcada, com a legenda "seu estado agora".
  const atual = trocando ? ufSalva : '';
  const sugerida = trocando ? '' : ufConexao;
  return (
    <div className="surgir pagina">
      <Head>
        <title>Sua cédula em 2026 | Lume</title>
        <meta name="description" content="Escolha o seu estado e veja quem disputa cada cargo da sua cédula em 4 de outubro de 2026, na ordem da urna, com a ficha de cada candidato." />
      </Head>

      <NavPraVoce />
      <div style={{ maxWidth: '760px' }}>
        <span style={{ fontSize: '0.78rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: t.cor.ouroTexto }}>Eleição de 4 de outubro de 2026</span>
        <h1 style={{ fontFamily: t.fonte.titulo, fontWeight: 600, fontSize: 'clamp(1.9rem,5vw,2.8rem)', lineHeight: 1.1, margin: '10px 0 10px' }}>
          {trocando ? 'Trocar de estado' : <>Sua cédula, <span style={{ color: t.cor.ouroTexto }}>cargo por cargo</span>.</>}
        </h1>
        <p style={{ color: t.cor.cinza, fontSize: '1.05rem', margin: '0 0 28px', lineHeight: 1.55 }}>
          {trocando
            ? 'Toque no estado em que você vota. A cédula dele abre na hora.'
            : 'Quem disputa cada um dos cinco cargos no seu estado, na ordem em que a urna vai perguntar: deputado federal, deputado estadual, senador, governador e presidente. Sem cadastro.'}
        </p>

        {sugerida && (
          <div style={{ marginBottom: '30px' }}>
            <Link href={`/comecar?uf=${sugerida}`} style={botaoPrimario} onMouseOver={(e) => realce(e, true)} onMouseOut={(e) => realce(e, false)}>
              Ver a cédula {deUf(sugerida)} →
            </Link>
            <p style={{ margin: '8px 0 0 6px', fontSize: '0.82rem', color: t.cor.cinza }}>estado estimado pela sua conexão; se não for o seu, escolha abaixo</p>
          </div>
        )}

        <h2 style={{ fontSize: '1.1rem', margin: '0 0 14px' }}>{trocando ? 'Estados' : sugerida ? 'Ou escolha outro estado' : 'Em que estado você vota?'}</h2>
        {/* Tocar no estado já abre a cédula: uma pergunta só não precisa de botão de enviar. */}
        <nav aria-label="Estados" style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
          {UFS.map((u) => (
            <Link key={u} href={`/comecar?uf=${u}`} aria-label={`${NOMES_UF[u] || u}${u === atual ? ', seu estado agora' : ''}`} title={NOMES_UF[u] || u}
              aria-current={u === atual ? 'true' : undefined}
              style={{ ...pilula(u === atual), textDecoration: 'none', minWidth: '52px', textAlign: 'center' }}
              onMouseOver={(e) => realce(e, true)} onMouseOut={(e) => realce(e, false)}>{u}</Link>
          ))}
        </nav>
        {atual && (
          <p style={{ margin: '12px 0 0 4px', fontSize: '0.84rem', color: t.cor.cinza }}>
            Em destaque, o seu estado agora: <strong style={{ color: t.cor.tinta }}>{nomeDe(atual)}</strong>.
          </p>
        )}

        <p style={{ margin: '34px 0 0', padding: '14px 18px', borderRadius: t.raio.md, background: t.cor.papelQuente, fontSize: '0.9rem', lineHeight: 1.55, color: t.cor.tinta }}>
          Procurando votações sobre um tema, como saúde ou educação? Elas estão em{' '}
          <Link href="/votacoes" style={{ color: t.cor.ouroTexto, fontWeight: 700 }}>Votações</Link>, com filtro por tema.
        </p>
      </div>
    </div>
  );
}

// CONVITE AO "QUEM VOTA COMO VOCÊ" QUE SABE O QUE A PESSOA JÁ FEZ (27/09/2026, pedido do Jordy:
// quem já respondeu via "Responder" e ficava na dúvida se tinha perdido as respostas). Conta as
// respostas deste navegador (que já incluem as do perfil, pela sincronização) entre as perguntas
// que valem para o estado. Três estados do cartão: nenhuma, algumas, todas. Antes de ler o
// navegador, o cartão mostra só o título e a descrição, para não trocar de texto na frente da pessoa.
function ConviteAfinidade({ uf }) {
  const [n, setN] = useState(null);
  const doEstado = PERGUNTAS_AFINIDADE.filter((p) => !p.uf || p.uf === uf);
  useEffect(() => {
    const contar = () => { const r = lerRespostasLocais(); setN(doEstado.filter((p) => r[p.id]).length); };
    contar();
    window.addEventListener(EVENTO_RESPOSTAS, contar);
    return () => window.removeEventListener(EVENTO_RESPOSTAS, contar);
  }, [uf]); // eslint-disable-line react-hooks/exhaustive-deps
  const total = doEstado.length;
  const todas = n != null && n >= total;
  const algumas = n != null && n > 0 && !todas;
  // Com respostas, o link já pede o resultado (?ver=1): a página calcula sozinha ao abrir.
  const href = n > 0 ? `/afinidade?uf=${uf}&ver=1` : `/afinidade?uf=${uf}`;
  const acao = n == null ? '' : todas ? 'Ver quem votou como você →' : algumas ? 'Ver o resultado ou continuar respondendo →' : 'Responder →';
  return (
    <Link href={href} style={{ display: 'block', textDecoration: 'none', color: t.cor.tinta, background: '#fff', borderRadius: t.raio.md, padding: '18px 20px', marginBottom: '34px', boxShadow: t.sombra.clicavel, transition: 'box-shadow .15s, transform .15s', maxWidth: '760px' }} onMouseOver={(e) => { e.currentTarget.style.boxShadow = t.sombra.hover; e.currentTarget.style.transform = 'translateY(-2px)'; }} onMouseOut={(e) => { e.currentTarget.style.boxShadow = t.sombra.clicavel; e.currentTarget.style.transform = 'none'; }}>
      <strong style={{ fontSize: '1.05rem' }}>Quem vota como você?</strong>
      {n > 0 ? (
        <span style={{ display: 'block', marginTop: '4px', fontSize: '0.88rem', color: t.cor.tinta, lineHeight: 1.5 }}>
          <strong>{todas ? `Você já respondeu as ${total} perguntas.` : `Você já respondeu ${n} de ${total} perguntas.`}</strong>{' '}
          <span style={{ color: t.cor.cinza }}>Suas respostas estão guardadas{todas ? '' : ', e dá para continuar de onde parou'}. Veja quais parlamentares e candidatos do {uf} votaram como você.</span>
        </span>
      ) : (
        <span style={{ display: 'block', marginTop: '4px', fontSize: '0.88rem', color: t.cor.cinza, lineHeight: 1.5 }}>
          Responda votações que já aconteceram no Congresso e veja quais candidatos do {uf} votaram como você, pelo voto registrado de cada um.
        </span>
      )}
      {acao && <span style={{ display: 'inline-block', marginTop: '8px', fontSize: '0.85rem', fontWeight: 700, color: t.cor.ouroTexto }}>{acao}</span>}
    </Link>
  );
}

const UF_VALIDA = new Set(UFS);

export async function getServerSideProps({ query, req }) {
  const ufSel = query.uf ? String(query.uf).toUpperCase().slice(0, 2) : '';
  const temasAntigos = query.temas ? String(query.temas).split(',').map((x) => x.trim()).filter(Boolean) : [];

  // Links antigos (/comecar?temas=Saúde, sem estado): o que eles mostravam agora mora nas
  // votações da Câmara, com o filtro de tema já aplicado.
  if (!ufSel && temasAntigos.length > 0) {
    return { redirect: { destination: `/votacoes/camara?tema=${encodeURIComponent(temasAntigos[0])}`, permanent: false } };
  }

  if (!UF_VALIDA.has(ufSel)) {
    // Estado já conhecido (cookie gravado quando a pessoa escolhe um estado): vai direto para a
    // cédula dele. "Trocar estado" (?trocar=1) é o único caminho que fica nesta tela com estado.
    const trocando = Boolean(query.trocar);
    const ufCookie = String(req.cookies?.[COOKIE_UF] || '').toUpperCase();
    const ufAtual = UF_VALIDA.has(ufCookie) ? ufCookie : '';
    if (ufAtual && !trocando) return { redirect: { destination: `/comecar?uf=${ufAtual}`, permanent: false } };
    // Estado da conexão (x-vercel-ip-country-region), só como sugestão. Não guardamos nada.
    const pais = String(req.headers['x-vercel-ip-country'] || '').toUpperCase();
    const regiao = String(req.headers['x-vercel-ip-country-region'] || '').toUpperCase();
    const ufConexao = pais === 'BR' && UF_VALIDA.has(regiao) ? regiao : '';
    return { props: { modo: 'quiz', ufSel: '', ufConexao, cedula: null, trocando, ufAtual } };
  }

  const cedula = await ServicoAPI.montarCedula({ uf: ufSel, ano: 2026 }).catch(() => null);
  return { props: { modo: 'resultado', ufSel, ufConexao: '', cedula: JSON.parse(JSON.stringify(cedula)) } };
}
