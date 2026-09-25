// Leitura do DivulgaCandContas (TSE) NA HORA, sem passar pelo banco. (25/09/2026)
//
// POR QUE EXISTE: deputado estadual são ~20 mil candidatos no país (1.431 só em SP) e guardar
// tudo custaria ~128 MB do plano gratuito. Medido em 25/09 pela ponte, o mesmo caminho da
// produção: a lista de SP chega em ~1 s (3,4 MB, quase tudo campo vazio), RS em 0,3 s, e uma
// ficha completa em 0,14 s. Rápido o bastante para buscar quando o leitor pede.
//
// POR QUE PELA PONTE: o Akamai do TSE recusa a Vercel com 403 (medido em 18/09). A função
// `tse-ponte` do Supabase passa. Sem TSE_PONTE_URL (na máquina do Jordy, que passa pelo
// Akamai), fala direto com o TSE. Mesmo desenho de /api/candidatura-anterior.
const HOST_TSE = 'https://divulgacandcontas.tse.jus.br';
const UA = { 'User-Agent': 'Mozilla/5.0', Accept: 'application/json' };

export async function lerTse(caminho, { timeoutMs = 20000 } = {}) {
  // Só o DivulgaCandContas, e só o que começa por /divulga/rest/: isto não vira proxy aberto.
  if (!String(caminho).startsWith('/divulga/rest/')) throw new Error('caminho fora do TSE');
  const ponte = process.env.TSE_PONTE_URL || null;
  const r = ponte
    ? await fetch(`${ponte}?caminho=${encodeURIComponent(caminho)}`, {
        headers: { Authorization: `Bearer ${process.env.PONTE_TOKEN || ''}` },
        signal: AbortSignal.timeout(timeoutMs),
      })
    : await fetch(HOST_TSE + caminho, { headers: UA, signal: AbortSignal.timeout(timeoutMs) });
  const erroDaPonte = r.headers.get('x-ponte-erro');
  if (erroDaPonte) throw new Error(`ponte: ${erroDaPonte}`);
  if (!r.ok) throw new Error(`TSE respondeu ${r.status}`);
  const texto = await r.text();
  // 200 com corpo vazio é o jeito do TSE dizer "combinação sem resultado".
  if (!texto) return null;
  return JSON.parse(texto);
}

// Endereço da foto montado só com o que a LISTA traz. Medido em 25/09 em 6 candidatos de SP,
// RS e RR: o `fotoUrl` da ficha é sempre /arquivo/img/{eleição}/{id}/{UF}. A lista vem com
// fotoUrl vazio, então sem isto o cartão precisaria de uma chamada por candidato.
// O próprio TSE decide o que servir nesse endereço: para id sem foto ele devolve a silhueta
// padrão dele (171x235), testado com um id inexistente. Não publicamos nada que ele não publique.
export const fotoTse = (idEleicao, sq, uf) =>
  `${HOST_TSE}/divulga/rest/arquivo/img/${idEleicao}/${sq}/${String(uf).toUpperCase()}`;

export const slugify = (s) => (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
