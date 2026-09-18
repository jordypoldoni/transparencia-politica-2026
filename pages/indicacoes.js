import { useState, useMemo } from 'react';
import Link from 'next/link';
import Head from 'next/head';
import ServicoAPI from '../src/servicos/servico_api';
import CampoBusca from '../components/CampoBusca';
import CampoSelect from '../components/CampoSelect';
import { t } from '../src/estilo/tokens';

// /indicacoes — as indicações do presidente e o que o Senado fez com elas. (18/09/2026)
//
// POR QUE ESTA PÁGINA EXISTE
// Pelo art. 52 da Constituição, uma lista de cargos só é preenchida depois que o Senado
// aprova o nome que o presidente manda: ministro do STF e do STJ, presidente e diretor do
// Banco Central e das agências reguladoras, procurador-geral, defensor público-geral,
// embaixador. É poder de nomeação do Executivo com veto do Legislativo, acontece o ano
// inteiro e quase não aparece — cada indicação vira notícia isolada e ninguém vê a série.
//
// A SÉRIE É A INFORMAÇÃO. Vistas de uma vez, 183 indicações mostram o que nenhuma isolada
// mostra: aprovação é a regra (177 votadas, 2 rejeitadas) e o placar típico é folgado. É esse
// pano de fundo que dá tamanho à exceção — Messias rejeitado por 42 a 34 para o STF, contra
// aprovações de 67 a 8 e 40 a 1. O site não precisa dizer que isso é notável; posto ao lado
// das outras 182, fica evidente sozinho.
//
// NEUTRALIDADE: nenhum adjetivo, nenhum ranking, nenhuma leitura política. Nome, cargo,
// órgão, data, resultado e placar, como a fonte publica. Quem lê tira a conclusão.

const dataBR = (d) => (d ? new Date(d + 'T12:00:00').toLocaleDateString('pt-BR') : '');

const RESULTADOS = [
  { valor: '', rotulo: 'Qualquer resultado' },
  { valor: 'aprovado', rotulo: 'Aprovadas' },
  { valor: 'rejeitado', rotulo: 'Rejeitadas' },
  { valor: 'pendente', rotulo: 'Ainda sem votação' },
];

const TIPOS = [
  { valor: '', rotulo: 'Todos os órgãos' },
  { valor: 'judiciario', rotulo: 'Judiciário' },
  { valor: 'agencia', rotulo: 'Agências e Banco Central' },
  { valor: 'diplomacia', rotulo: 'Diplomacia' },
  { valor: 'controle', rotulo: 'Controle e Ministério Público' },
  { valor: 'defensoria', rotulo: 'Defensoria' },
  { valor: 'outro', rotulo: 'Outros' },
];

const badgeResultado = (r) => ({
  fontSize: '0.72rem', fontWeight: 800, padding: '4px 10px', borderRadius: '6px',
  textTransform: 'uppercase', letterSpacing: '0.03em', whiteSpace: 'nowrap',
  background: r === 'Aprovado' ? '#E7F3EC' : r === 'Rejeitado' ? '#FBEAE7' : '#EEEDE8',
  color: r === 'Aprovado' ? t.cor.sim : r === 'Rejeitado' ? t.cor.nao : t.cor.cinza,
});

// NÃO existe estilo de campo aqui. A primeira versão desta página desenhou <input> e <select>
// nativos, com canto de 10px e a caixa do sistema operacional por cima — contra duas regras
// fixas do projeto: "botões clicáveis = formato PÍLULA, inegociável" e "botão nunca tem linha
// de contorno". O site já tem CampoBusca e CampoSelect, em pílula, sem borda e com anel âmbar
// no foco. Padrão do site não se reimplementa; se importa.

function Numero({ valor, rotulo }) {
  return (
    <div>
      <p style={{ margin: 0, fontFamily: t.fonte.titulo, fontWeight: 600, fontSize: 'clamp(1.6rem,4vw,2.2rem)', lineHeight: 1.1, color: t.cor.tinta }}>{valor}</p>
      <p style={{ margin: '2px 0 0', fontSize: '0.8rem', color: t.cor.cinza, lineHeight: 1.4 }}>{rotulo}</p>
    </div>
  );
}

