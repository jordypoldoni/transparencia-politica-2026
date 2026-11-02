import supabase2, { banco2Configurado } from '../../../src/supabase_cliente_2';
import { ehAdmin } from '../../../src/lib/admin';

// "SOU ADMIN?" (02/11/2026). Responde só { admin: true|false } para o menu decidir se mostra "Avisos de erro".
// Não devolve e-mail nem dado nenhum. Sem sessão: 401. A decisão de verdade (listar e mudar avisos) continua em /api/admin/avisos.
export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'GET') { res.setHeader('Allow', 'GET'); return res.status(405).json({ erro: 'use GET' }); }
  if (!banco2Configurado) return res.status(200).json({ admin: false });
  const token = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '').trim();
  if (!token) return res.status(401).json({ erro: 'sem sessão' });
  const { data, error } = await supabase2.auth.getUser(token);
  if (error || !data?.user) return res.status(401).json({ erro: 'sem sessão' });
  return res.status(200).json({ admin: ehAdmin(data.user, process.env.ADMIN_EMAIL) });
}
