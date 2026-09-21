// GET /api/candidatura-anterior?ano=2014&ue=RS&id_eleicao=680&sq=210000000657
//
// Detalhe de UMA candidatura anterior, buscado na hora quando o leitor expande o ano na seção
// de trajetória eleitoral. (21/09/2026)
//
// POR QUE NA HORA, E NÃO NO BANCO: escolha do Jordy em 21/09. São 16.761 candidaturas
// anteriores; coletar todas custaria ~3h e ~25 MB do plano free. Buscando no clique, o custo é
// zero de banco, e dado de eleição passada não muda, então o cache na borda pode ser longo.
//
// POR QUE PELA PONTE: o Akamai do TSE recusa a Vercel com 403 (medido em 18/09). A ponte
// `tse-ponte` do Supabase passa. Sem TSE_PONTE_URL (desenvolvimento na máquina do Jordy, que
// passa pelo Akamai), a rota fala direto com o TSE.
//
// O QUE VOLTA: só o que a tela mostra, traduzido pela MESMA função dos coletores
// (coletores/ficha_tse_traduzir.js). CPF e título de eleitor nunca saem daqui.
//
// O QUE NÃO VOLTA, DE PROPÓSITO: `gastoCampanha1T`. Parece gasto de campanha e é o TETO legal
// de gasto do cargo naquela eleição (R$ 3.176.572,53 para qualquer deputado federal em 2022,
// conferido em 21/09). Mostrar como gasto seria afirmação falsa sobre o candidato.
import { traduzir } from '../../coletores/ficha_tse_traduzir.js';

const HOST_TSE = 'https://divulgacandcontas.tse.jus.br';
const UA = { 'User-Agent': 'Mozilla/5.0', Accept: 'application/json' };

export default async function handler(req, res) {
  const { ano, ue, id_eleicao: idEleicao, sq } = req.query;

  // Validação estrita: isto monta um caminho que vai para o TSE, e não pode virar proxy aberto.
  // ue é UF (duas letras) ou código de município (números).
  if (!/^\d{4}$/.test(ano || '') || !/^(\d{1,7}|[A-Z]{2})$/.test(ue || '') || !/^\d{1,12}$/.test(idEleicao || '') || !/^\d{1,15}$/.test(sq || '')) {
    return res.status(400).json({ erro: 'parâmetros inválidos' });
  }

  const caminho = `/divulga/rest/v1/candidatura/buscar/${ano}/${ue}/${idEleicao}/candidato/${sq}`;
  const ponte = process.env.TSE_PONTE_URL || null;

  try {
    const r = ponte
      ? await fetch(`${ponte}?caminho=${encodeURIComponent(caminho)}`, {
          headers: { Authorization: `Bearer ${process.env.PONTE_TOKEN || ''}` },
          signal: AbortSignal.timeout(20000),
        })
      : await fetch(HOST_TSE + caminho, { headers: UA, signal: AbortSignal.timeout(20000) });

    const erroDaPonte = r.headers.get('x-ponte-erro');
    if (erroDaPonte) throw new Error(`ponte: ${erroDaPonte}`);
    if (!r.ok) throw new Error(`TSE respondeu ${r.status}`);
    const texto = await r.text();
    // 200 com corpo vazio é o jeito do TSE dizer "combinação sem resultado". Não é ficha vazia.
    if (!texto) throw new Error('o TSE não devolveu a ficha desta candidatura');

    const f = JSON.parse(texto);
    const t = traduzir(f, () => null, sq, { ano: Number(ano), idEleicao, abrangencia: ue });

    // Dado de eleição encerrada não muda: 30 dias na borda, e mais 30 servindo o antigo enquanto
    // renova.
    res.setHeader('Cache-Control', 's-maxage=2592000, stale-while-revalidate=2592000');
    return res.status(200).json({
      ano: Number(ano),
      situacao: t.situacao_tse,
      resultado: t.totalizacao_tse,
      ocupacao: f.ocupacao || null,
      divulga_bens: t.divulga_bens,
      total_de_bens: t.divulga_bens ? t.total_de_bens : null,
      bens: t.divulga_bens ? t.bens : [],
      documentos: t.documentos,
    });
  } catch (e) {
    // Erro honesto: ficha vazia seria lida como "não declarou nada", que é outra coisa.
    return res.status(502).json({ erro: e.message || 'falha ao buscar no TSE' });
  }
}
