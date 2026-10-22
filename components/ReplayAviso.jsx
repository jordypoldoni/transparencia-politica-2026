import { t } from '../src/estilo/tokens';
import { UFS_SEM_DETALHE } from '../src/lib/replayApuracao';

// AVISOS FIXOS DO REPLAY (22/10/2026, D-074, regra 2 de neutralidade aprovada pelo Jordy). Dois blocos de superfície própria, sem faixa lateral
// colorida (Diretrizes de Design): como ler o percentual parcial e de onde vêm os dados, com o limite deles.
export default function ReplayAviso() {
  return (
    <div className="ra">
      <p className="ra-bloco"><strong>Como ler:</strong> o percentual parcial muda conforme as urnas chegam, porque cada região entra em um horário diferente. Ele não indica o resultado final.</p>
      <p className="ra-bloco"><strong>Dados:</strong> boletins de urna do 1º turno de 2026 publicados pelo TSE, com o horário de recebimento de cada urna. {UFS_SEM_DETALHE.join(', ')} ficam sem horário porque o TSE publicou esses arquivos incompletos.</p>
      <style jsx global>{`
        .ra { display: flex; flex-direction: column; gap: 6px; }
        .ra-bloco { margin: 0; padding: 8px 12px; background: ${t.cor.papelQuente}; border-radius: ${t.raio.sm}; box-shadow: ${t.sombra.sutil}; font-size: 0.8rem; line-height: 1.45; color: ${t.cor.tinta}; }
      `}</style>
    </div>
  );
}
