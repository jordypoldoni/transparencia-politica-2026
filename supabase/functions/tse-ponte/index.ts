// tse-ponte — repassa requisicoes ao DivulgaCandContas do TSE. (19/09/2026, v2 em 20/09/2026)
//
// POR QUE ESTA FUNCAO EXISTE
// O Akamai do TSE bloqueia por ORIGEM, faixa de datacenter. Recusou com 403 a Vercel
// (18/09), o sandbox de nuvem e o runner do GitHub Actions (19/09, as 28 fichas mais as
// duas listagens). A maquina do Jordy passa. As Edge Functions do Supabase, medidas no
// mesmo dia pela funcao `sonda-tse`, TAMBEM passam: HTTP 200, 33.707 bytes, 1,7s, da
// regiao sa-east-1.
//
// Entao o caminho e: GitHub Actions -> esta funcao -> TSE. O GitHub ja alcanca o Supabase
// todo dia no coletar.yml, e o Supabase alcanca o TSE.
//
// POR QUE ELA E BURRA DE PROPOSITO
// Ela NAO interpreta nada do que o TSE devolve. Toda a traducao dos campos continua em
// coletores/coletor_ficha_tse.js: o descarte de cpf e tituloEleitor, o respeito ao
// st_DIVULGA_BENS, o totalDeBens que nao se recalcula, os `sites` que vem com "https://"
// colado num arroba. Cada uma dessas decisoes custou uma sessao de investigacao, e duas
// copias dela seriam duas para manter em sincronia. Aqui so passa byte.
//
// SENHA PROPRIA (mudanca de 20/09/2026, e o motivo da v2)
// A v1 comparava o Authorization com a SUPABASE_SERVICE_ROLE_KEY que o Supabase injeta no
// ambiente. Media em 20/09: TODA chamada dava 401, inclusive com a chave do .env do Jordy.
// Causa: o projeto usa as chaves novas (sb_publishable_/sb_secret_), e o que o ambiente da
// funcao injeta deixou de ser o JWT legado que o coletor tem em maos. Era exatamente a
// hipotese anotada em 19/09, e o exit 1 do workflow era isto.
//
// Alem de nao funcionar, o desenho era ruim: a chave do BANCO viajava como senha de um
// endpoint publico, e qualquer vazamento dela seria vazamento do banco inteiro.
// Agora a ponte tem PONTE_TOKEN, um segredo que so serve para abrir a ponte. Se ele nao
// estiver definido, cai para o comportamento antigo, para nenhum deploy derrubar o que ja
// funciona; o log diz qual dos dois esta valendo.
//
// O caminho pedido continua restrito a /divulga/rest/ no host do DivulgaCandContas, para
// isto nao virar proxy aberto para a internet inteira.

import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const HOST = "https://divulgacandcontas.tse.jus.br";
const PREFIXO_PERMITIDO = "/divulga/rest/";

// O WAF do TSE exige que pareca navegador. Ja foi 'LumeCidadaoBot/1.0', assinado, que e o
// certo em principio, e o Akamai derrubou TODAS as fichas com ele, inclusive da maquina do
// Jordy. Nao troque sem testar contra a fonte. (Mesma nota do coletor.)
const UA = { "User-Agent": "Mozilla/5.0", Accept: "application/json" };

function recusa(status: number, motivo: string) {
  // O motivo vai tambem num cabecalho proprio para o coletor distinguir "a PONTE recusou"
  // de "o TSE respondeu tal coisa". Sem isso, um 401 da ponte chegaria no log do coletor
  // com a mesma cara de um 401 do TSE, e o diagnostico comecaria no lugar errado.
  return new Response(JSON.stringify({ erro: motivo }), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", "x-ponte-erro": motivo },
  });
}

// Comparacao de tempo constante: com o segredo trafegando num endpoint publico, comparar
// com === abre uma medicao de tempo para adivinhar caractere por caractere.
function iguais(a: string, b: string) {
  if (a.length !== b.length) return false;
  let d = 0;
  for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
}

Deno.serve(async (req: Request) => {
  const proprio = Deno.env.get("PONTE_TOKEN");
  const injetada = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const esperada = proprio || injetada;
  // Falha FECHADA: sem segredo nenhum no ambiente, ninguem entra. O contrario transformaria
  // um erro de configuracao num proxy publico.
  if (!esperada) return recusa(500, "nem PONTE_TOKEN nem SUPABASE_SERVICE_ROLE_KEY no ambiente");

  const enviado = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "").trim();
  if (!iguais(enviado, esperada)) {
    // Diagnostico VAI PARA O LOG, nunca para a resposta: quem chama sem credencial nao
    // recebe pista nenhuma sobre o formato do que deveria ter mandado.
    console.log(
      `401 | senha em uso: ${proprio ? "PONTE_TOKEN" : "SUPABASE_SERVICE_ROLE_KEY (compatibilidade)"}` +
      ` | esperada: ${esperada.length} chars, prefixo "${esperada.slice(0, 4)}"` +
      ` | recebida: ${enviado.length} chars, prefixo "${enviado.slice(0, 4)}"`,
    );
    return recusa(401, "credencial invalida");
  }

  const caminho = new URL(req.url).searchParams.get("caminho") || "";
  if (!caminho.startsWith(PREFIXO_PERMITIDO) || caminho.includes("..")) {
    return recusa(400, `caminho fora de ${PREFIXO_PERMITIDO}: ${caminho.slice(0, 120)}`);
  }

  try {
    const r = await fetch(HOST + caminho, { headers: UA, signal: AbortSignal.timeout(25000) });
    const corpo = await r.text();
    // O status do TSE passa adiante INTACTO. O coletor ja sabe ler "HTTP 403" e "corpo
    // vazio (id de eleicao errado?)"; a ponte nao pode maquiar nenhum dos dois.
    return new Response(corpo, {
      status: r.status,
      headers: {
        "Content-Type": r.headers.get("Content-Type") || "application/json; charset=utf-8",
        "x-ponte-origem": "tse",
      },
    });
  } catch (e) {
    // Em falha de conexao o Deno poe "error sending request" em message e o motivo real em
    // cause. Foi exatamente esse detalhe que escondeu o 403 da Vercel por uma sessao inteira.
    const msg = String((e as Error)?.message ?? e);
    const causa = String(((e as Error)?.cause as unknown) ?? "");
    return recusa(502, `falha ao falar com o TSE: ${msg}${causa ? ` | causa: ${causa}` : ""}`);
  }
});
