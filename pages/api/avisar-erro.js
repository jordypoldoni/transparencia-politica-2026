import supabase2, { banco2Configurado } from '../../src/supabase_cliente_2';
import { validarAviso, LIMITE_POR_HORA } from '../../src/lib/avisoErro';

// AVISAR DE UM ERRO (02/11/2026). Grava o aviso na tabela `avisos_erro` do banco 2 com a chave de SERVIÇO
// (que nunca vai ao navegador). Sem login: qualquer pessoa pode avisar.
//
// Contra abuso, sem guardar IP: (1) campo escondido que robô preenche (responde "ok" e não grava);
// (2) limite GLOBAL de avisos por hora, contado na própria tabela. Passou do limite, responde 429 e o
// site pede para tentar mais tarde; o resto do site não é afetado.
export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); return res.status(405).json({ erro: 'use POST' }); }
  if (!banco2Configurado) return res.status(503).json({ erro: 'O envio está indisponível agora. Tente mais tarde.' });

  const v = validarAviso(req.body && typeof req.body === 'object' ? req.body : {});
  if (!v.ok) return res.status(400).json({ erro: v.motivo });
  if (v.robo) return res.status(200).json({ ok: true });

  const desde = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { count, error: eConta } = await supabase2.from('avisos_erro').select('id', { count: 'exact', head: true }).gte('criado_em', desde);
  if (eConta) {
    console.error('[avisar-erro] contagem', eConta.message);
    return res.status(500).json({ erro: 'Não foi possível enviar agora. Tente de novo.' });
  }
  if ((count || 0) >= LIMITE_POR_HORA) return res.status(429).json({ erro: 'Recebemos muitos avisos agora. Tente de novo daqui a pouco.' });

  const { error } = await supabase2.from('avisos_erro').insert(v.dados);
  if (error) {
    console.error('[avisar-erro] gravação', error.message);
    return res.status(500).json({ erro: 'Não foi possível enviar agora. Tente de novo.' });
  }
  return res.status(200).json({ ok: true });
}
