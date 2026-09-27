import Link from 'next/link';
import { t } from '../src/estilo/tokens';
import { CARGOS_VOTO, useVotos, alternarVoto } from '../src/lib/meuVoto';
import { montarLinkCola } from '../src/lib/cola';
import BotaoCompartilhar from './BotaoCompartilhar';

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
      {/* COMPARTILHAR O MEU VOTO (27/09/2026, pedido do Jordy). Vira a "cola para a urna" (/cola),
          com as escolhas NO LINK: o Lume não guarda nada (ver src/lib/cola.js). Só na cédula de um
          estado, porque a cola é de um estado. */}
      {uf && lista.length > 0 && (
        <div style={{ marginTop: '14px', display: 'flex', flexWrap: 'wrap', gap: '10px 16px', alignItems: 'flex-start' }}>
          <BotaoCompartilhar url={() => montarLinkCola(window.location.origin, uf, lista)} titulo="Cola para a urna"
            texto="A minha cola para a urna em 4 de outubro" rotulo="Compartilhar meu voto" />
          <Link href={montarLinkCola('', uf, lista) || '#'} style={{ alignSelf: 'center', color: t.cor.ouroTexto, fontWeight: 700, fontSize: '0.88rem' }}>Ver e imprimir a cola</Link>
          <p style={{ flexBasis: '100%', margin: 0, fontSize: '0.8rem', color: t.cor.cinza, lineHeight: 1.5 }}>
            Quem receber o link vê os nomes que você escolheu. As escolhas vão dentro do próprio link: o Lume não guarda cópia.
          </p>
        </div>
      )}
    </div>
  );
}
