import { t } from '../src/estilo/tokens';
import { UFS_SEM_DETALHE } from '../src/lib/replayApuracao';
import { NOMES_UF } from '../src/lib/cotas';

// AVISOS FIXOS DO REPLAY (22/10/2026, D-074, regra 2 de neutralidade aprovada pelo Jordy). Dois blocos de superfície própria, sem faixa lateral
// colorida (Diretrizes de Design): como ler o percentual parcial e de onde vêm os dados, com o limite deles.
export default function ReplayAviso() {
  const sem = UFS_SEM_DETALHE.map((u) => NOMES_UF[u] || u);
  const lista = sem.length > 1 ? `${sem.slice(0, -1).join(', ')} e ${sem[sem.length - 1]}` : sem[0];
  return (
    <div className="ra">
      <p className="ra-bloco"><strong>Como ler:</strong> o percentual parcial muda conforme as urnas chegam, porque cada região entra em um horário diferente. Ele não indica o resultado final.</p>
      <p className="ra-bloco"><strong>De onde vêm os dados:</strong> boletins de urna do 1º turno de 2026 publicados pelo TSE, com o horário em que cada urna foi recebida. {lista} ficam sem horário de chegada porque o TSE publicou os arquivos desses estados incompletos.</p>
      <style jsx global>{`
        .ra { display: flex; flex-direction: column; gap: 10px; }
        .ra-bloco { margin: 0; padding: 12px 16px; background: ${t.cor.papelQuente}; border-radius: ${t.raio.sm}; box-shadow: ${t.sombra.sutil}; font-size: 0.9rem; line-height: 1.5; color: ${t.cor.tinta}; }
      `}</style>
    </div>
  );
}
