import { t } from '../src/estilo/tokens';
import { listaE } from '../src/lib/replayApuracao';

// AVISOS FIXOS DO REPLAY (22/10/2026, D-074, regra 2 de neutralidade aprovada pelo Jordy). De onde vêm os dados e o limite deles. O aviso "Como ler" fica
// junto das barras de votos (ReplayCandidatos), onde o percentual aparece. Sem faixa lateral colorida (Diretrizes de Design).
export default function ReplayAviso({ turno = 1, estimadas = [] }) {
  return (
    <div className="ra">
      <p><strong>Dados:</strong> boletins de urna do TSE ({turno === 2 ? '2º' : '1º'} turno de 2026).{estimadas.length > 0 ? ` ${listaE(estimadas)}: votos finais oficiais, com horário de chegada estimado, pois o TSE publicou os boletins desses estados incompletos.` : ''}</p>
      <style jsx global>{`
        .ra { display: flex; flex-direction: column; gap: 8px; padding: 13px 16px; background: ${t.cor.papelQuente}; border-radius: ${t.raio.sm}; box-shadow: ${t.sombra.sutil}; }
        .ra p { margin: 0; font-size: 0.9rem; line-height: 1.5; color: ${t.cor.tinta}; }
      `}</style>
    </div>
  );
}
