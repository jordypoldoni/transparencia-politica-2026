import Link from 'next/link';
import { useState } from 'react';
import { t } from '../src/estilo/tokens';
import { Seta } from './icones';

// "Em destaque" no topo da lista de votações de uma casa (desenho aprovado pelo Jordy em 07/11/2026).
// Recebe cartões já montados por montarMaisImportantes(). Sem cartões, a seção inteira some.
// Estilo em pages/_app.js (classes .dest-*), para a grade virar coluna única no celular.
const INICIAL = 6;

export default function EmDestaque({ casa, maisImportantes }) {
  const [tudo, setTudo] = useState(false);
  if (!maisImportantes || maisImportantes.length === 0) return null;
  const visiveis = tudo ? maisImportantes : maisImportantes.slice(0, INICIAL);
  const resto = maisImportantes.length - INICIAL;
  return (
    <section className="dest-sec" aria-labelledby="dest-titulo">
      <h2 id="dest-titulo">Em destaque {casa.chave === 'senado' ? 'no' : 'na'} {casa.nome}</h2>
      <h3 className="dest-sub-titulo"><span className="dest-tag dest-imp">Mais importante</span></h3>
      <p className="dest-sub">
        Escolhidas por dois critérios: aparecem muito nas notícias e mudam direto a vida dos brasileiros.
        A lista é feita pela equipe do Lume, e os critérios valem para qualquer partido ou governo.
      </p>
      <div className="dest-grade">
        {visiveis.map((c) => (
          <Link key={c.chave} href={c.href} className="dest-cartao">
            <div className="dest-topo">
              {c.status && <span className={`dest-st${c.status.tom === 'ok' ? ' ok' : ''}`}>{c.status.rotulo}</span>}
            </div>
            {c.rotuloProposicao && <p className="dest-rot">{c.rotuloProposicao}</p>}
            <h4>{c.apelido}</h4>
            {c.resumo && <p className="dest-txt">{c.resumo}</p>}
            <span className="dest-link">Entenda esta votação<Seta direcao="direita" size={13} emTexto /></span>
          </Link>
        ))}
      </div>
      {resto > 0 && (
        <div className="dest-mais">
          <button
            onClick={() => setTudo((v) => !v)}
            style={{
              padding: '11px 26px', borderRadius: t.raio.pill, border: 'none',
              background: t.cor.verde, color: t.cor.ouro, fontSize: '0.88rem', fontWeight: 700,
              fontFamily: t.fonte.corpo, cursor: 'pointer', boxShadow: t.sombra.botao,
            }}
          >
            {tudo ? 'Mostrar menos' : `Ver mais ${resto} ${resto === 1 ? 'votação importante' : 'votações importantes'}`}
          </button>
        </div>
      )}
    </section>
  );
}
