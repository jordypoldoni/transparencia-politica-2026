import supabase2, { banco2Configurado } from '../../../src/supabase_cliente_2';
import { ehAdmin } from '../../../src/lib/admin';

// "SOU ADMIN?" (02/11/2026). Responde { admin: true|false } para o menu decidir se mostra "Avisos de erro".
// Para o administrador devolve também `novos` (quantos avisos estão com status "novo"). Não devolve e-mail nem texto de aviso. Sem sessão: 401. A decisão de verdade (listar e mudar avisos) continua em /api/admin/avisos.
export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'GET') { res.setHeader('Allow', 'GET'); return res.status(405).json({ erro: 'use GET' }); }
  if (!banco2Configurado) return res.status(200).json({ admin: false });
  const token = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '').trim();
  if (!token) return res.status(401).json({ erro: 'sem sessão' });
  const { data, error } = await supabase2.auth.getUser(token);
  if (error || !data?.user) return res.status(401).json({ erro: 'sem sessão' });
  if (!ehAdmin(data.user, process.env.ADMIN_EMAIL)) return res.status(200).json({ admin: false });
  // Número de avisos com status "novo" (selo vermelho do menu). Se a contagem falhar, o menu só não mostra o número.
  const { count, error: e2 } = await supabase2.from('avisos_erro').select('id', { count: 'exact', head: true }).eq('status', 'novo');
  if (e2) console.error('[admin/sou-admin] contagem', e2.message);
  return res.status(200).json({ admin: true, novos: e2 ? 0 : (count || 0) });
}
