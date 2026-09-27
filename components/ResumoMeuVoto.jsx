import Link from 'next/link';
import { t } from '../src/estilo/tokens';
import { CARGOS_VOTO, useVotos, alternarVoto } from '../src/lib/meuVoto';

// RESUMO DO MEU VOTO (27/09/2026): os cinco cargos na ordem da urna, com quem a pessoa escolheu.
// Aparece no topo da cédula (só o estado aberto) e no perfil (todos). `uf` filtra os cargos do
// estado; presidente aparece sempre.
export default function ResumoMeuVoto({ uf = null, titulo = 'Seu voto', vazioLink = null }) {
  const votos = useVotos();
  const doEstado = (v) => !uf || v.cargo === 'presidente' || v.uf === uf;
  const lista = votos.filter(doEstado);
  return (
    <div>
      {titulo && <h2 style={{ fontFamily: t.fonte.titulo, fontWeight: 600, fontSize: '1.3rem', margin: '0 0 4px' }}>{titulo}</h2>}
      <p style={{ margin: '0 0 12px', fontSize: '0.86rem', color: t.cor.cinza, lineHeight: 1.5 }}>
        Toque em <strong style={{ color: t.cor.tinta }}>Escolher</strong> no cartão ou na ficha de cada candidato. Fica só neste
        aparelho, a não ser que você autorize o perfil a guardar.
      </p>
      <div style={{ display: 'grid', gap: '8px' }}>
        {CARGOS_VOTO.map((c) => {
          const escolhidos = lista.filter((v) => v.cargo === c.cargo);
          return (
            <div key={c.cargo} style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '8px 12px', background: t.cor.papelQuente, borderRadius: t.raio.sm, padding: '10px 12px', fontSize: '0.88rem' }}>
              <span style={{ minWidth: '140px', color: t.cor.cinza }}>{c.ordem}º {c.rotulo}{c.vagas > 1 ? ` (${escolhidos.length} de ${c.vagas})` : ''}</span>
              {escolhidos.length === 0 ? (
                <span style={{ color: t.cor.cinza }}>ainda não escolheu</span>
              ) : escolhidos.map((v) => (
                <span key={v.chave} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                  <Link href={v.chave} style={{ color: t.cor.tinta, fontWeight: 700, textDecoration: 'none' }}>{v.rotulo}</Link>
                  {v.detalhe && <span style={{ color: t.cor.cinza, fontSize: '0.8rem' }}>{v.detalhe}{!uf && v.uf ? ` · ${v.uf}` : ''}</span>}
                  <button type="button" onClick={() => alternarVoto(v)} aria-label={`Tirar ${v.rotulo} do seu voto`} title="Tirar do seu voto"
                    style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: t.cor.ouroTexto, fontWeight: 800, fontSize: '0.9rem', padding: '2px 6px', minWidth: '28px', minHeight: '28px' }}>✕</button>
                </span>
              ))}
            </div>
          );
        })}
      </div>
      {vazioLink && lista.length === 0 && <p style={{ margin: '10px 0 0', fontSize: '0.86rem' }}>{vazioLink}</p>}
    </div>
  );
}
