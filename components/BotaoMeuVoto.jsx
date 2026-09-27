import { useState } from 'react';
import { t } from '../src/estilo/tokens';
import { alternarVoto, useMeuVoto, cargoVoto } from '../src/lib/meuVoto';

// MEU VOTO (27/09/2026). Pílula que marca "vou votar nesta pessoa" (src/lib/meuVoto.js).
// Desmarcada: branca (ou creme no cartão), "Escolher". Marcada: índigo com texto âmbar, "✓ Meu voto".
// Senador com as duas vagas cheias: desligada, "2 já escolhidos". Em cargo de uma vaga, escolher
// outro nome troca, e a pílula avisa por um instante quem saiu.
// `compacto`: versão pequena para dentro dos cartões das listas.
export default function BotaoMeuVoto({ cargo, chave, rotulo, detalhe, foto, uf, compacto = false, noCartao = true }) {
  const { marcado, cheio } = useMeuVoto(cargo, chave, uf);
  const [aviso, setAviso] = useState('');
  const cfg = cargoVoto(cargo);
  if (!cfg) return null;
  const clicar = (e) => {
    e.preventDefault(); e.stopPropagation();
    const r = alternarVoto({ cargo, chave, rotulo, detalhe, foto, uf });
    if (r.trocou) { setAviso(`trocou ${r.trocou}`); setTimeout(() => setAviso(''), 2600); }
  };
  const estilo = {
    pointerEvents: 'auto', display: 'inline-flex', alignItems: 'center', gap: '6px', border: 'none', cursor: cheio ? 'not-allowed' : 'pointer',
    borderRadius: t.raio.pill, fontFamily: t.fonte.corpo, fontWeight: 700, whiteSpace: 'nowrap',
    padding: compacto ? '5px 12px' : '9px 18px', fontSize: compacto ? '0.74rem' : '0.88rem', minHeight: compacto ? '30px' : '40px',
    background: marcado ? t.cor.verde : (noCartao ? t.cor.papelQuente2 : '#fff'), color: marcado ? t.cor.ouro : t.cor.tinta,
    boxShadow: cheio ? 'none' : t.sombra.botao, opacity: cheio ? 0.55 : 1, transition: 'box-shadow .15s, transform .15s, background .15s',
  };
  const titulo = marcado ? `Seu voto para ${cfg.rotulo}. Toque para desmarcar.`
    : cheio ? `Você já escolheu ${cfg.vagas} para ${cfg.rotulo}. Desmarque um para trocar.`
      : `Escolher ${rotulo} como seu voto para ${cfg.rotulo}`;
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', pointerEvents: 'auto' }}>
      <button type="button" onClick={clicar} disabled={cheio} aria-pressed={marcado} title={titulo} aria-label={titulo} style={estilo}
        onMouseOver={(e) => { if (!cheio) { e.currentTarget.style.boxShadow = t.sombra.botaoHover; e.currentTarget.style.transform = 'translateY(-1px)'; } }}
        onMouseOut={(e) => { e.currentTarget.style.boxShadow = cheio ? 'none' : t.sombra.botao; e.currentTarget.style.transform = 'none'; }}>
        {marcado ? '✓ Meu voto' : cheio ? `${cfg.vagas} já escolhidos` : 'Escolher'}
      </button>
      {aviso && <span role="status" style={{ fontSize: '0.72rem', color: t.cor.cinza }}>{aviso}</span>}
    </span>
  );
}
