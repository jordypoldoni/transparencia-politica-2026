import { useState, useRef } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import ServicoAPI from '../src/servicos/servico_api';
import Avatar from '../components/Avatar';
import CampoBusca from '../components/CampoBusca';
import CampoSelect from '../components/CampoSelect';
import { NOMES_UF } from '../src/lib/cotas';
import { t } from '../src/estilo/tokens';

const UFS = ['AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'];
const PORPAGINA = 24;

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
  if (chapas.length === 0) return <p style={{ color: t.cor.cinza }}>Nenhum candidato coletado ainda.</p>;
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(300px, 100%), 1fr))', gap: '14px' }}>
      {chapas.map((c) => (
        <Link key={c.nr_candidato || c.presidente.slug} href={`/presidencial/${c.presidente.slug}`} style={{ textDecoration: 'none', color: 'inherit' }}>
          <div style={{ background: t.cor.papelCartao, borderRadius: t.raio.md, padding: '18px', height: '100%', minWidth: 0, overflow: 'hidden', boxShadow: t.sombra.clicavel, transition: 'box-shadow .15s ease, transform .15s ease' }}
            onMouseOver={(e) => { e.currentTarget.style.boxShadow = t.sombra.hover; e.currentTarget.style.transform = 'translateY(-2px)'; }}
            onMouseOut={(e) => { e.currentTarget.style.boxShadow = t.sombra.clicavel; e.currentTarget.style.transform = 'none'; }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px' }}>
              <span style={{ fontSize: '0.78rem', fontWeight: 700, color: t.cor.cinza }}>{c.presidente.partido_sigla}{c.presidente.coligacao_nome ? ` · ${c.presidente.coligacao_nome}` : ''}</span>
              {c.nr_candidato && (
                <span style={{ fontFamily: t.fonte.titulo, fontWeight: 700, fontSize: '1.3rem', color: t.cor.ouroTexto }}>{c.nr_candidato}</span>
              )}
            </div>
            <div style={{ display: 'grid', gap: '12px', minWidth: 0 }}>
              <CardCandidatoPresidencial pessoa={c.presidente} papel="Presidente" />
              {c.vice && <CardCandidatoPresidencial pessoa={c.vice} papel="Vice" />}
            </div>
            {c.presidente.situacao_candidatura && (
              <p style={{ margin: '14px 0 0', fontSize: '0.76rem', color: t.cor.cinza }}>Situação da candidatura: {c.presidente.situacao_candidatura}</p>
            )}
            <span style={{ display: 'inline-block', marginTop: '10px', color: t.cor.ouroTexto, fontWeight: 700, fontSize: '0.8rem' }}>Ver ficha e proposta →</span>
          </div>
        </Link>
      ))}
    </div>
  );
}

