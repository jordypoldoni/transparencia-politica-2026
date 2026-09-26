import { t } from '../src/estilo/tokens';
import { alternarFavorito, useFavorito } from '../src/lib/favoritos';

// CORAÇÃO de favoritar (26/09/2026), em todos os cartões de parlamentar, candidato e partido.
//
// Desenho pelas Diretrizes: formato pílula (aqui um círculo, que é a pílula de um ícone só), sem
// borda, sombra de clicável que cresce no hover; marcado = o par do site, índigo com o coração
// âmbar. No cartão escuro (perfil do parlamentar) o par inverte, como o botão padrão manda.
// Alvo de 36px: passa o mínimo de 24px da WCAG 2.2 com folga.
//
// O botão NUNCA fica dentro de um link: cartões clicáveis que o usam têm o link como camada por
// trás e o coração por cima (ver CardCandidato). Botão dentro de <a> é HTML inválido e o clique
// navegaria junto.
function Coracao({ cheio, cor }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M12 20.5s-7.5-4.6-9.6-9.3C1 8 3 4.5 6.6 4.5c2.1 0 3.6 1.2 4.4 2.6.8-1.4 2.3-2.6 4.4-2.6 3.6 0 5.6 3.5 4.2 6.7-2.1 4.7-9.6 9.3-9.6 9.3z"
        fill={cheio ? cor : 'none'} stroke={cor} strokeWidth="2" strokeLinejoin="round" />
    </svg>
  );
}

export default function BotaoFavorito({ tipo, chave, rotulo, detalhe = null, foto = null, escuro = false, noCartao = true }) {
  const marcado = useFavorito(tipo, chave);
  const fundo = marcado ? (escuro ? t.cor.ouro : t.cor.verde) : (escuro ? 'rgba(255,255,255,0.14)' : (noCartao ? t.cor.papelQuente2 : '#fff'));
  const corIcone = marcado ? (escuro ? t.cor.verde : t.cor.ouro) : (escuro ? '#fff' : t.cor.tinta);
  const acao = marcado ? 'Remover dos favoritos' : 'Adicionar aos favoritos';
  return (
    <button type="button" aria-pressed={marcado} aria-label={`${acao}: ${rotulo}`} title={acao}
      onClick={(e) => { e.preventDefault(); e.stopPropagation(); alternarFavorito({ tipo, chave, rotulo, detalhe, foto }); }}
      onMouseOver={(e) => { e.currentTarget.style.boxShadow = t.sombra.hover; e.currentTarget.style.transform = 'translateY(-1px)'; }}
      onMouseOut={(e) => { e.currentTarget.style.boxShadow = t.sombra.clicavel; e.currentTarget.style.transform = 'none'; }}
      style={{
        position: 'relative', zIndex: 2, pointerEvents: 'auto', flexShrink: 0, width: '36px', height: '36px', minWidth: '36px',
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: 0,
        borderRadius: t.raio.pill, border: 'none', cursor: 'pointer', background: fundo,
        boxShadow: t.sombra.clicavel, transition: 'box-shadow .15s, transform .15s, background .15s',
      }}>
      <Coracao cheio={marcado} cor={corIcone} />
    </button>
  );
}
