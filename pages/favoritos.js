import Head from 'next/head';
import Link from 'next/link';
import NavPraVoce from '../components/NavPraVoce';
import SeusFavoritos from '../components/SeusFavoritos';
import { t } from '../src/estilo/tokens';
import { useFavoritos } from '../src/lib/favoritos';

// SEUS FAVORITOS como página própria de "Pra você" (26/09/2026). A mesma lista aparece na página
// da cédula; aqui ela tem endereço e um estado vazio que explica como favoritar.
export default function Favoritos() {
  const lista = useFavoritos();
  return (
    <div className="pagina">
      <Head><title>Seus favoritos | Lume Cidadão</title><meta name="robots" content="noindex" /></Head>
      <NavPraVoce />
      <h1 style={{ fontFamily: t.fonte.titulo, fontWeight: 600, fontSize: 'clamp(1.8rem,4vw,2.4rem)', margin: '0 0 10px' }}>Seus favoritos</h1>
      {lista.length === 0 ? (
        <div style={{ background: t.cor.papelCartao, borderRadius: t.raio.md, padding: '20px 22px', boxShadow: t.sombra.sutil, maxWidth: '720px', lineHeight: 1.6 }}>
          Você ainda não marcou ninguém. Toque no coração de um parlamentar, candidato ou partido, em{' '}
          <Link href="/deputados" style={{ color: t.cor.ouroTexto, fontWeight: 700 }}>Parlamentares</Link>,{' '}
          <Link href="/candidatos-2026" style={{ color: t.cor.ouroTexto, fontWeight: 700 }}>Eleições 2026</Link> ou{' '}
          <Link href="/afinidade" style={{ color: t.cor.ouroTexto, fontWeight: 700 }}>Quem vota como você</Link>, e ele aparece aqui.
        </div>
      ) : <SeusFavoritos semTitulo />}
    </div>
  );
}