function CardDeputadoFederal({ d }) {
  return (
    <Link href={`/deputado-federal/${d.slug}`} style={{ textDecoration: 'none', color: 'inherit' }}>
      <div style={{ background: t.cor.papelCartao, borderRadius: t.raio.md, padding: '14px', height: '100%', minWidth: 0, overflow: 'hidden', boxShadow: t.sombra.clicavel, transition: 'box-shadow .15s ease, transform .15s ease', display: 'flex', gap: '12px', alignItems: 'center' }}
        onMouseOver={(e) => { e.currentTarget.style.boxShadow = t.sombra.hover; e.currentTarget.style.transform = 'translateY(-2px)'; }}
        onMouseOut={(e) => { e.currentTarget.style.boxShadow = t.sombra.clicavel; e.currentTarget.style.transform = 'none'; }}>
        <Avatar nome={d.nome_urna} foto={d.foto_url} size={52} />
        <div style={{ minWidth: 0, flex: '1 1 auto' }}>
          <p style={{ margin: 0, fontWeight: 700, fontSize: '0.94rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{d.nome_urna}</p>
          <p style={{ margin: '2px 0 0', fontSize: '0.78rem', color: t.cor.cinza }}>{d.partido_sigla || 'S/P'}{d.nr_candidato ? ` · nº ${d.nr_candidato}` : ''} · {d.uf}</p>
        </div>
      </div>
    </Link>
  );
}

// Busca de candidato a Deputado Federal: mesmo campo padrão do site (pílula, ícone de lupa,
// linha âmbar ao focar) e o MESMO comportamento de /deputados — digita e a lista já vai
// atualizando sozinha, sem botão "Buscar" e sem recarregar a página. A diferença é só por
// baixo dos panos: são 7.703 candidatos, não dá pra carregar tudo no cliente como em
// /deputados (~600 parlamentares), então cada busca vai a um endpoint fino
// (/api/candidatos-deputado-federal, mesmo padrão do /api/buscar-ente.js que já existia
// pra busca de município) em vez de filtrar um array já carregado.
function ListaDeputadoFederal({ dadosIniciais, resumo, filtrosIniciais, paginaInicial }) {
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
    fetch(`/api/candidatos-deputado-federal?${params.toString()}`)
      .then((r) => r.json())
      .then((data) => { if (id === pedidoRef.current) setDados(data); })
      .catch(() => { if (id === pedidoRef.current) setDados({ itens: [], total: 0 }); })
      .finally(() => { if (id === pedidoRef.current) setCarregando(false); });

    // Mantém a URL em dia (link compartilhável, botão voltar do navegador) sem recarregar a página.
    const q = new URLSearchParams({ cargo: 'deputado-federal' });
    if (ufAlvo) q.set('uf', ufAlvo);
    if (partido) q.set('partido', partido);
    if (buscaAlvo) q.set('busca', buscaAlvo);
    if (paginaAlvo > 1) q.set('pagina', String(paginaAlvo));
    router.replace(`/candidatos-2026?${q.toString()}`, undefined, { shallow: true });
  };

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
    setUf(''); setBusca(''); setPagina(1); buscar('', '', 1);
  };

  const opcoesUf = [
    { valor: '', rotulo: `Todos os estados (${resumo.total})`, busca: 'todos brasil nacional' },
    ...UFS.map((u) => ({ valor: u, rotulo: `${u} · ${NOMES_UF[u] || u} (${resumo.porUf[u] || 0})`, busca: `${u} ${NOMES_UF[u] || ''}` })),
  ];

  const temFiltro = !!(uf || busca);
  const totalPaginas = Math.max(1, Math.ceil((dados.total || 0) / PORPAGINA));

  return (
    <div>
      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'flex-start', marginBottom: '16px' }}>
        <div style={{ flex: '1 1 220px', minWidth: '200px' }}>
          <CampoSelect opcoes={opcoesUf} valor={uf} placeholder="Todos os estados" aoLabel="Filtrar por estado" aoSelecionar={aoMudarUf} />
        </div>
        <div style={{ flex: '2 1 240px', minWidth: 0 }}>
          <CampoBusca valor={busca} aoMudar={aoMudarBusca} placeholder="Buscar por nome…" aoLabel="Buscar candidato a Deputado Federal por nome" />
        </div>
        {temFiltro && (
          <button type="button" onClick={limparFiltros}
            style={{ display: 'flex', alignItems: 'center', fontSize: '0.85rem', fontWeight: 700, color: t.cor.ouroTexto, background: 'none', border: 'none', cursor: 'pointer', padding: '0 6px', fontFamily: t.fonte.corpo }}>
            Limpar filtros ✕
          </button>
        )}
      </div>

      <p style={{ color: t.cor.cinza, fontSize: '0.86rem', margin: '0 0 14px' }}>
        {carregando ? 'Buscando…' : (
          <>
            {(dados.total || 0).toLocaleString('pt-BR')} candidato{dados.total === 1 ? '' : 's'} encontrado{dados.total === 1 ? '' : 's'}
            {uf ? ` em ${uf} · ${NOMES_UF[uf] || ''}` : ' em todo o Brasil'}.
          </>
        )}
      </p>

      {!carregando && dados.itens.length === 0 ? (
        <p style={{ color: t.cor.cinza }}>Nenhum candidato encontrado com esses filtros, tente limpar a busca ou trocar de estado.</p>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(280px, 100%), 1fr))', gap: '12px', opacity: carregando ? 0.5 : 1, transition: 'opacity .15s' }}>
          {dados.itens.map((d) => <CardDeputadoFederal key={d.id} d={d} />)}
        </div>
      )}

      {totalPaginas > 1 && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '14px', marginTop: '28px', flexWrap: 'wrap' }}>
          <button type="button" disabled={pagina <= 1} onClick={() => aoMudarPagina(pagina - 1)}
            style={{ border: 'none', cursor: pagina <= 1 ? 'default' : 'pointer', opacity: pagina <= 1 ? 0.4 : 1, background: t.cor.papelQuente2, color: t.cor.tinta, fontWeight: 700, fontSize: '0.85rem', padding: '10px 18px', borderRadius: t.raio.pill }}>
            ← Anterior
          </button>
          <span style={{ fontSize: '0.85rem', color: t.cor.cinza, fontWeight: 600 }}>Página {pagina} de {totalPaginas.toLocaleString('pt-BR')}</span>
          <button type="button" disabled={pagina >= totalPaginas} onClick={() => aoMudarPagina(pagina + 1)}
            style={{ border: 'none', cursor: pagina >= totalPaginas ? 'default' : 'pointer', opacity: pagina >= totalPaginas ? 0.4 : 1, background: t.cor.verde, color: '#fff', fontWeight: 700, fontSize: '0.85rem', padding: '10px 18px', borderRadius: t.raio.pill }}>
            Próxima →
          </button>
        </div>
      )}
    </div>
  );
}

