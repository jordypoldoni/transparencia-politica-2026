import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import ServicoAPI from '../src/servicos/servico_api';
import CardCandidato from '../components/CardCandidato';
import SeusFavoritos from '../components/SeusFavoritos';
import NavPraVoce from '../components/NavPraVoce';
import { t } from '../src/estilo/tokens';
import { NOMES_UF } from '../src/lib/cotas';

const UFS = ['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'];

const pilula = (ativo) => ({
  padding: '9px 16px', fontSize: '0.9rem', fontWeight: 700, fontFamily: t.fonte.corpo,
  borderRadius: t.raio.pill, cursor: 'pointer', border: 'none',
  background: ativo ? t.cor.verde : '#fff', color: ativo ? t.cor.ouro : t.cor.tinta,
  boxShadow: t.sombra.botao, transition: 'background .15s',
});

// Mesmo "Limpar filtros ✕" de /candidatos-2026: texto âmbar escuro, sem fundo e sem borda,
// ao lado dos controles. Um só desenho para a mesma função no site inteiro.
const limparEstilo = {
  display: 'flex', alignItems: 'center', fontSize: '0.85rem', fontWeight: 700,
  color: t.cor.ouroTexto, background: 'none', border: 'none', cursor: 'pointer',
  padding: '0 6px', fontFamily: t.fonte.corpo, textDecoration: 'none',
};

