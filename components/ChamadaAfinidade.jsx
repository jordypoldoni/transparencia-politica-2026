import Link from 'next/link';
import { t } from '../src/estilo/tokens';
import { Seta } from './icones';

// "Quem vota como você?" (18/10/2026, B5): porta de entrada para a /afinidade a partir das páginas onde o
// cidadão chega pelo Google (perfil e estado). Leva já com o estado escolhido (?uf=), para o cidadão não
// precisar escolher de novo. Só aparece onde há voto registrado para comparar.
export default function ChamadaAfinidade({ uf = '', alvo = '', style }) {
  const href = uf ? `/afinidade?uf=${encodeURIComponent(uf)}` : '/afinidade';
  return (
    <aside aria-label="Quem vota como você" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px 18px', flexWrap: 'wrap', background: t.cor.papelQuente, borderRadius: t.raio.md, padding: '14px 18px', boxShadow: t.sombra.sutil, ...style }}>
      <div style={{ flex: '1 1 260px', minWidth: 0 }}>
        <p style={{ margin: 0, fontWeight: 700, color: t.cor.tinta }}>Quem vota como você?</p>
        <p style={{ margin: '2px 0 0', fontSize: '0.9rem', color: t.cor.cinza, lineHeight: 1.45 }}>
          Responda a algumas perguntas e compare as suas posições com os votos {alvo || (uf ? `de quem representa ${uf}` : 'dos parlamentares')}.
        </p>
      </div>
      <Link href={href} style={{ flexShrink: 0, display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '10px 18px', fontSize: '0.9rem', fontWeight: 700, borderRadius: t.raio.pill, textDecoration: 'none', background: t.cor.verde, color: t.cor.ouro }}>
        Descobrir<Seta direcao="direita" size={16} emTexto />
      </Link>
    </aside>
  );
}