export default function Candidatos2026({ cargo, chapas, deputados, resumo, filtros, pagina }) {
  const totalPresidente = chapas.length;
  return (
    <div className="pagina">
      <Head>
        <title>Candidatos 2026: Presidente e Deputado Federal | Lume</title>
        <meta name="description" content="Todos os candidatos à Presidência e à Câmara dos Deputados em 2026: partido, coligação e situação da candidatura de cada um, sem análise ou opinião, direto da fonte oficial (TSE)." />
      </Head>

      <h1 style={{ fontFamily: t.fonte.titulo, fontWeight: 600, fontSize: 'clamp(1.8rem,4vw,2.6rem)', margin: '0 0 10px' }}>
        Candidatos 2026
      </h1>
      <p style={{ color: t.cor.cinza, margin: '0 0 22px', maxWidth: '70ch', lineHeight: 1.5 }}>
        Quem disputa a Presidência e a Câmara dos Deputados em 2026: partido, coligação e a situação da candidatura de cada um(a). Dados oficiais do{' '}
        <a href="https://www.tse.jus.br/" target="_blank" rel="noopener noreferrer" style={{ color: t.cor.ouroTexto, fontWeight: 700 }}>TSE</a>, sem análise ou opinião, tire suas próprias conclusões com base nos dados.
      </p>

      <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', flexWrap: 'wrap' }}>
        <Link href="/candidatos-2026?cargo=presidente" style={abaEstilo(cargo === 'presidente')}>
          Presidente ({totalPresidente})
        </Link>
        <Link href="/candidatos-2026?cargo=deputado-federal" style={abaEstilo(cargo === 'deputado-federal')}>
          Deputado Federal ({(resumo.total || 0).toLocaleString('pt-BR')})
        </Link>
      </div>

      {cargo === 'presidente' ? (
        <ListaPresidente chapas={chapas} />
      ) : (
        <ListaDeputadoFederal dadosIniciais={deputados} resumo={resumo} filtrosIniciais={filtros} paginaInicial={pagina} />
      )}
    </div>
  );
}

export async function getServerSideProps({ query }) {
  const cargo = query.cargo === 'deputado-federal' ? 'deputado-federal' : 'presidente';
  const filtros = {
    uf: query.uf ? String(query.uf).toUpperCase().slice(0, 2) : '',
    partido: query.partido ? String(query.partido).toUpperCase() : '',
    busca: query.busca ? String(query.busca).slice(0, 80) : '',
    reeleicao: query.reeleicao === '1',
  };
  const pagina = Math.max(1, parseInt(query.pagina, 10) || 1);

  const [chapas, resumo] = await Promise.all([
    ServicoAPI.listarPresidenciaveis(2026).catch(() => []),
    ServicoAPI.resumoCandidatosDeputadoFederal(2026).catch(() => ({ total: 0, porUf: {} })),
  ]);

  let deputados = { itens: [], total: 0 };
  if (cargo === 'deputado-federal') {
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
      filtros,
      pagina,
      totalPaginas,
    },
  };
}
