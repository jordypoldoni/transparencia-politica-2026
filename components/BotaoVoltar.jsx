import Link from 'next/link';
import { useRouter } from 'next/router';
import { t } from '../src/estilo/tokens';
import { realcePagina } from '../src/estilo/botoes';
import { Seta } from './icones';

// BOTÃO VOLTAR, um só para o site inteiro.
// 22/09/2026: havia três versões e ficou a pílula branca com o texto "Voltar".
// 12/10/2026 (pedido do Jordy): sem texto. Agora é um botão REDONDO no índigo padrão do site,
// com a seta dourada para a esquerda, a sombra padrão dos botões e a mesma animação de hover
// (sombra que cresce e sobe 1px, em src/estilo/botoes.js). O nome "Voltar" continua para quem
// usa leitor de tela (aria-label) e aparece como dica ao passar o mouse (title).
//
// Com `href`, é um link para um destino conhecido, e é assim que a ficha do candidato volta para
// a lista COM os filtros (src/lib/voltarLista.js). Sem `href`, volta uma página no histórico.
const estilo = {
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
  width: '42px', height: '42px', padding: 0, flexShrink: 0,
  borderRadius: '50%', cursor: 'pointer', textDecoration: 'none', border: 'none',
  background: t.cor.verde, boxShadow: t.sombra.botao,
  transition: 'box-shadow .15s ease, transform .15s ease',
};

export default function BotaoVoltar({ href = null, margem = '0 0 20px', style = {} }) {
  const router = useRouter();
  const s = { ...estilo, margin: margem, ...style };
  const eventos = {
    onMouseOver: (e) => realcePagina(e, true),
    onMouseOut: (e) => realcePagina(e, false),
    'aria-label': 'Voltar',
    title: 'Voltar',
  };
  const seta = <Seta direcao="esquerda" size={22} />;
  if (href) return <Link href={href} style={s} {...eventos}>{seta}</Link>;
  return <button type="button" onClick={() => router.back()} style={s} {...eventos}>{seta}</button>;
}
