import Head from 'next/head';
import { useRouter } from 'next/router';
import Link from 'next/link';
import ServicoAPI from '../../src/servicos/servico_api';
import { t } from '../../src/estilo/tokens';

const brlCompacto = (v) => {
  if (v == null) return '—';
  const n = Number(v), abs = Math.abs(n);
  if (abs >= 1e12) return `R$ ${(n / 1e12).toLocaleString('pt-BR', { maximumFractionDigits: 2 })} tri`;
  if (abs >= 1e9) return `R$ ${(n / 1e9).toLocaleString('pt-BR', { maximumFractionDigits: 2 })} bi`;
  if (abs >= 1e6) return `R$ ${(n / 1e6).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} mi`;
  if (abs >= 1e3) return `R$ ${(n / 1e3).toLocaleString('pt-BR', { maximumFractionDigits: 0 })} mil`;
  return `R$ ${n.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}`;
};
const porHab = (v, pop) => (v != null && pop ? `R$ ${(v / pop).toLocaleString('pt-BR', { maximumFractionDigits: 0 })}/hab` : null);

const ESFERA = {
  U: 'União · Governo Federal', E: 'Governo estadual', D: 'Governo do Distrito Federal', M: 'Prefeitura municipal',
};
const BIMESTRE_MES = { 1: 'fevereiro', 2: 'abril', 3: 'junho', 4: 'agosto', 5: 'outubro', 6: 'dezembro' };