export default function Indicacoes({ indicacoes }) {
  const [busca, setBusca] = useState('');
  const [tipo, setTipo] = useState('');
  const [ano, setAno] = useState('');
  const [resultado, setResultado] = useState('');

  const opcoesAno = useMemo(() => [
    { valor: '', rotulo: 'Todos os anos' },
    ...[...new Set(indicacoes.map((i) => i.ano).filter(Boolean))]
      .sort((a, b) => b - a)
      .map((a) => ({ valor: String(a), rotulo: String(a) })),
  ], [indicacoes]);

  const filtradas = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return indicacoes.filter((i) => {
      if (tipo && i.tipo_orgao !== tipo) return false;
      if (ano && String(i.ano) !== ano) return false;
      if (resultado === 'rejeitado' && i.resultado !== 'Rejeitado') return false;
      if (resultado === 'aprovado' && i.resultado !== 'Aprovado') return false;
      if (resultado === 'pendente' && i.votada) return false;
      if (!q) return true;
      return `${i.nome_indicado || ''} ${i.cargo || ''} ${i.orgao || ''} ${i.identificacao || ''}`
        .toLowerCase().includes(q);
    });
  }, [indicacoes, busca, tipo, ano, resultado]);

  const votadas = indicacoes.filter((i) => i.votada).length;
  const rejeitadas = indicacoes.filter((i) => i.resultado === 'Rejeitado').length;

  const titulo = 'Indicações do presidente e o voto do Senado';
  const desc = `${indicacoes.length} nomes indicados pela Presidência da República e submetidos ao Senado desde 2023: STF, STJ, Banco Central, agências reguladoras, embaixadas. Resultado e placar de cada votação, direto da fonte oficial.`;

  return (
    <div className="pagina">
      <Head>
        {/* Template literal numa expressão só, não `{titulo} | Lume`. Com dois filhos de texto
            o React insere um separador `<!-- -->` no HTML servido, e dentro de <title> comentário
            não é comentário: o navegador lê como TEXTO. O título chegava ao Google com
            "<!-- -->" no meio. Depois da hidratação some, então no navegador parece certo —
            e o crawler vê a versão quebrada. */}
        <title>{`${titulo} | Lume`}</title>
        <meta name="description" content={desc} />
        <meta name="robots" content="index, follow" />
        <meta property="og:title" content={titulo} />
        <meta property="og:description" content={desc} />
      </Head>

      <h1 style={{ fontFamily: t.fonte.titulo, fontWeight: 600, fontSize: 'clamp(1.8rem,4.4vw,2.6rem)', margin: '0 0 12px', lineHeight: 1.15 }}>
        Indicações do presidente
      </h1>
      <p style={{ margin: '0 0 24px', fontSize: '1rem', lineHeight: 1.6, color: t.cor.tinta, maxWidth: '62ch' }}>
        Alguns cargos do Estado brasileiro só são preenchidos com o aval do Senado. O presidente
        envia o nome, a comissão sabatina o indicado e o plenário decide. Vale para ministro do
        Supremo e dos tribunais superiores, presidente e diretores do Banco Central e das
        agências reguladoras, procurador-geral da República, defensor público-geral e
        embaixadores.
      </p>

      <div style={{ display: 'flex', gap: 'clamp(20px,5vw,48px)', flexWrap: 'wrap', background: t.cor.papelCartao, borderRadius: t.raio.md, padding: 'clamp(18px,3vw,24px)', boxShadow: t.sombra.sutil, marginBottom: '20px' }}>
        <Numero valor={indicacoes.length} rotulo="indicações desde 2023" />
        <Numero valor={votadas} rotulo="já votadas pelo plenário" />
        <Numero valor={rejeitadas} rotulo={rejeitadas === 1 ? 'rejeitada' : 'rejeitadas'} />
      </div>

      {/* A ressalva vem ANTES da lista, não no rodapé: quem abrir esta página vai procurar
          "como meu senador votou", e precisa descobrir que esse dado não existe antes de
          percorrer 183 linhas atrás dele. */}
      <p style={{ margin: '0 0 24px', fontSize: '0.88rem', lineHeight: 1.6, color: t.cor.tinta, background: t.cor.papelQuente, borderRadius: t.raio.sm, padding: '14px 18px', maxWidth: '68ch' }}>
        <strong style={{ fontWeight: 700 }}>O voto de cada senador é secreto nestas votações</strong>, por
        determinação constitucional. O Senado publica o placar e a lista de quem esteve na
        sessão, mas não como cada um votou — e isso não é omissão da fonte nem deste site.
        Cada ficha mostra tudo que existe.
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(210px,100%), 1fr))', gap: '10px', marginBottom: '20px' }}>
        <CampoBusca valor={busca} aoMudar={setBusca}
          placeholder="Buscar por nome, cargo ou órgão" aoLabel="Buscar indicação" />
        <CampoSelect opcoes={TIPOS} valor={tipo} aoSelecionar={setTipo}
          placeholder="Todos os órgãos" aoLabel="Filtrar por órgão" />
        <CampoSelect opcoes={opcoesAno} valor={ano} aoSelecionar={setAno}
          placeholder="Todos os anos" aoLabel="Filtrar por ano" />
        <CampoSelect opcoes={RESULTADOS} valor={resultado} aoSelecionar={setResultado}
          placeholder="Qualquer resultado" aoLabel="Filtrar por resultado" />
      </div>

      <p style={{ margin: '0 0 12px', fontSize: '0.85rem', color: t.cor.cinza }}>
        {filtradas.length === indicacoes.length
          ? `${indicacoes.length} indicações`
          : `${filtradas.length} de ${indicacoes.length} indicações`}
      </p>

      <div style={{ display: 'grid', gap: '10px' }}>
        {filtradas.map((i) => (
          <Link key={i.codigo_materia} href={`/indicacao/${i.codigo_materia}`} style={{ textDecoration: 'none', color: 'inherit' }}>
            <article
              style={{ background: t.cor.papelCartao, borderRadius: t.raio.md, padding: '16px 18px', boxShadow: t.sombra.clicavel, transition: 'box-shadow .15s ease, transform .15s ease' }}
              onMouseOver={(e) => { e.currentTarget.style.boxShadow = t.sombra.hover; e.currentTarget.style.transform = 'translateY(-2px)'; }}
              onMouseOut={(e) => { e.currentTarget.style.boxShadow = t.sombra.clicavel; e.currentTarget.style.transform = 'none'; }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '14px', flexWrap: 'wrap', alignItems: 'flex-start' }}>
                <div style={{ minWidth: 0, flex: '1 1 320px' }}>
                  <p style={{ margin: 0, fontWeight: 700, fontSize: '1.02rem', lineHeight: 1.35 }}>{i.nome_indicado || i.identificacao}</p>
                  <p style={{ margin: '3px 0 0', fontSize: '0.88rem', lineHeight: 1.45, color: t.cor.tinta }}>{i.cargo}</p>
                  <p style={{ margin: '5px 0 0', fontSize: '0.78rem', color: t.cor.cinza }}>
                    {i.orgao ? `${i.orgao} · ` : ''}{i.identificacao} · enviada em {dataBR(i.data_mensagem)}
                  </p>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <span style={badgeResultado(i.resultado)}>{i.resultado || 'sem votação'}</span>
                  {i.votada && (
                    <p style={{ margin: '6px 0 0', fontSize: '0.8rem', color: t.cor.cinza, whiteSpace: 'nowrap' }}>
                      {i.votos_sim}&nbsp;a&nbsp;{i.votos_nao} · {dataBR(i.data_votacao)}
                    </p>
                  )}
                </div>
              </div>
            </article>
          </Link>
        ))}
      </div>

      {filtradas.length === 0 && (
        <p style={{ color: t.cor.cinza, fontSize: '0.92rem' }}>Nenhuma indicação com esses filtros.</p>
      )}

      <p style={{ marginTop: '28px', fontSize: '0.78rem', lineHeight: 1.6, color: t.cor.cinza }}>
        Fonte: <a href="https://legis.senado.leg.br/dadosabertos" target="_blank" rel="noopener noreferrer" style={{ color: t.cor.ouroTexto, fontWeight: 700 }}>Dados Abertos do Senado Federal</a>.
        As indicações são as Mensagens (MSF) da Presidência da República que submetem um nome
        à apreciação do Senado. Nome e cargo são extraídos da ementa oficial por regra fixa,
        sem interpretação; a ementa completa está em cada ficha.
      </p>
    </div>
  );
}

export async function getServerSideProps() {
  const indicacoes = await ServicoAPI.listarIndicacoes();
  return { props: { indicacoes: JSON.parse(JSON.stringify(indicacoes || [])) } };
}
