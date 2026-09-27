import supabase2, { banco2Configurado } from '../../src/supabase_cliente_2';

// APAGAR A CONTA DE VERDADE (27/09/2026, pedido do Jordy). O botão do perfil apagava respostas e
// perfil, mas a conta de login (auth.users) ficava: o e-mail continuava cadastrado no banco 2 e
// a pessoa não recomeçava do zero. Apagar a conta exige a chave de SERVIÇO, que nunca vai ao
// navegador, por isso esta rota.
//
// Segurança: a rota só apaga a conta DONA do token que chega no cabeçalho. O token é conferido no
// próprio Supabase (auth.getUser), então ninguém apaga a conta de outra pessoa mandando um id.
// Respostas, favoritos e perfil saem junto (chaves estrangeiras com ON DELETE CASCADE). O registro
// de autorização para a IA fica, sem dono (ON DELETE SET NULL), como prova de consentimento.
export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); return res.status(405).json({ erro: 'use POST' }); }
  if (!banco2Configurado) return res.status(503).json({ erro: 'perfil indisponível' });

  const token = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '').trim();
  if (!token) return res.status(401).json({ erro: 'sem sessão' });

  const { data, error } = await supabase2.auth.getUser(token);
  if (error || !data?.user?.id) return res.status(401).json({ erro: 'sessão inválida' });

  const { error: e2 } = await supabase2.auth.admin.deleteUser(data.user.id);
  if (e2) {
    console.error('[apagar-conta]', e2.message);
    return res.status(500).json({ erro: 'não foi possível apagar a conta' });
  }
  return res.status(200).json({ ok: true });
}
