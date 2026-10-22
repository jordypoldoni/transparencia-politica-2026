import Segmentado from './Segmentado';
import { t } from '../src/estilo/tokens';

// BARRA DE CONTROLE de Eleições 2026 (12/10/2026), só computador. Uma linha: à esquerda "Candidatos | Apuração" e,
// colado nele, o turno (o "›" e a proximidade dizem que o turno pertence à visão escolhida); na ponta direita,
// os cargos. No celular continuam os controles de antes (campo de escolha), por isso o `so-computador`.
//   visao: 'candidatos' | 'apuracao' | 'replay'   turno: 1 | 2   cargos: [{ valor, rotulo, href }]
// Na visão Replay (22/10/2026) não há cargo (é só a presidencial) e o 2º turno vem travado até a hora (`turno2`: { desabilitado, dica }).
export default function BarraControleEleicoes({ visao, turno, cargo, cargos = [], hrefVisao, hrefTurno, turno2 = {} }) {
  return (
    <div className="so-computador" style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '12px 16px', marginBottom: '18px' }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '10px' }}>
        <Segmentado aria="Visão da página" itens={[
          { rotulo: 'Candidatos', ativo: visao === 'candidatos', href: hrefVisao('candidatos') },
          { rotulo: 'Apuração', ativo: visao === 'apuracao', href: hrefVisao('apuracao') },
          { rotulo: 'Replay', ativo: visao === 'replay', href: hrefVisao('replay') },
        ]} />
        <span aria-hidden="true" style={{ color: t.cor.cinza, fontWeight: 700 }}>›</span>
        <Segmentado aria={`Turno (${visao === 'apuracao' ? 'apuração' : visao === 'replay' ? 'replay' : 'candidatos'})`} itens={[
          { rotulo: '1º turno', ativo: turno !== 2, href: hrefTurno(1) },
          { rotulo: '2º turno', ativo: turno === 2, href: hrefTurno(2), desabilitado: turno2.desabilitado, dica: turno2.dica },
        ]} />
      </div>
      {visao !== 'replay' && <Segmentado aria="Cargo" itens={cargos.map((c) => ({ rotulo: c.rotulo, ativo: cargo === c.valor, href: c.href }))} />}
    </div>
  );
}
