import Link from 'next/link';
import { t } from '../src/estilo/tokens';

// SEGMENTED CONTROL (12/10/2026, Diretrizes de Design): escolha entre opções excludentes fica num trilho
// (superfície recuada) e só a opção ativa é pastilha, com o botão padrão do site (índigo com texto âmbar).
// Dentro do trilho as opções inativas não têm sombra: sombra em tudo apagaria qual está escolhida.
// Cada item é { rotulo, ativo, href } (link) ou { rotulo, ativo, aoClicar } (botão).
export default function Segmentado({ itens, aria, className = '' }) {
  return (
    <div role="group" aria-label={aria} className={`segmentado ${className}`}>
      {itens.map((i) => {
        // Opção ainda indisponível (ex.: replay do 2º turno antes da hora): aparece, mas não é link nem botão.
        if (i.desabilitado) return <span key={i.chave || i.rotulo} className="seg-op seg-desab" aria-disabled="true" title={i.dica}>{i.rotulo}</span>;
        const props = { className: `seg-op${i.ativo ? ' seg-ativa' : ''}`, 'aria-current': i.href && i.ativo ? 'page' : undefined, 'aria-pressed': !i.href ? !!i.ativo : undefined };
        return i.href
          ? <Link key={i.chave || i.rotulo} href={i.href} {...props} scroll={false}>{i.cor && <i className="seg-ponto" style={{ background: i.cor }} />}{i.rotulo}</Link>
            : <button key={i.chave || i.rotulo} type="button" onClick={i.aoClicar} {...props}>{i.cor && <i className="seg-ponto" style={{ background: i.cor }} />}{i.rotulo}</button>;
      })}
      <style jsx global>{`
        .segmentado { display: inline-flex; flex-wrap: wrap; gap: 2px; padding: 4px; background: ${t.cor.papelQuente2}; border-radius: ${t.raio.pill}; max-width: 100%; }
        .seg-op { display: inline-block; padding: 8px 18px; border: none; border-radius: ${t.raio.pill}; background: transparent; color: ${t.cor.tinta}; font: inherit; font-weight: 700; font-size: 0.92rem; line-height: 1.2; white-space: nowrap; cursor: pointer; text-decoration: none; transition: background 0.18s ease, box-shadow 0.18s ease; }
        .seg-desab, .seg-desab:hover { background: transparent; color: ${t.cor.cinza}; opacity: 0.65; cursor: not-allowed; }
        .seg-ponto { display: inline-block; width: 10px; height: 10px; margin-right: 8px; border-radius: 50%; box-shadow: 0 0 0 2px rgba(255,255,255,0.9); vertical-align: -1px; }
        .seg-op:hover { background: rgba(255,255,255,0.7); }
        .seg-op:focus-visible { outline: none; box-shadow: ${t.sombra.anelFoco}; }
        .seg-ativa, .seg-ativa:hover { background: ${t.cor.verde}; color: ${t.cor.ouro}; box-shadow: 0 2px 6px rgba(36,30,82,0.35); }
        .seg-ativa:focus-visible { box-shadow: 0 2px 6px rgba(36,30,82,0.35), ${t.sombra.anelFoco}; }
      `}</style>
    </div>
  );
}
