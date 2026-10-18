import Head from 'next/head';
import Link from 'next/link';
import { t } from '../src/estilo/tokens';
import { CORRECOES } from '../src/dados/correcoes';
import { linkErro } from '../src/lib/contato';
import { dataBr } from '../src/lib/datas';

// CORREÇÕES (18/10/2026, B7): como avisar de um erro e o histórico público do que já foi corrigido.
// O Lume só vale se der para conferir. Quando o erro é nosso, a correção fica registrada aqui, com data.
const h2 = { fontFamily: t.fonte.titulo, fontWeight: 600, fontSize: '1.4rem', margin: '36px 0 12px' };
const p = { color: t.cor.cinza, lineHeight: 1.65, margin: '0 0 12px' };
const forte = { color: t.cor.tinta };

export default function Correcoes() {
  const lista = [...CORRECOES].sort((a, b) => String(b.data).localeCompare(String(a.data)));
  return (
    <div className="pagina">
      <Head>
        <title>Correções | Lume Cidadão</title>
        <link rel="canonical" href="https://www.lumecidadao.com.br/correcoes" />
        <meta name="description" content="Como avisar o Lume Cidadão de um erro e o histórico público do que já foi corrigido, com data, o que mudou e a fonte." />
      </Head>
      <div className="leitura">
        <span style={{ fontSize: '0.8rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: t.cor.ouroTexto }}>Correções</span>
        <h1 style={{ fontFamily: t.fonte.titulo, fontWeight: 600, fontSize: 'clamp(2rem,5vw,2.8rem)', lineHeight: 1.1, margin: '12px 0 16px' }}>
          Quando o erro é nosso, a correção fica à vista
        </h1>
        <p style={{ ...p, fontSize: '1.1rem' }}>
          Os números vêm de fontes oficiais, coletados e calculados por nós. Os dois passos podem falhar.{' '}
          <strong style={forte}>Se você viu algo diferente do que a fonte mostra, avise.</strong> Confirmado o erro, corrigimos e registramos aqui.
        </p>

        <h2 style={h2}>Como avisar</h2>
        <p style={p}>
          Em cada perfil, votação e página de estado há o link <strong style={forte}>“Encontrou um erro? Avise”</strong>. Ele abre o seu e-mail já com a página e o dado,
          e você só escreve o que viu. Se preferir, use o botão abaixo.
        </p>
        <p style={{ margin: '0 0 12px' }}>
          <a href={linkErro({ caminho: '/correcoes', assunto: 'aviso geral' })}
            style={{ display: 'inline-flex', alignItems: 'center', padding: '10px 18px', fontSize: '0.9rem', fontWeight: 700, fontFamily: t.fonte.corpo, borderRadius: t.raio.pill, textDecoration: 'none', background: t.cor.verde, color: t.cor.ouro }}>
            Avisar de um erro
          </a>
        </p>
        <p style={p}>Ajuda muito: o link da página, o dado que parece errado e, se puder, o link da fonte oficial.</p>

        <h2 style={h2}>O que já foi corrigido</h2>
        {lista.length === 0 ? (
          <p style={p}>Nenhuma correção registrada ainda. Quando houver, ela aparece aqui, a mais recente primeiro.</p>
        ) : (
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: '12px' }}>
            {lista.map((c, i) => (
              <li key={i} style={{ background: t.cor.papelQuente, borderRadius: t.raio.md, padding: '14px 16px', boxShadow: t.sombra.sutil }}>
                <p style={{ margin: '0 0 6px', fontSize: '0.82rem', color: t.cor.cinza, fontWeight: 700 }}>{dataBr(c.data)}{c.pagina ? ` · ${c.pagina}` : ''}</p>
                <p style={{ margin: '0 0 6px', lineHeight: 1.55 }}><strong style={forte}>Estava errado:</strong> <span style={{ color: t.cor.cinza }}>{c.erro}</span></p>
                <p style={{ margin: '0 0 6px', lineHeight: 1.55 }}><strong style={forte}>Agora:</strong> <span style={{ color: t.cor.cinza }}>{c.correcao}</span></p>
                {c.fonte && <p style={{ margin: 0, fontSize: '0.85rem', color: t.cor.cinza }}>Fonte: {c.fonte}</p>}
              </li>
            ))}
          </ul>
        )}

        <p style={{ ...p, marginTop: '28px', fontSize: '0.9rem' }}>
          Veja também <Link href="/sobre" style={{ color: t.cor.ouroTexto, fontWeight: 700 }}>de onde vêm os dados e como lemos os números</Link>.
        </p>
      </div>
    </div>
  );
}