function esquecerPrefs() {
  try { localStorage.removeItem('prefs'); } catch (e) {}
}

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
  const nomeUf = NOMES_UF[uf] || uf;
  const federais = cedula?.federais || { comMandato: [], total: 0 };
  const senadores = cedula?.senadores || [];
  const governadores = cedula?.governadores || [];
  const chapas = cedula?.chapas || [];

  return (
    <>
      <BlocoCargo ordem={1} cargo="Deputado Federal"
        nota={`${federais.total.toLocaleString('pt-BR')} pessoas disputam as cadeiras do ${nomeUf} na Câmara.${federais.comMandato.length > 0 ? ` Abaixo, ${federais.comMandato.length === 1 ? 'o único que já tem' : `os ${federais.comMandato.length} que já têm`} mandato hoje: desses o site mostra também em que gastaram a cota e como votaram.` : ''}`}>
        {federais.comMandato.length > 0 ? (
          <div className="grade-parl">
            {federais.comMandato.map((d) => <CardCandidato key={d.id} d={d} hrefBase="/deputado-federal" selo="já tem mandato" />)}
          </div>
        ) : (
          <AindaNaoTemos texto={`Nenhum candidato do ${nomeUf} tem mandato na Câmara hoje.`} />
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
        nota={uf === 'DF' ? 'No Distrito Federal o cargo equivalente é o de deputado distrital, que ainda não está no site.' : `Quem disputa a Assembleia Legislativa do ${nomeUf}. A lista vem direto do TSE, com a ficha de cada candidato.`}>
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
        nota={`Em 2026 cada estado elege dois senadores, e você vota em dois nomes diferentes. Cada candidato traz dois suplentes, que assumem a cadeira se ele sair: os suplentes estão na ficha de cada um. São ${senadores.length} candidatos no ${nomeUf}.`}>
        {senadores.length > 0 ? (
          <div className="grade-parl">
            {senadores.map((s) => <CardCandidato key={s.id} d={s} hrefBase="/candidato-senador" selo={s.agente_id ? 'já tem mandato' : null} />)}
          </div>
        ) : (
          <AindaNaoTemos texto={`Nenhum candidato ao Senado coletado para o ${nomeUf} até agora.`} />
        )}
      </BlocoCargo>

      <BlocoCargo ordem={4} cargo="Governador"
        nota={`Você vota em um nome. Cada chapa leva um vice, que assume o governo se o titular sair: o vice está na ficha de cada candidato. São ${governadores.length} no ${nomeUf}.`}>
        {governadores.length > 0 ? (
          <div className="grade-parl">
            {governadores.map((g) => <CardCandidato key={g.id} d={g} hrefBase="/candidato-governador" />)}
          </div>
        ) : (
          <AindaNaoTemos texto={`Nenhum candidato a governador coletado para o ${nomeUf} até agora.`} />
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

export default function Comecar({ modo, temasDisponiveis, ufSel, temasSel, cedula, votacoes }) {
  const router = useRouter();
  const [uf, setUf] = useState(ufSel || '');
  const [temas, setTemas] = useState(temasSel || []);

  // Prefill com preferência salva (sem IA — só o que o usuário escolheu antes)
  useEffect(() => {
    if (modo === 'quiz') {
      try {
        const p = JSON.parse(localStorage.getItem('prefs') || '{}');
        if (p.uf) setUf(p.uf);
        if (Array.isArray(p.temas)) setTemas(p.temas);
      } catch (e) {}
    }
  }, [modo]);

  // Salva preferência ao ver o resultado
  useEffect(() => {
    if (modo === 'resultado') {
      try { localStorage.setItem('prefs', JSON.stringify({ uf: ufSel, temas: temasSel })); } catch (e) {}
    }
  }, [modo, ufSel, temasSel]);

  const alternarTema = (nome) => setTemas((arr) => arr.includes(nome) ? arr.filter((x) => x !== nome) : [...arr, nome]);
  const enviar = () => {
    if (!uf && temas.length === 0) return;
    router.push(`/comecar?uf=${uf}&temas=${encodeURIComponent(temas.join(','))}`);
  };
  // Limpa a escolha atual E a preferência guardada. Sem apagar a preferência, o prefill
  // recolocaria estado e temas no segundo seguinte e o botão pareceria não funcionar.
  // Limpar no questionario: zera a escolha atual. Limpar no resultado: o mesmo, e volta ao
  // questionario em branco. Precisa zerar o ESTADO, nao so a URL: a pagina nao e remontada na
  // navegacao interna do Next, entao um router.push sozinho deixaria o estado escolhido de pe.
  const limparQuiz = () => { setUf(''); setTemas([]); esquecerPrefs(); };
  const limparEVoltar = () => { limparQuiz(); router.push('/comecar'); };

  const temFiltro = !!(uf || temas.length > 0);

  // ----- RESULTADO -----
  if (modo === 'resultado') {
    const nomeUf = NOMES_UF[ufSel] || ufSel;
    return (
      <div className="pagina">
        <Head>
          <title>{ufSel ? `Sua cédula em ${ufSel}: quem você vota em 2026 | Lume` : 'Seus temas | Lume'}</title>
          <meta name="description" content={ufSel ? `Quem disputa a sua cédula no ${nomeUf} em 4 de outubro de 2026: deputado federal, senador e presidente, com a ficha de cada candidato.` : 'Votações recentes sobre os temas que você escolheu.'} />
        </Head>

        <NavPraVoce />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '10px' }}>
          <div>
            <span style={{ fontSize: '0.78rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: t.cor.ouroTexto }}>Feito pra você</span>
            <h1 style={{ fontFamily: t.fonte.titulo, fontWeight: 600, fontSize: 'clamp(1.7rem,4vw,2.4rem)', margin: '6px 0 0' }}>
              {ufSel ? `Sua cédula em ${ufSel}` : 'Seus temas'}
            </h1>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            {/* Mesmo botão de limpar de /candidatos-2026. Aqui ele volta ao questionário em
                branco, e esquece a preferência guardada. */}
            <button type="button" onClick={limparEVoltar} style={limparEstilo}>Limpar filtros ✕</button>
            <Link href="/comecar" style={{ textDecoration: 'none', color: t.cor.tinta, fontWeight: 700, fontSize: '0.9rem', padding: '9px 16px', borderRadius: t.raio.pill, background: '#fff', boxShadow: t.sombra.botao }}>✎ editar</Link>
          </div>
        </div>

        <p style={{ color: t.cor.cinza, margin: '0 0 30px', maxWidth: '70ch', lineHeight: 1.5 }}>
          {ufSel
            ? <>Em 4 de outubro de 2026, quem vota no {nomeUf} escolhe cinco cargos, nesta ordem na urna.{temasSel.length > 0 ? ` Seus temas: ${temasSel.join(', ')}.` : ''}</>
            : <>Você ainda não escolheu um estado. Escolha um para ver a sua cédula.</>}
        </p>

        {/* 26/09/2026: favoritos marcados com o coração em qualquer cartão do site. */}
        <SeusFavoritos />

        {/* 26/09/2026: entrada para o questionário de afinidade (/afinidade), sem IA. */}
        {ufSel && (
          <Link href={`/afinidade?uf=${ufSel}`} style={{ display: 'block', textDecoration: 'none', color: t.cor.tinta, background: '#fff', borderRadius: t.raio.md, padding: '18px 20px', marginBottom: '30px', boxShadow: t.sombra.clicavel , transition: 'box-shadow .15s, transform .15s' }} onMouseOver={(e) => { e.currentTarget.style.boxShadow = t.sombra.hover; e.currentTarget.style.transform = 'translateY(-2px)'; }} onMouseOut={(e) => { e.currentTarget.style.boxShadow = t.sombra.clicavel; e.currentTarget.style.transform = 'none'; }}>
            <strong style={{ fontSize: '1.05rem' }}>Quem vota como você?</strong>
            <span style={{ display: 'block', marginTop: '4px', fontSize: '0.88rem', color: t.cor.cinza, lineHeight: 1.5 }}>
              Responda votações que já aconteceram no Congresso e veja quais candidatos do {ufSel} votaram como você, pelo voto registrado de cada um.
            </span>
            <span style={{ display: 'inline-block', marginTop: '8px', fontSize: '0.85rem', fontWeight: 700, color: t.cor.ouroTexto }}>Responder →</span>
          </Link>
        )}

        {ufSel && <Cedula uf={ufSel} cedula={cedula} />}

        {temasSel.length > 0 && (
          <section style={{ marginTop: '10px' }}>
            <h2 style={{ fontFamily: t.fonte.titulo, fontWeight: 600, fontSize: '1.45rem', margin: '0 0 4px' }}>Votações sobre seus temas</h2>
            <p style={{ color: t.cor.cinza, fontSize: '0.88rem', margin: '0 0 16px' }}>Votações recentes ligadas a: {temasSel.join(', ')}. Fonte: Câmara.</p>
            {votacoes.length > 0 ? (
              <div style={{ display: 'grid', gap: '10px' }}>
                {votacoes.map((v, i) => (
                  <div key={i} style={{ background: '#fff', borderRadius: t.raio.md, padding: '16px 18px', display: 'flex', gap: '14px', alignItems: 'flex-start', boxShadow: t.sombra.sutil }}>
                    <span style={{ flexShrink: 0, fontSize: '0.72rem', fontWeight: 800, padding: '4px 12px', borderRadius: '6px', background: v.aprovacao === 1 ? '#E7F3EC' : '#FBEAE7', color: v.aprovacao === 1 ? t.cor.sim : t.cor.nao }}>
                      {v.aprovacao === 1 ? 'Aprovado' : v.aprovacao === 0 ? 'Rejeitado' : 'Sem resultado'}
                    </span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ margin: '0 0 4px', fontSize: '0.95rem', lineHeight: 1.45 }}>{v.descricao_votacao}</p>
                      <span style={{ fontSize: '0.78rem', color: t.cor.cinza }}>{v.data_voto ? new Date(v.data_voto).toLocaleDateString('pt-BR') : ''}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : <p style={{ color: t.cor.cinza }}>Ainda não encontramos votações nominais recentes sobre esses temas. Volte em breve.</p>}
          </section>
        )}
      </div>
    );
  }

  // ----- QUESTIONÁRIO -----
  return (
    <div className="surgir pagina">
      <Head>
        <title>Monte a sua página | Lume</title>
        <meta name="description" content="Duas perguntas rápidas, sem cadastro: escolha o seu estado e os temas que te importam, e veja quem está na sua cédula em 2026." />
      </Head>

      <NavPraVoce />
      <span style={{ fontSize: '0.78rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: t.cor.ouroTexto }}>2 perguntas rápidas</span>
      <h1 style={{ fontFamily: t.fonte.titulo, fontWeight: 600, fontSize: 'clamp(1.9rem,5vw,2.8rem)', lineHeight: 1.1, margin: '10px 0 10px' }}>
        Vamos mostrar o que importa <span style={{ color: t.cor.ouroTexto }}>pra você</span>.
      </h1>
      <p style={{ color: t.cor.cinza, fontSize: '1.05rem', margin: '0 0 36px', lineHeight: 1.5 }}>
        Sem cadastro, sem IA te vigiando. Você escolhe, a gente direciona. Dá pra mudar quando quiser.
      </p>

      {/* Quem já marcou favoritos vê a lista aqui também, antes mesmo de responder. */}
      <SeusFavoritos />

      {/* 26/09/2026: o questionário de afinidade também tem entrada aqui, e não só depois de
          escolher o estado: é uma ferramenta própria, não um passo da cédula. */}
      <Link href="/afinidade" style={{ display: 'block', textDecoration: 'none', color: t.cor.tinta, background: '#fff', borderRadius: t.raio.md, padding: '18px 20px', marginBottom: '30px', boxShadow: t.sombra.clicavel, transition: 'box-shadow .15s, transform .15s', maxWidth: '720px' }} onMouseOver={(e) => { e.currentTarget.style.boxShadow = t.sombra.hover; e.currentTarget.style.transform = 'translateY(-2px)'; }} onMouseOut={(e) => { e.currentTarget.style.boxShadow = t.sombra.clicavel; e.currentTarget.style.transform = 'none'; }}>
        <strong style={{ fontSize: '1.05rem' }}>Quem vota como você?</strong>
        <span style={{ display: 'block', marginTop: '4px', fontSize: '0.88rem', color: t.cor.cinza, lineHeight: 1.5 }}>
          Responda votações que já aconteceram no Congresso e veja quais candidatos votaram como você, pelo voto registrado de cada um.
        </span>
        <span style={{ display: 'inline-block', marginTop: '8px', fontSize: '0.85rem', fontWeight: 700, color: t.cor.ouroTexto }}>Responder →</span>
      </Link>

      <div style={{ marginBottom: '32px' }}>
        <h2 style={{ fontSize: '1.1rem', margin: '0 0 14px' }}>1. Qual é o seu estado?</h2>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
          {UFS.map((u) => (
            <button key={u} onClick={() => setUf(uf === u ? '' : u)} style={pilula(uf === u)}>{u}</button>
          ))}
        </div>
      </div>

      <div style={{ marginBottom: '40px' }}>
        <h2 style={{ fontSize: '1.1rem', margin: '0 0 14px' }}>2. Quais temas te importam? <span style={{ color: t.cor.cinza, fontWeight: 400, fontSize: '0.9rem' }}>(pode marcar vários)</span></h2>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
          {temasDisponiveis.map((tema) => (
            <button key={tema} onClick={() => alternarTema(tema)} style={pilula(temas.includes(tema))}>{tema}</button>
          ))}
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
        <button onClick={enviar} disabled={!temFiltro}
          style={{ padding: '16px 30px', fontSize: '1.05rem', fontWeight: 700, fontFamily: t.fonte.corpo, color: !temFiltro ? '#fff' : t.cor.ouro, background: !temFiltro ? t.cor.cinza : t.cor.verde, border: 'none', borderRadius: t.raio.pill, cursor: !temFiltro ? 'not-allowed' : 'pointer', boxShadow: !temFiltro ? 'none' : t.sombra.botao }}>
          Ver o que importa pra mim →
        </button>
        {temFiltro && (
          <button type="button" onClick={limparQuiz} style={limparEstilo}>Limpar filtros ✕</button>
        )}
      </div>
    </div>
  );
}

export async function getServerSideProps({ query }) {
  const temasDisponiveis = (await ServicoAPI.listarTemas()).map((c) => c.nome_categoria);
  const ufSel = query.uf ? String(query.uf).toUpperCase().slice(0, 2) : '';
  const temasSel = query.temas ? String(query.temas).split(',').map((s) => s.trim()).filter(Boolean) : [];

  if (!ufSel && temasSel.length === 0) {
    return { props: { modo: 'quiz', temasDisponiveis, ufSel: '', temasSel: [], cedula: null, votacoes: [] } };
  }

  const [cedula, votacoes] = await Promise.all([
    ufSel ? ServicoAPI.montarCedula({ uf: ufSel, ano: 2026 }).catch(() => null) : Promise.resolve(null),
    temasSel.length > 0 ? ServicoAPI.getVotacoesPorTemas(temasSel, 8).catch(() => []) : Promise.resolve([]),
  ]);

  return {
    props: {
      modo: 'resultado', temasDisponiveis, ufSel, temasSel,
      cedula: JSON.parse(JSON.stringify(cedula)),
      votacoes: JSON.parse(JSON.stringify(votacoes)),
    },
  };
}
