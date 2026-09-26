import { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import ServicoAPI from '../src/servicos/servico_api';
import CardCandidato from '../components/CardCandidato';
import NavPraVoce from '../components/NavPraVoce';
import { t } from '../src/estilo/tokens';
import { NOMES_UF } from '../src/lib/cotas';

const UFS = ['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'];

// Preposição certa para cada estado (26/09/2026): "no Rio Grande do Sul", "na Bahia",
// "em São Paulo". O texto antigo dizia "no São Paulo" e "do Minas Gerais".
const ARTIGO_UF = {
  AC: 'o', AP: 'o', AM: 'o', CE: 'o', DF: 'o', ES: 'o', MA: 'o', MT: 'o', MS: 'o', PA: 'o', PR: 'o', PI: 'o',
  RJ: 'o', RN: 'o', RS: 'o', TO: 'o', BA: 'a', PB: 'a',
};
const nomeDe = (uf) => NOMES_UF[uf] || uf;
const emUf = (uf) => ({ o: 'no ', a: 'na ' }[ARTIGO_UF[uf]] || 'em ') + nomeDe(uf);
const deUf = (uf) => ({ o: 'do ', a: 'da ' }[ARTIGO_UF[uf]] || 'de ') + nomeDe(uf);
const paraUf = (uf) => ({ o: 'para o ', a: 'para a ' }[ARTIGO_UF[uf]] || 'para ') + nomeDe(uf);

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

  return (
    <>
      <BlocoCargo ordem={1} cargo="Deputado Federal"
        nota={`${federais.total.toLocaleString('pt-BR')} pessoas disputam as cadeiras ${deUf(uf)} na Câmara.${federais.comMandato.length > 0 ? ` Abaixo, ${federais.comMandato.length === 1 ? 'o único que já tem' : `os ${federais.comMandato.length} que já têm`} mandato hoje: desses o site mostra também em que gastaram a cota e como votaram.` : ''}`}>
        {federais.comMandato.length > 0 ? (
          <div className="grade-parl">
            {federais.comMandato.map((d) => <CardCandidato key={d.id} d={d} hrefBase="/deputado-federal" selo="já tem mandato" />)}
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

      {/* 26/09/2026: os estaduais entraram em 25/09, lidos do TSE na hora. O aviso de "ainda não
          coletamos" passou a ser falso e deu lugar ao link para a lista do estado. */}
      <BlocoCargo ordem={2} cargo="Deputado Estadual"
        nota={uf === 'DF' ? 'No Distrito Federal o cargo equivalente é o de deputado distrital, que ainda não está no site.' : `Quem disputa a Assembleia Legislativa ${deUf(uf)}. A lista vem direto do TSE, com a ficha de cada candidato.`}>
        {uf === 'DF' ? (
          <AindaNaoTemos texto="Deputado distrital ainda não está no site." />
        ) : (
          <Link href={`/candidatos-2026?cargo=deputado-estadual&uf=${uf}`}
            style={{ display: 'inline-block', padding: '11px 20px', borderRadius: t.raio.pill, background: t.cor.verde, color: t.cor.ouro, fontWeight: 700, fontSize: '0.88rem', textDecoration: 'none', boxShadow: t.sombra.botao }}>
            Ver os candidatos a deputado estadual do {uf} →
          </Link>
        )}
      </BlocoCargo>

      <BlocoCargo ordem={3} cargo="Senador"
        nota={`Em 2026 cada estado elege dois senadores, e você vota em dois nomes diferentes. Cada candidato traz dois suplentes, que assumem a cadeira se ele sair: os suplentes estão na ficha de cada um. São ${senadores.length} candidatos ${emUf(uf)}.`}>
        {senadores.length > 0 ? (
          <div className="grade-parl">
            {senadores.map((s) => <CardCandidato key={s.id} d={s} hrefBase="/candidato-senador" selo={s.agente_id ? 'já tem mandato' : null} />)}
          </div>
        ) : (
          <AindaNaoTemos texto={`Nenhum candidato ao Senado coletado ${paraUf(uf)} até agora.`} />
        )}
      </BlocoCargo>

      <BlocoCargo ordem={4} cargo="Governador"
        nota={`Você vota em um nome. Cada chapa leva um vice, que assume o governo se o titular sair: o vice está na ficha de cada candidato. São ${governadores.length} ${emUf(uf)}.`}>
        {governadores.length > 0 ? (
          <div className="grade-parl">
            {governadores.map((g) => <CardCandidato key={g.id} d={g} hrefBase="/candidato-governador" />)}
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
                selo={c.vice ? `vice: ${c.vice.nome_urna}` : null} />
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

export default function Comecar({ modo, ufSel, ufConexao, cedula }) {
  const [ufSalva, setUfSalva] = useState('');

  useEffect(() => {
    if (modo === 'resultado') {
      // Guarda só o estado (a página do questionário e o perfil usam o mesmo "prefs").
      try { localStorage.setItem('prefs', JSON.stringify({ uf: ufSel })); } catch (e) {}
    } else {
      try { const p = JSON.parse(localStorage.getItem('prefs') || '{}'); if (UFS.includes(p.uf)) setUfSalva(p.uf); } catch (e) {}
    }
  }, [modo, ufSel]);

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
          <Link href="/comecar?trocar=1" style={{ textDecoration: 'none', color: t.cor.tinta, fontWeight: 700, fontSize: '0.9rem', padding: '9px 16px', borderRadius: t.raio.pill, background: '#fff', boxShadow: t.sombra.botao }}
            onMouseOver={(e) => realce(e, true)} onMouseOut={(e) => realce(e, false)}>Trocar estado</Link>
        </div>

        <p style={{ color: t.cor.cinza, margin: '0 0 24px', maxWidth: '70ch', lineHeight: 1.5 }}>
          Quem vota {emUf(ufSel)} escolhe cinco cargos, nesta ordem na urna.
        </p>

        {/* Convite ao questionário, já com o estado: é o próximo passo natural de quem viu a cédula. */}
        <Link href={`/afinidade?uf=${ufSel}`} style={{ display: 'block', textDecoration: 'none', color: t.cor.tinta, background: '#fff', borderRadius: t.raio.md, padding: '18px 20px', marginBottom: '34px', boxShadow: t.sombra.clicavel, transition: 'box-shadow .15s, transform .15s', maxWidth: '760px' }} onMouseOver={(e) => { e.currentTarget.style.boxShadow = t.sombra.hover; e.currentTarget.style.transform = 'translateY(-2px)'; }} onMouseOut={(e) => { e.currentTarget.style.boxShadow = t.sombra.clicavel; e.currentTarget.style.transform = 'none'; }}>
          <strong style={{ fontSize: '1.05rem' }}>Quem vota como você?</strong>
          <span style={{ display: 'block', marginTop: '4px', fontSize: '0.88rem', color: t.cor.cinza, lineHeight: 1.5 }}>
            Responda votações que já aconteceram no Congresso e veja quais candidatos do {ufSel} votaram como você, pelo voto registrado de cada um.
          </span>
          <span style={{ display: 'inline-block', marginTop: '8px', fontSize: '0.85rem', fontWeight: 700, color: t.cor.ouroTexto }}>Responder →</span>
        </Link>

        <Cedula uf={ufSel} cedula={cedula} />
      </div>
    );
  }

  // ----- ESCOLHA DO ESTADO -----
  // Sugestão: o estado escolhido da última vez; se não houver, o da conexão (cabeçalho da
  // Vercel, nada é guardado). A pessoa sempre pode tocar em outro logo abaixo.
  const sugerida = ufSalva || ufConexao || '';
  const origem = ufSalva ? 'o estado que você escolheu da última vez' : 'estado estimado pela sua conexão';
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
          Sua cédula, <span style={{ color: t.cor.ouroTexto }}>cargo por cargo</span>.
        </h1>
        <p style={{ color: t.cor.cinza, fontSize: '1.05rem', margin: '0 0 28px', lineHeight: 1.55 }}>
          Quem disputa cada um dos cinco cargos no seu estado, na ordem em que a urna vai perguntar: deputado federal,
          deputado estadual, senador, governador e presidente. Sem cadastro.
        </p>

        {sugerida && (
          <div style={{ marginBottom: '30px' }}>
            <Link href={`/comecar?uf=${sugerida}`} style={botaoPrimario} onMouseOver={(e) => realce(e, true)} onMouseOut={(e) => realce(e, false)}>
              Ver a cédula {deUf(sugerida)} →
            </Link>
            <p style={{ margin: '8px 0 0 6px', fontSize: '0.82rem', color: t.cor.cinza }}>{origem}</p>
          </div>
        )}

        <h2 style={{ fontSize: '1.1rem', margin: '0 0 14px' }}>{sugerida ? 'Ou escolha outro estado' : 'Em que estado você vota?'}</h2>
        {/* Tocar no estado já abre a cédula: uma pergunta só não precisa de botão de enviar. */}
        <nav aria-label="Estados" style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
          {UFS.map((u) => (
            <Link key={u} href={`/comecar?uf=${u}`} aria-label={NOMES_UF[u] || u} title={NOMES_UF[u] || u}
              style={{ ...pilula(u === sugerida), textDecoration: 'none', minWidth: '52px', textAlign: 'center' }}
              onMouseOver={(e) => realce(e, true)} onMouseOut={(e) => realce(e, false)}>{u}</Link>
          ))}
        </nav>

        <p style={{ margin: '34px 0 0', padding: '14px 18px', borderRadius: t.raio.md, background: t.cor.papelQuente, fontSize: '0.9rem', lineHeight: 1.55, color: t.cor.tinta }}>
          Procurando votações sobre um tema, como saúde ou educação? Elas estão em{' '}
          <Link href="/votacoes" style={{ color: t.cor.ouroTexto, fontWeight: 700 }}>Votações</Link>, com filtro por tema.
        </p>
      </div>
    </div>
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
    // Estado da conexão (x-vercel-ip-country-region), só como sugestão. Não guardamos nada.
    const pais = String(req.headers['x-vercel-ip-country'] || '').toUpperCase();
    const regiao = String(req.headers['x-vercel-ip-country-region'] || '').toUpperCase();
    const ufConexao = pais === 'BR' && UF_VALIDA.has(regiao) ? regiao : '';
    return { props: { modo: 'quiz', ufSel: '', ufConexao, cedula: null } };
  }

  const cedula = await ServicoAPI.montarCedula({ uf: ufSel, ano: 2026 }).catch(() => null);
  return { props: { modo: 'resultado', ufSel, ufConexao: '', cedula: JSON.parse(JSON.stringify(cedula)) } };
}
