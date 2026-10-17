// Datas de coleta de cada fonte (tabela fonte_status, T10 / D-036), para os selos de data das telas.
// A tabela e minuscula (dezenas de linhas) e muda no maximo uma vez por dia por fonte, entao uma
// resposta unica, com cache na borda, serve todas as telas. A leitura e feita aqui, no servidor
// (service_role): o navegador nunca fala com o banco. Falha devolve lista vazia e o selo some.
import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'public, s-maxage=600, stale-while-revalidate=3600');
  try {
    const banco = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
    const { data, error } = await banco.from('fonte_status').select('fonte, escopo, coletado_em, dados_ate');
    if (error) throw error;
    res.status(200).json(data || []);
  } catch (e) {
    console.warn('fonte-status indisponivel:', e.message);
    res.status(200).json([]);
  }
}
