import Head from 'next/head';
import { jsonSeguro } from '../src/lib/dadosEstruturados';

// Coloca um bloco JSON-LD no <head>. `id` evita o bloco duplicado quando a página troca de dados.
export default function DadosEstruturados({ dados, id = 'ld-pagina' }) {
  if (!dados) return null;
  return (
    <Head>
      <script key={id} type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonSeguro(dados) }} />
    </Head>
  );
}
