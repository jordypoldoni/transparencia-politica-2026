// GET /api/gastos-ano?id=<uuid do agente>&ano=<AAAA>
//
// Devolve as notas de um parlamentar num ano especifico.
//
// POR QUE ESTA ROTA EXISTE (20/09/2026)
// A secao "Em que ele gastou" ganhou seletor de ano. O resumo por categoria de cada ano ja vem
// pronto do SSR (sao 8 linhas por ano, custo desprezivel), mas as NOTAS nao: mandar as notas de
// todos os anos junto com a pagina levaria o perfil de 46 kB para 199 kB em media e 791 kB no
// pior caso, medido no banco em 20/09. E o tamanho do problema que quebrou a /votacoes em 19/09.
// Entao: o ano de referencia continua vindo pronto com a pagina (nada foi removido), e os outros
// anos sao buscados aqui quando o leitor abre uma categoria daquele ano.
//
// Cache na borda: nota fiscal de ano passado nao muda, e a do ano corrente muda uma vez por dia,
// quando o coletor roda.
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const TETO = 4000; // teto de seguranca por parlamentar/ano (o maior real em 2026 tem ~900)

export default async function handler(req, res) {
  const { id, ano } = req.query;
  if (!id || !/^\d{4}$/.test(String(ano || ''))) {
    return res.status(400).json({ erro: 'informe id (uuid do parlamentar) e ano (AAAA)' });
  }
  try {
    const { data, error } = await supabase
      .from('despesas_parlamentares')
      .select('categoria_normalizada, tipo_despesa, fornecedor_nome, fornecedor_cnpj_cpf, valor_liquido, data_emissao, id_externo_documento, url_documento, mes, ano')
      .eq('agente_id', id)
      .eq('ano', Number(ano))
      .order('data_emissao', { ascending: false })
      .limit(TETO);
    if (error) throw new Error(error.message);
    res.setHeader('Cache-Control', 's-maxage=21600, stale-while-revalidate=86400');
    return res.status(200).json({ ano: Number(ano), gastos: data || [] });
  } catch (e) {
    // Erro honesto: lista vazia seria lida como "nao gastou nada", que e outra coisa.
    return res.status(500).json({ erro: e.message });
  }
}