export default function EntePanorama({ dados }) {
  const router = useRouter();
  const { ente, resumo, funcoes } = dados;
  const nome = ente?.ente || 'Ente';
  const esferaLabel = ESFERA[ente?.esfera] || 'Ente federativo';
  // A União tem um valor de "população" espúrio no dataset do SICONFI (~8,5 mi, sem sentido)
  // e per-capita não se aplica ao orçamento federal → não usamos população para a União.
  const pop = ente?.esfera === 'U' ? null : (resumo?.populacao || ente?.populacao || null);
  const superavit = resumo && resumo.resultado != null && resumo.resultado >= 0;
  const maxFuncao = funcoes && funcoes.length ? Math.max(...funcoes.map((f) => Number(f.valor) || 0), 1) : 1;
  const ateMes = resumo ? BIMESTRE_MES[resumo.periodo] : null;

  return (
    <div className="pagina">
      <Head>
        <title>{`${nome} — arrecadação e gastos | Transparência`}</title>
        <meta name="description" content={`Quanto ${nome} arrecadou e gastou em ${resumo?.ano || ''}, e para onde foi o dinheiro público — por função e por habitante. Fonte: SICONFI/Tesouro Nacional.`} />
      </Head>

      <button onClick={() => router.back()} style={{ ...pilula, background: '#fff', color: t.cor.tinta, marginBottom: '16px', boxShadow: t.sombra.clicavel }}>← Voltar</button>

      {/* Cabeçalho */}
      <div style={{ background: t.cor.verde, color: '#fff', borderRadius: t.raio.lg, padding: 'clamp(24px,4vw,40px)', marginBottom: '20px' }}>
        <span style={{ fontSize: '0.75rem', fontWeight: 800, letterSpacing: '0.07em', textTransform: 'uppercase', color: t.cor.ouro }}>{esferaLabel}</span>
        <h1 style={{ fontFamily: t.fonte.titulo, fontWeight: 600, fontSize: 'clamp(1.7rem,4vw,2.6rem)', margin: '8px 0 4px' }}>{nome}</h1>
        <p style={{ margin: 0, opacity: 0.85 }}>
          {ente?.esfera === 'M' && ente?.uf ? `${ente.uf} · ` : ''}{pop ? `${pop.toLocaleString('pt-BR')} habitantes` : ''}
        </p>
      </div>

      {resumo ? (
        <>
          {/* Arrecadação vs. despesa */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px', marginBottom: '14px' }}>
            <CardNum rotulo="Arrecadou (receita)" valor={brlCompacto(resumo.receita_total)} sub={porHab(resumo.receita_total, pop)} cor={t.cor.sim} />
            <CardNum rotulo="Gastou (despesa)" valor={brlCompacto(resumo.despesa_total)} sub={porHab(resumo.despesa_total, pop)} cor={t.cor.ouroTexto} />
            <CardNum
              rotulo="Diferença no período"
              valor={brlCompacto(resumo.resultado != null ? Math.abs(resumo.resultado) : null)}
              sub={superavit ? 'entrou mais do que saiu (até agora)' : 'saiu mais do que entrou (até agora)'}
              cor={superavit ? t.cor.sim : t.cor.nao}
            />
          </div>
          <p style={{ color: t.cor.cinza, fontSize: '0.86rem', margin: '0 0 24px', lineHeight: 1.5 }}>
            Valores <strong>acumulados no ano de {resumo.ano}</strong>{ateMes ? `, até ${ateMes} (${resumo.periodo}º bimestre)` : ''} — receita realizada e despesa liquidada. A diferença reflete o <strong>momento do ano</strong> (a receita entra ao longo do exercício e a despesa é liquidada aos poucos), não é o resultado fiscal fechado. Fonte oficial: SICONFI / Tesouro Nacional.
          </p>

          {/* Para onde foi — despesa por função */}
          {funcoes && funcoes.length > 0 && (
            <div style={{ background: t.cor.papelCartao, borderRadius: t.raio.lg, padding: 'clamp(20px,3vw,32px)', boxShadow: t.sombra.sutil, marginBottom: '20px' }}>
              <h2 style={{ fontFamily: t.fonte.titulo, fontWeight: 600, fontSize: '1.4rem', margin: '0 0 6px' }}>Para onde foi o dinheiro</h2>
              <p style={{ color: t.cor.cinza, fontSize: '0.9rem', margin: '0 0 20px', lineHeight: 1.5 }}>
                Despesa por <strong>função de governo</strong> — as grandes áreas em que o gasto foi aplicado. Ao lado, o valor por habitante.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {funcoes.map((f, i) => {
                  const larg = Math.max(2, Math.round((Number(f.valor) / maxFuncao) * 100));
                  return (
                    <div key={i}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', alignItems: 'baseline', marginBottom: '4px', flexWrap: 'wrap' }}>
                        <span style={{ fontWeight: 600, fontSize: '0.92rem', color: t.cor.tinta }}>{f.funcao}</span>
                        <span style={{ fontSize: '0.85rem', color: t.cor.cinza }}>
                          <strong style={{ color: t.cor.tinta }}>{brlCompacto(f.valor)}</strong>{porHab(f.valor, pop) ? ` · ${porHab(f.valor, pop)}` : ''}
                        </span>
                      </div>
                      <div style={{ height: '10px', background: t.cor.papelQuente2, borderRadius: '999px', overflow: 'hidden' }}>
                        <div style={{ width: `${larg}%`, height: '100%', background: t.cor.ouro, borderRadius: '999px' }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Fonte */}
          <div style={{ background: t.cor.alertaBg, borderRadius: t.raio.md, padding: '14px 18px', fontSize: '0.86rem', color: t.cor.tinta, lineHeight: 1.5 }}>
            Estes números são <strong>agregados oficiais</strong> do Relatório Resumido da Execução Orçamentária (RREO), declarados pelo próprio ente ao <a href="https://siconfi.tesouro.gov.br/" target="_blank" rel="noopener noreferrer" style={{ color: t.cor.ouroTexto, fontWeight: 700 }}>SICONFI / Tesouro Nacional</a>. Eles mostram <em>quanto</em> e <em>em quais áreas</em> — não contratos individuais.
          </div>
        </>
      ) : (
        <div style={{ background: t.cor.papelCartao, borderRadius: t.raio.lg, padding: 'clamp(24px,4vw,40px)', boxShadow: t.sombra.sutil }}>
          <h2 style={{ fontFamily: t.fonte.titulo, fontWeight: 600, fontSize: '1.3rem', margin: '0 0 8px' }}>Dados fiscais ainda não disponíveis</h2>
          <p style={{ margin: 0, color: t.cor.cinza, fontSize: '0.92rem', lineHeight: 1.5 }}>
            {nome} ainda não tem um Relatório Resumido da Execução Orçamentária publicado no SICONFI para o período mais recente. Assim que o ente declarar, os números aparecem aqui automaticamente.
          </p>
        </div>
      )}
    </div>
  );
}

function CardNum({ rotulo, valor, sub, cor }) {
  return (
    <div style={{ background: t.cor.papelCartao, borderRadius: t.raio.lg, padding: '20px 22px', boxShadow: t.sombra.sutil }}>
      <div style={{ fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: t.cor.cinza, marginBottom: '8px' }}>{rotulo}</div>
      <div style={{ fontFamily: t.fonte.titulo, fontWeight: 600, fontSize: '1.9rem', color: cor || t.cor.tinta, lineHeight: 1.1 }}>{valor}</div>
      {sub && <div style={{ fontSize: '0.82rem', color: t.cor.cinza, marginTop: '4px' }}>{sub}</div>}
    </div>
  );
}

const pilula = {
  display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '10px 18px', fontSize: '0.9rem',
  fontWeight: 700, fontFamily: t.fonte.corpo, borderRadius: t.raio.pill, cursor: 'pointer',
  textDecoration: 'none', border: 'none',
};

export async function getServerSideProps({ params }) {
  const dados = await ServicoAPI.getPanoramaEnte(params.cod);
  if (!dados) return { notFound: true };
  return { props: { dados: JSON.parse(JSON.stringify(dados)) } };
}
