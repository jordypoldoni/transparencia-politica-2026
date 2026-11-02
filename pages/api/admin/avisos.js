import supabase2, { banco2Configurado } from '../../../src/supabase_cliente_2';
import { ehAdmin, validarMudancaStatus, filtroValido, contarPorStatus } from '../../../src/lib/admin';

// PAINEL DE AVISOS DE ERRO (02/11/2026). Só o administrador (e-mail em ADMIN_EMAIL) lista e muda o status dos
// avisos gravados em `avisos_erro` (banco 2). A tabela é fechada para o navegador; tudo passa por aqui, com a chave
// de SERVIÇO, depois de conferir o token da sessão no próprio Supabase. Quem não é administrador recebe 403 sem detalhe.
async function administrador(req) {
  const token = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '').trim();
  if (!token) return { status: 401 };
  const { data, error } = await supabase2.auth.getUser(token);
  if (error || !data?.user) return { status: 401 };
  if (!ehAdmin(data.user, process.env.ADMIN_EMAIL)) return { status: 403 };
  return { status: 200 };
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (!banco2Configurado) return res.status(503).json({ erro: 'indisponível' });
  if (req.method !== 'GET' && req.method !== 'PATCH') { res.setHeader('Allow', 'GET, PATCH'); return res.status(405).json({ erro: 'método não permitido' }); }

  const a = await administrador(req);
  if (a.status === 401) return res.status(401).json({ erro: 'sem sessão' });
  if (a.status === 403) return res.status(403).json({ erro: 'sem acesso' });

  if (req.method === 'PATCH') {
    const v = validarMudancaStatus(req.body && typeof req.body === 'object' ? req.body : {});
    if (!v.ok) return res.status(400).json({ erro: v.motivo });
    const { data, error } = await supabase2.from('avisos_erro').update({ status: v.status }).eq('id', v.id).select('id,status').maybeSingle();
    if (error) { console.error('[admin/avisos] update', error.message); return res.status(500).json({ erro: 'não foi possível salvar' }); }
    if (!data) return res.status(404).json({ erro: 'aviso não encontrado' });
    return res.status(200).json({ ok: true, aviso: data });
  }

  const filtro = filtroValido(Array.isArray(req.query.status) ? req.query.status[0] : req.query.status);
  const { data: todos, error: e1 } = await supabase2.from('avisos_erro').select('status').limit(5000);
  if (e1) { console.error('[admin/avisos] contagem', e1.message); return res.status(500).json({ erro: 'não foi possível ler' }); }
  let consulta = supabase2.from('avisos_erro').select('id,criado_em,pagina,descricao,email_retorno,status').order('criado_em', { ascending: false }).limit(200);
  if (filtro !== 'todos') consulta = consulta.eq('status', filtro);
  const { data: lista, error: e2 } = await consulta;
  if (e2) { console.error('[admin/avisos] lista', e2.message); return res.status(500).json({ erro: 'não foi possível ler' }); }
  return res.status(200).json({ filtro, contagens: contarPorStatus(todos || []), avisos: lista || [] });
}
