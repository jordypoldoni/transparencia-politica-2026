import { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import ServicoAPI from '../src/servicos/servico_api';
import Avatar from '../components/Avatar';
import CampoSelect from '../components/CampoSelect';
import CampoBusca from '../components/CampoBusca';
import { NOMES_UF } from '../src/lib/cotas';
import { t } from '../src/estilo/tokens';

const brl = (v) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(v || 0);

export default function Parlamentares({ deputados, qInicial, ufInicial, casaInicial, radarCamara = [], radarSenado = [], radarEstadual = [] }) {
  const [busca, setBusca] = useState(qInicial || '');
  const [uf, setUf] = useState(ufInicial || '');
  const [casa, setCasa] = useState(casaInicial || 'Câmara');
  // Sincroniza ao navegar entre Deputados/Senadores (mesma rota, props mudam no cliente).
  useEffect(() => { setCasa(casaInicial || 'Câmara'); setUf(''); }, [casaInicial]);
  // "Senadores" é uma página própria; "Deputados" agrupa federais + estaduais.
  const grupo = casa === 'Senado' ? 'senador' : 'deputado';
  // Ranking de gastos da casa ativa (troca junto com o toggle Federais/Estaduais e a rota Senadores).
  const radar = casa === 'Senado' ? radarSenado : casa === 'Assembleia (SP)' ? radarEstadual : radarCamara;

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

  return (
    <div className="pagina">
      <h1 style={{ fontFamily: t.fonte.titulo, fontWeight: 600, fontSize: 'clamp(1.8rem,4vw,2.6rem)', margin: '0 0 16px' }}>
        {casa === 'Senado' ? 'Senadores' : casa === 'Assembleia (SP)' ? 'Deputados Estaduais — São Paulo' : 'Deputados Federais'}
      </h1>

      {/* Alternância só entre deputados (federais x estaduais). Senadores é página própria. */}
      {grupo === 'deputado' && (
        <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', flexWrap: 'wrap' }} role="tablist" aria-label="Tipo de deputado">
          <button onClick={() => { setCasa('Câmara'); setUf(''); }} style={pilulaCasa(casa === 'Câmara')} role="tab" aria-selected={casa === 'Câmara'}>
            Federais ({totalCasa('Câmara')})
          </button>
          <button onClick={() => { setCasa('Assembleia (SP)'); setUf(''); }} style={pilulaCasa(casa === 'Assembleia (SP)')} role="tab" aria-selected={casa === 'Assembleia (SP)'}>
            Estaduais · SP ({totalCasa('Assembleia (SP)')})
          </button>
        </div>
      )}

      <p style={{ color: t.cor.cinza, margin: '0 0 24px' }}>
        {filtrados.length} {casa === 'Senado' ? 'senadores' : casa === 'Assembleia (SP)' ? 'deputados estaduais de SP' : 'deputados federais'}. Clique para ver {casa === 'Assembleia (SP)' ? 'os gastos de gabinete' : 'gastos, votos e coerência'}.
      </p>

      {casa === 'Assembleia (SP)' && (
        <div style={{ background: t.cor.alertaBg, borderRadius: t.raio.sm, padding: '12px 16px', margin: '0 0 20px', fontSize: '0.88rem', color: t.cor.tinta, lineHeight: 1.5 }}>
          <strong>Piloto estadual.</strong> Começamos pela Assembleia de São Paulo (ALESP), que tem dados abertos. Por ora mostramos os <strong>gastos de gabinete</strong>; votações estaduais ainda não entram. Fonte: ALESP.
        </div>
      )}

      {/* Ranking de gastos — quem mais usou a verba (casa ativa) */}
      <section style={{ margin: '0 0 28px' }}>
        <div style={{ background: t.cor.verde, borderRadius: t.raio.lg, padding: 'clamp(20px,3.5vw,32px)', color: '#fff' }}>
          <h2 style={{ fontFamily: t.fonte.titulo, fontWeight: 600, fontSize: 'clamp(1.3rem,2.6vw,1.7rem)', margin: '0 0 6px' }}>
            Quem mais usou a verba pública
          </h2>
          <p style={{ color: 'rgba(255,255,255,0.82)', maxWidth: '64ch', lineHeight: 1.5, margin: '0 0 18px', fontSize: '0.92rem' }}>
            {casa === 'Senado'
              ? 'Senadores que mais usaram a cota (CEAPS) em 2026.'
              : casa === 'Assembleia (SP)'
              ? 'Deputados estaduais de SP que mais usaram a verba de gabinete em 2026.'
              : 'Deputados federais que mais usaram a cota parlamentar em 2026.'}{' '}Toque para ver <em>em quê</em>. Fonte: {casa === 'Senado' ? 'Senado Federal' : casa === 'Assembleia (SP)' ? 'ALESP' : 'Câmara dos Deputados'}.
          </p>
          {radar.length === 0 ? (
            <p style={{ color: 'rgba(255,255,255,0.55)', margin: 0, fontSize: '0.95rem' }}>
              Dados temporariamente indisponíveis. Tente recarregar a página.
            </p>
          ) : (
            <ol style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: '8px' }}>
              {radar.map((p, i) => (
                <li key={p.id}>
                  <Link href={`/deputado/${p.slug}`} style={{ textDecoration: 'none', color: 'inherit', display: 'flex', alignItems: 'center', gap: '14px', background: 'rgba(255,255,255,0.07)', borderRadius: '6px', padding: '12px 16px' }}>
                    <span style={{ flexShrink: 0, width: '26px', fontFamily: t.fonte.titulo, fontWeight: 600, color: t.cor.ouro, fontSize: '1.2rem' }}>{i + 1}</span>
                    <Avatar nome={p.nome_urna} foto={p.foto_url} size={44} />
                    <span style={{ flex: 1, minWidth: 0 }}>
                      <span style={{ display: 'block', fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.nome_urna}</span>
                      <span style={{ fontSize: '0.82rem', opacity: 0.75 }}>{p.partido_atual} · {p.uf_sede} · em {p.n_notas} notas</span>
                    </span>
                    <span style={{ flexShrink: 0, textAlign: 'right' }}>
                      <span style={{ display: 'block', fontWeight: 800, fontSize: '1.05rem' }}>{brl(p.total)}</span>
                      <span style={{ fontSize: '0.72rem', opacity: 0.7 }}>ver no quê →</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ol>
          )}
        </div>
      </section>

      {/* Busca + estado */}
      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '28px', position: 'sticky', top: '70px', zIndex: 10 }}>
        <div style={{ flex: 1, minWidth: '240px' }}>
          <CampoBusca valor={busca} aoMudar={setBusca} placeholder="Buscar por nome ou partido…" aoLabel="Buscar parlamentar" />
        </div>
        {casa !== 'Assembleia (SP)' && (
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
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '14px' }}>
          {filtrados.map((d) => (
            <Link key={d.id} href={`/deputado/${d.slug}`} style={{ textDecoration: 'none', color: 'inherit' }}>
              <div style={{ background: t.cor.papelCartao, borderRadius: t.raio.md, padding: '16px', display: 'flex', gap: '14px', alignItems: 'center', height: '100%', boxShadow: t.sombra.clicavel, transition: 'box-shadow .15s ease, transform .15s ease' }}
                onMouseOver={(e) => { e.currentTarget.style.boxShadow = t.sombra.hover; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                onMouseOut={(e) => { e.currentTarget.style.boxShadow = t.sombra.clicavel; e.currentTarget.style.transform = 'none'; }}>
                <Avatar nome={d.nome} foto={d.foto_url} size={56} />
                <div style={{ minWidth: 0 }}>
                  <p style={{ margin: '0 0 2px', fontWeight: 700, fontSize: '0.98rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{d.nome}</p>
                  <p style={{ margin: '0 0 6px', color: t.cor.cinza, fontSize: '0.82rem' }}>{d.partido} · {d.uf || '—'}</p>
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

export async function getServerSideProps({ query }) {
  const settled = await Promise.allSettled([
    ServicoAPI.listarDeputados(),
    ServicoAPI.getRadarGastos(2026, 10, 'Câmara'),
    ServicoAPI.getRadarGastos(2026, 10, 'Senado'),
    ServicoAPI.getRadarGastos(2026, 10, 'Assembleia (SP)'),
  ]);
  const get = (i) => (settled[i].status === 'fulfilled' ? settled[i].value : []);
  const deputados = get(0);
  const c = String(query.casa || '').toLowerCase();
  const casaInicial = c.includes('sen') ? 'Senado' : (c.includes('sp') || c.includes('estad') || c.includes('alesp')) ? 'Assembleia (SP)' : 'Câmara';
  return {
    props: {
      deputados: JSON.parse(JSON.stringify(deputados)),
      qInicial: query.q || '',
      ufInicial: query.uf || '',
      casaInicial,
      radarCamara: JSON.parse(JSON.stringify(get(1))),
      radarSenado: JSON.parse(JSON.stringify(get(2))),
      radarEstadual: JSON.parse(JSON.stringify(get(3))),
    },
  };
}
