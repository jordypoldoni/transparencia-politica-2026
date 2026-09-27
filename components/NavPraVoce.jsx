import Link from 'next/link';
import { useRouter } from 'next/router';
import { t } from '../src/estilo/tokens';
import EscolhaCompacta from './EscolhaCompacta';

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
  boxShadow: t.sombra.botao, transition: 'box-shadow .15s, transform .15s',
});

export default function NavPraVoce() {
  const { pathname } = useRouter();
  return (
    <>
    {/* Celular (até 640px, 27/09/2026): as quatro pílulas ocupavam duas linhas; viram um campo de
        escolha com a página atual. Computador: as pílulas de sempre. Troca por CSS (_app.js). */}
    <nav aria-label="Páginas de Pra você" className="so-celular" style={{ marginBottom: '16px' }}>
      <EscolhaCompacta rotulo="Pra você" valor={pathname}
        opcoes={PAGINAS_PRA_VOCE.map((p) => ({ valor: p.href, rotulo: p.rotulo, href: p.href }))} />
    </nav>
    <nav aria-label="Páginas de Pra você" className="so-computador" style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '22px' }}>
      {PAGINAS_PRA_VOCE.map((p) => {
        const ativa = pathname === p.href;
        return (
          <Link key={p.href} href={p.href} aria-current={ativa ? 'page' : undefined} style={pilula(ativa)}
            onMouseOver={(e) => { e.currentTarget.style.boxShadow = t.sombra.botaoHover; e.currentTarget.style.transform = 'translateY(-1px)'; }}
            onMouseOut={(e) => { e.currentTarget.style.boxShadow = t.sombra.botao; e.currentTarget.style.transform = 'none'; }}>
            {p.rotulo}
          </Link>
        );
      })}
    </nav>
    </>
  );
}
