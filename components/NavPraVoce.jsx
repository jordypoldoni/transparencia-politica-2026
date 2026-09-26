import Link from 'next/link';
import { useRouter } from 'next/router';
import { t } from '../src/estilo/tokens';

// NAVEGAÇÃO INTERNA DE "PRA VOCÊ" (26/09/2026). Decisão do Jordy: "Pra você" é um grupo de
// páginas, cada uma com endereço próprio, e dentro delas estas pílulas levam de uma para a outra.
// Mesmas pílulas de /deputados ("Federais · Estaduais"): o padrão do site para separar telas irmãs.
export const PAGINAS_PRA_VOCE = [
  { href: '/comecar', rotulo: 'Sua cédula', nota: 'em quem você vota no seu estado' },
  { href: '/afinidade', rotulo: 'Quem vota como você', nota: 'suas posições comparadas aos votos' },
  { href: '/favoritos', rotulo: 'Seus favoritos', nota: 'quem você marcou com o coração' },
  { href: '/perfil', rotulo: 'Seu perfil', nota: 'conta, respostas e seus dados' },
];

const pilula = (ativa) => ({
  display: 'inline-block', padding: '10px 20px', fontSize: '0.9rem', fontWeight: 700, fontFamily: t.fonte.corpo,
  borderRadius: t.raio.pill, textDecoration: 'none', whiteSpace: 'nowrap',
  background: ativa ? t.cor.verde : '#fff', color: ativa ? t.cor.ouro : t.cor.tinta,
  boxShadow: t.sombra.clicavel, transition: 'box-shadow .15s, transform .15s',
});

export default function NavPraVoce() {
  const { pathname } = useRouter();
  return (
    <nav aria-label="Páginas de Pra você" style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '22px' }}>
      {PAGINAS_PRA_VOCE.map((p) => {
        const ativa = pathname === p.href;
        return (
          <Link key={p.href} href={p.href} aria-current={ativa ? 'page' : undefined} style={pilula(ativa)}
            onMouseOver={(e) => { e.currentTarget.style.boxShadow = t.sombra.hover; e.currentTarget.style.transform = 'translateY(-1px)'; }}
            onMouseOut={(e) => { e.currentTarget.style.boxShadow = t.sombra.clicavel; e.currentTarget.style.transform = 'none'; }}>
            {p.rotulo}
          </Link>
        );
      })}
    </nav>
  );
}
