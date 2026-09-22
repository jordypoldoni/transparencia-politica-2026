import Link from 'next/link';
import { useRouter } from 'next/router';
import { t } from '../src/estilo/tokens';

// BOTÃO VOLTAR, um só para o site inteiro (22/09/2026, pedido do Jordy).
// Havia três versões: link de texto cinza com o destino escrito ("← Candidatos 2026",
// "← Indicações do presidente"), pílula sem fundo branco (votação) e a pílula branca com sombra
// do perfil do parlamentar. Ficou esta última, que é o padrão de botão do site: cápsula, fundo
// branco, sombra de clicável, e o texto é só "Voltar".
//
// Com `href`, é um link para um destino conhecido, e é assim que a ficha do candidato volta para
// a lista COM os filtros (src/lib/voltarLista.js). Sem `href`, volta uma página no histórico.
const estilo = {
  display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '10px 18px',
  fontSize: '0.9rem', fontWeight: 700, fontFamily: t.fonte.corpo, lineHeight: 1.2,
  borderRadius: t.raio.pill, cursor: 'pointer', textDecoration: 'none', border: 'none',
  background: '#FFFFFF', color: t.cor.tinta, boxShadow: t.sombra.clicavel,
};

export default function BotaoVoltar({ href = null, margem = '0 0 20px', style = {} }) {
  const router = useRouter();
  const s = { ...estilo, margin: margem, ...style };
  if (href) return <Link href={href} style={s}>← Voltar</Link>;
  return <button type="button" onClick={() => router.back()} style={s}>← Voltar</button>;
}
