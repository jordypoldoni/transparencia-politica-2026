import { useEffect, useState } from 'react';
import { useNavegacao } from '../src/lib/navegacao';
import Giro from './Giro';

// INDICADOR DE NAVEGAÇÃO (20/10/2026, item 1 da lista do Jordy). Duas peças, as duas lendo o estado
// de src/lib/navegacao.js:
//  - Barra de progresso no topo (4px, âmbar): começa na hora, avança devagar até ~92% e fecha em 100%
//    quando a página abre. Antes era uma barra de 3px que ia e voltava sem dizer quanto faltava.
//  - Aviso logo abaixo do cabeçalho, depois de 300ms (para não piscar em navegação rápida): "Abrindo
//    <destino>…". Depois de 4s diz que está demorando mais que o normal. Se a navegação falhar, avisa
//    por 6s. É informação que NÃO clica: retângulo de cantos suaves, nunca cápsula (Diretrizes).
// O aviso mora numa região `role="status"` sempre presente, para o leitor de tela anunciar.
export default function IndicadorNavegacao() {
  const { navegando, rotulo, falhou } = useNavegacao();
  const [fase, setFase] = useState('ocioso'); // ocioso | andando | concluindo
  const [aviso, setAviso] = useState(false);
  const [lento, setLento] = useState(false);
  const [topo, setTopo] = useState(76);
  const [largura, setLargura] = useState(0);

  useEffect(() => {
    if (navegando) {
      setFase('andando');
      const h = document.querySelector('header');
      setTopo((h ? Math.round(h.getBoundingClientRect().height) : 64) + 12);
      const a = setTimeout(() => setAviso(true), 300);
      const l = setTimeout(() => setLento(true), 4000);
      return () => { clearTimeout(a); clearTimeout(l); };
    }
    setAviso(false);
    setLento(false);
    const barra = document.querySelector('.barra-nav.andando');
    if (barra) {
      // Fecha a barra a partir de onde ela está, em vez de recomeçar do zero.
      setLargura(Math.round(barra.getBoundingClientRect().width));
      setFase('concluindo');
    }
    const fim = setTimeout(() => setFase('ocioso'), 600);
    return () => clearTimeout(fim);
  }, [navegando]);

  return (
    <>
      {fase === 'andando' && <div className="barra-nav andando" aria-hidden="true" />}
      {fase === 'concluindo' && <div className="barra-nav concluindo" style={{ '--w': `${largura}px` }} aria-hidden="true" />}
      <div role="status" aria-live="polite">
        {navegando && aviso && (
          <div className="aviso-nav" style={{ top: topo }}>
            <Giro tamanho={20} />
            <div>
              <span>{rotulo}</span>
              {lento && <small>Está demorando mais que o normal. Seguimos carregando.</small>}
            </div>
          </div>
        )}
        {falhou && (
          <div className="aviso-nav" style={{ top: topo }}>
            <span>Não foi possível abrir a página. Tente de novo.</span>
          </div>
        )}
      </div>
    </>
  );
}
