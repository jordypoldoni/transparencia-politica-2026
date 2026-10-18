import Link from 'next/link';
import { t } from '../src/estilo/tokens';

// Trilha "você está aqui" no topo da página (18/10/2026): Início › Parlamentares › Rio Grande do Sul.
// Existia só como dado estruturado (BreadcrumbList para o Google); a pessoa que chega por um link
// de busca não via onde estava nem como subir um nível. Itens: [{ nome, href }]; o último é a
// página atual e não leva link. O "›" segue o da barra de controle das eleições.
export default function Trilha({ itens }) {
  return (
    <nav aria-label="Você está em" style={{ marginBottom: '14px' }}>
      <ol style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '6px', fontSize: '0.84rem' }}>
        {itens.map((i, n) => {
          const ultimo = n === itens.length - 1;
          return (
            <li key={i.nome} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', minWidth: 0 }}>
              {ultimo
                ? <span aria-current="page" style={{ color: t.cor.tinta, fontWeight: 700 }}>{i.nome}</span>
                : <Link href={i.href} style={{ color: t.cor.ouroTexto, fontWeight: 600, textDecoration: 'none' }}>{i.nome}</Link>}
              {!ultimo && <span aria-hidden="true" style={{ color: t.cor.cinza, fontWeight: 700 }}>›</span>}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
