import Link from 'next/link';
import Avatar from './Avatar';
import { t } from '../src/estilo/tokens';
import BotaoFavorito from './BotaoFavorito';

// Cartao de candidato das grades do site. Fonte UNICA: nasceu dentro de
// /candidatos-2026 e passou a ser usado tambem pela cedula do eleitor (/comecar).
// Duas copias do mesmo cartao viram, com o tempo, dois cartoes diferentes.
//
// Mesmo cartao da grade de /deputados: avatar 40, duas linhas e a seta a direita.
// A linha "ver perfil" nao cabe com 5 por linha, e a seta faz o mesmo papel sem
// custar altura.
// CARGO pela rota da ficha, para o favorito dizer o que a pessoa é ("Candidato(a) a Senador").
const CARGO_DA_ROTA = {
  '/deputado-federal': 'Candidato(a) a Deputado(a) Federal',
  '/candidato-senador': 'Candidato(a) a Senador(a)',
  '/candidato-governador': 'Candidato(a) a Governador(a)',
  '/candidato-estadual': 'Candidato(a) a Deputado(a) Estadual',
  '/presidencial': 'Candidato(a) a Presidente',
};

// CORAÇÃO (26/09/2026). O cartão inteiro continua clicável, mas o link agora é uma CAMADA por
// trás do conteúdo (posição absoluta cobrindo o cartão), e o coração fica por cima dela. Antes o
// cartão inteiro era o <a>, e botão dentro de link é HTML inválido: o clique no coração abriria
// a ficha. O texto do link vai no aria-label, então o leitor de tela continua ouvindo o nome.
export default function CardCandidato({ d, hrefBase = '/deputado-federal', selo = null }) {
  const href = `${hrefBase}/${d.slug}`;
  const cargo = CARGO_DA_ROTA[hrefBase] || 'Candidato(a)';
  // O conteúdo fica ACIMA do link (zIndex 2) mas deixa o clique passar (pointerEvents none), menos
  // no coração. Sem isso, o transform do hover cria um contexto de empilhamento e o link cobre o
  // coração justamente quando o mouse está em cima do cartão.
  const cartao = { position: 'relative', zIndex: 2, pointerEvents: 'none', background: t.cor.papelCartao, borderRadius: t.raio.md, padding: '11px 10px 11px 12px', height: '100%', minWidth: 0, overflow: 'hidden', boxShadow: t.sombra.clicavel, transition: 'box-shadow .15s ease, transform .15s ease', display: 'flex', gap: '8px', alignItems: 'center' };
  return (
    <div style={{ position: 'relative', height: '100%' }}
      onMouseOver={(e) => { const c = e.currentTarget.firstChild; c.style.boxShadow = t.sombra.hover; c.style.transform = 'translateY(-2px)'; }}
      onMouseOut={(e) => { const c = e.currentTarget.firstChild; c.style.boxShadow = t.sombra.clicavel; c.style.transform = 'none'; }}>
      <div style={cartao}>
        <Avatar nome={d.nome_urna} foto={d.foto_url} size={40} />
        <div style={{ minWidth: 0, flex: 1 }}>
          <p style={{ margin: 0, fontWeight: 700, fontSize: '0.88rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{d.nome_urna}</p>
          <p style={{ margin: '2px 0 0', fontSize: '0.76rem', color: t.cor.cinza, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{d.partido_sigla || 'S/P'}{d.nr_candidato ? ` · nº ${d.nr_candidato}` : ''}{d.uf ? ` · ${d.uf}` : ''}</p>
          {selo && (
            <p style={{ margin: '4px 0 0', fontSize: '0.7rem', fontWeight: 700, color: t.cor.ouroTexto, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{selo}</p>
          )}
        </div>
        <BotaoFavorito tipo="candidato" chave={href} rotulo={d.nome_urna}
          detalhe={[cargo, d.partido_sigla, d.uf].filter(Boolean).join(' · ')} foto={d.foto_url} />
        <span aria-hidden="true" style={{ flexShrink: 0, color: t.cor.ouroTexto, fontWeight: 700, fontSize: '0.9rem' }}>→</span>
      </div>
      <Link href={href} aria-label={`${d.nome_urna}, ver ficha`} style={{ position: 'absolute', inset: 0, zIndex: 1, borderRadius: t.raio.md }} />
    </div>
  );
}
