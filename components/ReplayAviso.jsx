import { t } from '../src/estilo/tokens';
import { UFS_SEM_DETALHE } from '../src/lib/replayApuracao';

// AVISOS FIXOS DO REPLAY (22/10/2026, D-074, regra 2 de neutralidade aprovada pelo Jordy). Uma superfície só, sem faixa lateral colorida
// (Diretrizes de Design), com dois parágrafos: como ler o percentual parcial e de onde vêm os dados, com o limite deles.
export default function ReplayAviso() {
  return (
    <div className="ra">
      <p><strong>Como ler:</strong> o percentual parcial muda conforme as urnas chegam, pois cada região entra em um horário diferente. Ele não indica o resultado final.</p>
      <p><strong>Dados:</strong> boletins de urna do TSE (1º turno de 2026). {UFS_SEM_DETALHE.join(', ')} ficam sem horário: o TSE publicou esses arquivos incompletos.</p>
      <style jsx global>{`
        .ra { display: flex; flex-direction: column; gap: 8px; padding: 13px 16px; background: ${t.cor.papelQuente}; border-radius: ${t.raio.sm}; box-shadow: ${t.sombra.sutil}; }
        .ra p { margin: 0; font-size: 0.9rem; line-height: 1.5; color: ${t.cor.tinta}; }
      `}</style>
    </div>
  );
}
