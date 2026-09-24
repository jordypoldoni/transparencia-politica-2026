import Link from 'next/link';
import Avatar from './Avatar';
import { t } from '../src/estilo/tokens';

// Cartao de candidato das grades do site. Fonte UNICA: nasceu dentro de
// /candidatos-2026 e passou a ser usado tambem pela cedula do eleitor (/comecar).
// Duas copias do mesmo cartao viram, com o tempo, dois cartoes diferentes.
//
// Mesmo cartao da grade de /deputados: avatar 40, duas linhas e a seta a direita.
// A linha "ver perfil" nao cabe com 5 por linha, e a seta faz o mesmo papel sem
// custar altura.
export default function CardCandidato({ d, hrefBase = '/deputado-federal', selo = null }) {
  return (
    <Link href={`${hrefBase}/${d.slug}`} style={{ textDecoration: 'none', color: 'inherit' }}>
      <div style={{ background: t.cor.papelCartao, borderRadius: t.raio.md, padding: '11px 12px', height: '100%', minWidth: 0, overflow: 'hidden', boxShadow: t.sombra.clicavel, transition: 'box-shadow .15s ease, transform .15s ease', display: 'flex', gap: '10px', alignItems: 'center' }}
        onMouseOver={(e) => { e.currentTarget.style.boxShadow = t.sombra.hover; e.currentTarget.style.transform = 'translateY(-2px)'; }}
        onMouseOut={(e) => { e.currentTarget.style.boxShadow = t.sombra.clicavel; e.currentTarget.style.transform = 'none'; }}>
        <Avatar nome={d.nome_urna} foto={d.foto_url} size={40} />
        <div style={{ minWidth: 0, flex: 1 }}>
          <p style={{ margin: 0, fontWeight: 700, fontSize: '0.88rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{d.nome_urna}</p>
          <p style={{ margin: '2px 0 0', fontSize: '0.76rem', color: t.cor.cinza, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{d.partido_sigla || 'S/P'}{d.nr_candidato ? ` · nº ${d.nr_candidato}` : ''}{d.uf ? ` · ${d.uf}` : ''}</p>
          {selo && (
            <p style={{ margin: '4px 0 0', fontSize: '0.7rem', fontWeight: 700, color: t.cor.ouroTexto, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{selo}</p>
          )}
        </div>
        <span aria-hidden="true" style={{ flexShrink: 0, color: t.cor.ouroTexto, fontWeight: 700, fontSize: '0.9rem' }}>→</span>
      </div>
    </Link>
  );
}
