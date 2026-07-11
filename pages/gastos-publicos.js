import Head from 'next/head';
import { useState, useMemo } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import ServicoAPI from '../src/servicos/servico_api';
import CampoSelect from '../components/CampoSelect';
import BuscaMunicipio from '../components/BuscaMunicipio';
import { Pino } from '../components/icones';
import { t } from '../src/estilo/tokens';

const brlC = (v) => {
  if (v == null) return '—';
  const n = Number(v), a = Math.abs(n);
  if (a >= 1e12) return `R$ ${(n / 1e12).toLocaleString('pt-BR', { maximumFractionDigits: 2 })} tri`;
  if (a >= 1e9) return `R$ ${(n / 1e9).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} bi`;
  if (a >= 1e6) return `R$ ${(n / 1e6).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} mi`;
  return `R$ ${n.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}`;
};

export default function GastosPublicos({ uniao, estados = [], gastosFuncao = [] }) {
  const router = useRouter();

  const estadoOpcoes = useMemo(() => estados.map((e) => ({ valor: String(e.cod_ibge), rotulo: e.ente, busca: e.ente })), [estados]);

  // Funções disponíveis, ordenadas por gasto total (as mais relevantes primeiro).
  const funcoes = useMemo(() => {
    const soma = {};
    for (const g of gastosFuncao) soma[g.funcao] = (soma[g.funcao] || 0) + g.valor;
    return Object.keys(soma).sort((a, b) => soma[b] - soma[a]);
  }, [gastosFuncao]);

  const [funcaoSel, setFuncaoSel] = useState('Saúde');
  const funcaoAtiva = funcoes.includes(funcaoSel) ? funcaoSel : (funcoes[0] || null);

  const ranking = useMemo(() => (
    gastosFuncao
      .filter((g) => g.funcao === funcaoAtiva && g.populacao)
      .map((g) => ({ ...g, por_hab: g.valor / g.populacao }))
      .sort((a, b) => b.por_hab - a.por_hab)
  ), [gastosFuncao, funcaoAtiva]);

  const funcaoOpcoes = funcoes.map((f) => ({ valor: f, rotulo: f, busca: f }));
  const maxHab = ranking.length ? ranking[0].por_hab : 1;

  return (
    <div className="pagina">
      <Head>
        <title>Gastos públicos — União, estados, DF e municípios | Transparência</title>
        <meta name="description" content="Quanto a União, os estados, o DF e os municípios arrecadam e gastam, e para onde vai o dinheiro — por área e por habitante. Fonte: SICONFI/Tesouro Nacional." />
      </Head>

      <h1 style={{ fontFamily: t.fonte.titulo, fontWeight: 600, fontSize: 'clamp(1.8rem,4vw,2.6rem)', margin: '0 0 8px' }}>Gastos públicos</h1>
      <p style={{ color: t.cor.cinza, fontSize: '0.96rem', margin: '0 0 24px', lineHeight: 1.55, maxWidth: '72ch' }}>
        Quanto a União, os estados, o DF e os municípios <strong>arrecadam e gastam</strong>, e em quais áreas — direto da fonte oficial (<a href="https://siconfi.tesouro.gov.br/" target="_blank" rel="noopener noreferrer" style={{ color: t.cor.ouroTexto, fontWeight: 700 }}>SICONFI/Tesouro</a>). São dados <strong>agregados</strong> (quanto e em quais áreas), não contratos individuais. Acumulado de {uniao?.resumo?.ano || '2026'}.
      </p>

      {/* União em destaque */}
      {uniao?.resumo && (
        <Link href="/ente/1" style={{ textDecoration: 'none', color: '#fff', display: 'block', background: t.cor.verde, borderRadius: t.raio.lg, padding: 'clamp(20px,3vw,32px)', marginBottom: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '10px', flexWrap: 'wrap', marginBottom: '16px' }}>
            <span style={{ fontFamily: t.fonte.titulo, fontWeight: 600, fontSize: '1.4rem' }}>União · Governo Federal</span>
            <span style={{ color: t.cor.ouro, fontWeight: 700, fontSize: '0.85rem' }}>ver detalhe →</span>
          </div>
          <div style={{ display: 'flex', gap: '24px 44px', flexWrap: 'wrap' }}>
            <div>
              <div style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'rgba(255,255,255,0.6)' }}>Arrecadou</div>
              <div style={{ fontFamily: t.fonte.titulo, fontWeight: 600, fontSize: '1.6rem' }}>{brlC(uniao.resumo.receita_total)}</div>
            </div>
            <div>
              <div style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'rgba(255,255,255,0.6)' }}>Gastou</div>
              <div style={{ fontFamily: t.fonte.titulo, fontWeight: 600, fontSize: '1.6rem', color: t.cor.ouro }}>{brlC(uniao.resumo.despesa_total)}</div>
            </div>
          </div>
        </Link>
      )}

      {/* Explorar um ente */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px,1fr))', gap: '12px', marginBottom: '24px' }}>
        <div style={{ background: t.cor.papelCartao, borderRadius: t.raio.md, padding: '18px', boxShadow: t.sombra.sutil }}>
          <p style={{ margin: '0 0 10px', fontWeight: 700, fontSize: '0.9rem' }}>Ver um estado ou o DF</p>
          <CampoSelect opcoes={estadoOpcoes} placeholder="Escolha o estado" aoLabel="Estado" icone={<Pino />} aoSelecionar={(cod) => router.push(`/ente/${cod}`)} />
        </div>
        <div style={{ background: t.cor.papelCartao, borderRadius: t.raio.md, padding: '18px', boxShadow: t.sombra.sutil }}>
          <p style={{ margin: '0 0 10px', fontWeight: 700, fontSize: '0.9rem' }}>Ver um município</p>
          <BuscaMunicipio />
        </div>
      </div>

      {/* Ranking por função */}
      <div style={{ background: t.cor.papelCartao, borderRadius: t.raio.lg, padding: 'clamp(20px,3vw,32px)', boxShadow: t.sombra.sutil }}>
        <h2 style={{ fontFamily: t.fonte.titulo, fontWeight: 600, fontSize: '1.4rem', margin: '0 0 6px' }}>Quem mais gasta em cada área</h2>
        <p style={{ color: t.cor.cinza, fontSize: '0.9rem', margin: '0 0 16px', lineHeight: 1.5 }}>
          Escolha a área e veja os <strong>estados e o DF</strong> que mais gastam nela <strong>por habitante</strong> (despesa liquidada ÷ população). Dividir pela população deixa a comparação justa entre entes de tamanhos diferentes.
        </p>

        <div style={{ maxWidth: '340px', marginBottom: '18px' }}>
          <CampoSelect opcoes={funcaoOpcoes} valor={funcaoAtiva || ''} placeholder="Escolha a área" aoLabel="Área do gasto" aoSelecionar={setFuncaoSel} />
        </div>

        {ranking.length > 0 ? (
          <ol style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: '7px' }}>
            {ranking.map((e, i) => (
              <li key={e.cod_ibge}>
                <Link href={`/ente/${e.cod_ibge}`} style={{ textDecoration: 'none', color: 'inherit', display: 'block', background: t.cor.papelQuente, borderRadius: t.raio.md, padding: '11px 14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '6px' }}>
                    <span style={{ width: '22px', flexShrink: 0, fontFamily: t.fonte.titulo, fontWeight: 600, color: t.cor.ouroTexto }}>{i + 1}</span>
                    <span style={{ flex: 1, minWidth: 0, fontWeight: 600, fontSize: '0.92rem' }}>{e.ente}</span>
                    <span style={{ flexShrink: 0, fontWeight: 700, fontSize: '0.92rem' }}>R$ {Math.round(e.por_hab).toLocaleString('pt-BR')}/hab</span>
                  </div>
                  <div style={{ height: '8px', background: t.cor.papelQuente2, borderRadius: '999px', overflow: 'hidden', marginLeft: '34px' }}>
                    <div style={{ width: `${Math.max(2, Math.round((e.por_hab / maxHab) * 100))}%`, height: '100%', background: t.cor.ouro, borderRadius: '999px' }} />
                  </div>
                </Link>
              </li>
            ))}
          </ol>
        ) : (
          <p style={{ color: t.cor.cinza, fontSize: '0.9rem' }}>Sem dados para esta área no período.</p>
        )}

        <p style={{ color: t.cor.cinza, fontSize: '0.82rem', margin: '16px 0 0', lineHeight: 1.5 }}>
          O ranking cobre <strong>União, estados e DF</strong>. Municípios entram pela busca acima (são consultados sob demanda). Fonte: SICONFI/Tesouro Nacional.
        </p>
      </div>
    </div>
  );
}

export async function getServerSideProps() {
  const settled = await Promise.allSettled([
    ServicoAPI.getPanoramaUniao(),
    ServicoAPI.listarEstadosFiscais(),
    ServicoAPI.listarGastosFuncaoEstados(),
  ]);
  const uniao = settled[0].status === 'fulfilled' ? settled[0].value : null;
  const estados = settled[1].status === 'fulfilled' ? settled[1].value : [];
  const gastosFuncao = settled[2].status === 'fulfilled' ? settled[2].value : [];
  return {
    props: {
      uniao: JSON.parse(JSON.stringify(uniao)),
      estados: JSON.parse(JSON.stringify(estados)),
      gastosFuncao: JSON.parse(JSON.stringify(gastosFuncao)),
    },
  };
}
