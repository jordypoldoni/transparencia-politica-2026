import Link from 'next/link';
import Avatar from './Avatar';
import BotaoFavorito from './BotaoFavorito';
import { t } from '../src/estilo/tokens';
import { useFavoritos } from '../src/lib/favoritos';

// "SEUS FAVORITOS" na página Pra você (26/09/2026): quem a pessoa marcou com o coração em
// qualquer cartão do site. Some quando não há nenhum (uma seção vazia só ocupa espaço).
// Os favoritos estão neste navegador; quando o login entrar na tela, o texto passa a dizer
// "e no seu perfil" para quem tiver conta e consentimento.
const GRUPOS = [
  { tipo: 'candidato', titulo: 'Candidatos 2026' },
  { tipo: 'parlamentar', titulo: 'Parlamentares' },
  { tipo: 'partido', titulo: 'Partidos' },
];

export default function SeusFavoritos({ semTitulo = false }) {
  const lista = useFavoritos();
  if (!lista.length) return null;
  return (
    <section style={{ marginBottom: '32px' }}>
      {!semTitulo && <h2 style={{ fontFamily: t.fonte.titulo, fontWeight: 600, fontSize: '1.45rem', margin: '0 0 4px' }}>Seus favoritos</h2>}
      <p style={{ color: t.cor.cinza, fontSize: '0.86rem', margin: '0 0 14px', lineHeight: 1.5 }}>
        Quem você marcou com o coração. Ficam guardados neste navegador e, se você tiver conta e autorizar, no seu perfil. Toque no coração para tirar.
      </p>
      {GRUPOS.map((g) => {
        const itens = lista.filter((f) => f.tipo === g.tipo);
        if (!itens.length) return null;
        return (
          <div key={g.tipo} style={{ marginBottom: '16px' }}>
            <p style={{ margin: '0 0 8px', fontSize: '0.74rem', fontWeight: 800, letterSpacing: '0.05em', textTransform: 'uppercase', color: t.cor.ouroTexto }}>{g.titulo}</p>
            <div style={{ display: 'grid', gap: '10px', alignItems: 'start', gridTemplateColumns: 'repeat(auto-fill, minmax(min(280px, 100%), 1fr))' }}>
              {itens.map((f) => (
                <div key={`${f.tipo}|${f.chave}`} style={{ background: t.cor.papelCartao, borderRadius: t.raio.md, padding: '11px 10px 11px 12px', boxShadow: t.sombra.sutil, display: 'flex', gap: '10px', alignItems: 'center' }}>
                  {f.tipo !== 'partido' && <Avatar nome={f.rotulo} foto={f.foto} size={40} />}
                  <div style={{ minWidth: 0, flex: 1 }}>
                    {f.tipo === 'partido'
                      ? <p style={{ margin: 0, fontWeight: 800, color: t.cor.tinta }}>{f.rotulo}</p>
                      : <Link href={f.chave} style={{ fontWeight: 700, fontSize: '0.9rem', color: t.cor.tinta, textDecoration: 'none' }}>{f.rotulo}</Link>}
                    {f.detalhe && f.tipo !== 'partido' && (
                      <p style={{ margin: '2px 0 0', fontSize: '0.76rem', color: t.cor.cinza, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{f.detalhe}</p>
                    )}
                  </div>
                  <BotaoFavorito tipo={f.tipo} chave={f.chave} rotulo={f.rotulo} detalhe={f.detalhe} foto={f.foto} />
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </section>
  );
}
