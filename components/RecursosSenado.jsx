// Secao "Fora da cota e beneficios" do perfil de senador (19/10/2026).
// Mostra os blocos do portal do Senado que o Lume nao tinha: gastos NAO inclusos nas cotas,
// beneficios (auxilio-moradia, imovel funcional) e pessoal (gabinete e escritorios de apoio).
// Fonte: API de dados abertos do Senado (recursos-utilizados), coletada todo dia.
import { t } from '../src/estilo/tokens';

const brlExato = (v) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);
const subtitulo = { fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: t.cor.cinza, margin: '0 0 10px' };
const linha = { display: 'flex', justifyContent: 'space-between', gap: '16px', padding: '10px 14px', background: t.cor.papelQuente, borderRadius: t.raio.md, fontSize: '0.92rem' };

export default function RecursosSenado({ recurso, ano }) {
  if (!recurso) {
    return <p style={{ color: t.cor.cinza, fontSize: '0.9rem', margin: 0 }}>O Senado não publicou estes dados para {ano}.</p>;
  }
  const itens = Array.isArray(recurso.nao_inclusos) ? recurso.nao_inclusos : [];
  const comValor = itens.filter((i) => Number(i.valor) > 0).sort((a, b) => b.valor - a.valor);
  const zerados = itens.filter((i) => !(Number(i.valor) > 0));
  const beneficios = Array.isArray(recurso.beneficios) ? recurso.beneficios : [];
  const pessoal = Array.isArray(recurso.pessoal) ? recurso.pessoal : [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
      <div>
        <h3 style={subtitulo}>Gastos fora da cota</h3>
        <p style={{ color: t.cor.cinza, fontSize: '0.85rem', margin: '0 0 12px', lineHeight: 1.5 }}>
          Despesas do gabinete que o Senado registra fora da cota para o exercício da atividade parlamentar (CEAPS). Por isso <strong>não entram</strong> no total de gastos acima.
        </p>
        {comValor.length === 0 ? (
          <p style={{ color: t.cor.cinza, fontSize: '0.9rem', margin: 0 }}>Nenhum valor registrado em {ano}.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {comValor.map((i) => (
              <div key={i.recurso} style={linha}><span>{i.recurso}</span><strong>{brlExato(i.valor)}</strong></div>
            ))}
            <div style={{ ...linha, background: 'transparent', paddingTop: '4px' }}><span style={{ fontWeight: 700 }}>Total fora da cota em {ano}</span><strong>{brlExato(recurso.nao_inclusos_total)}</strong></div>
          </div>
        )}
        {zerados.length > 0 && (
          <p style={{ color: t.cor.cinza, fontSize: '0.8rem', margin: '10px 0 0', lineHeight: 1.5 }}>Sem valor em {ano}: {zerados.map((z) => z.recurso).join('; ')}.</p>
        )}
      </div>

      {beneficios.length > 0 && (
        <div>
          <h3 style={subtitulo}>Benefícios</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {beneficios.map((b) => (
              <div key={b.beneficio} style={linha}><span>{b.beneficio}</span><strong>{b.utilizacao}</strong></div>
            ))}
          </div>
          <p style={{ color: t.cor.cinza, fontSize: '0.8rem', margin: '10px 0 0', lineHeight: 1.5 }}>
            O Senado informa apenas se o benefício foi usado no ano, sem o valor.
          </p>
        </div>
      )}

      {pessoal.length > 0 && (
        <div>
          <h3 style={subtitulo}>Pessoal</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {pessoal.map((p) => (
              <div key={p.local} style={{ ...linha, flexDirection: 'column', gap: '6px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '16px' }}><strong>{p.local}</strong><strong>{p.quantidade} {Number(p.quantidade) === 1 ? 'pessoa' : 'pessoas'}</strong></div>
                {(p.vinculos || []).map((v) => (
                  <div key={v.vinculo} style={{ display: 'flex', justifyContent: 'space-between', gap: '16px', color: t.cor.cinza, fontSize: '0.85rem' }}><span>{v.vinculo}</span><span>{v.quantidade}</span></div>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
