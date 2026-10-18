import { indice } from '../src/lib/sitemap.js';

// /sitemap.xml é o ÍNDICE: aponta para um arquivo por tipo de página (src/lib/sitemap.js).
// Não consulta o banco, então responde mesmo que o banco esteja fora do ar.
export default function Sitemap() { return null; }

export async function getServerSideProps({ res, req }) {
  const proto = req.headers['x-forwarded-proto'] || 'http';
  const base = `${proto}://${req.headers.host}`;
  res.setHeader('Content-Type', 'text/xml');
  res.setHeader('Cache-Control', 'public, s-maxage=86400, stale-while-revalidate=3600');
  res.write(indice(base));
  res.end();
  return { props: {} };
}
