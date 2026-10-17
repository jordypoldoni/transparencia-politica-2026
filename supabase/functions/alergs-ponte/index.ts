// alergs-ponte: repassa GETs ao portal da ALERGS (Assembleia Legislativa do RS). (17/10/2026, T4b, D-035)
//
// POR QUE EXISTE
// A ALERGS bloqueia por ORIGEM os servidores do GitHub Actions: a conexao TCP expira
// (UND_ERR_CONNECT_TIMEOUT, ~10,5 s), enquanto do Brasil responde normal. A sonda de 17/10 mostrou que
// uma Edge Function do Supabase executada em sa-east-1 recebe 200 nos tres enderecos usados pelos
// coletores. Caminho: GitHub Actions -> esta funcao -> ALERGS. Mesmo desenho da tse-ponte.
//
// REGIAO: o Supabase executa a funcao na regiao mais proxima de QUEM CHAMA. O GitHub chama dos EUA,
// e a funcao rodaria em us-east-1 (visto nos logs da tse-ponte). O coletor DEVE mandar o cabecalho
// `x-region: sa-east-1` para a saida ser sempre pelo Brasil, como no teste que deu certo.
//
// POR QUE E BURRA DE PROPOSITO
// Nao interpreta nada. O parser, as travas de exclusao e a gravacao no banco continuam nos
// coletores (coletor_votos_alergs.js e coletor_gastos_alergs.js). Aqui so passa byte, e o status
// da ALERGS passa INTACTO.
//
// SEGURANCA
// - Senha PROPRIA (ALERGS_PONTE_TOKEN), separada da PONTE_TOKEN da tse-ponte: vazar uma nao abre a outra.
//   Sem o segredo no ambiente a funcao FALHA FECHADA (ninguem entra).
// - So GET. Destino escolhido por NOME (`alvo`), nunca por URL livre; o caminho precisa casar com os
//   prefixos da lista DESTINOS. Isso impede virar proxy aberto.
// - Para incluir uma fonte nova (outra Assembleia, por exemplo), acrescente uma entrada em DESTINOS.

import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const DESTINOS: Record<string, { base: string; prefixos: string[] }> = {
  // JSON da lista de deputados em exercicio (porta 5000)
  lista: {
    base: "https://ww4.al.rs.gov.br:5000",
    prefixos: ["/listarDestaqueDeputados"],
  },
  // Portal de transparencia (Drupal): votos em plenario e gastos de gabinete
  portal: {
    base: "https://transparencia.al.rs.gov.br",
    prefixos: [
      "/parlamentares/votos-plenario",
      "/parlamentares/gastos",
      "/ajax-gastosParlamentaresListarMes",
      "/ajax-gastosParlamentaresListarGabinete",
    ],
  },
};

// O portal devolve a pagina VAZIA (200, sem resultado) para cliente que nao parece navegador.
// Mesmos cabecalhos dos coletores.
const CAB_BASE = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
  "Accept-Language": "pt-BR,pt;q=0.9,en;q=0.8",
};

function recusa(status: number, motivo: string) {
  // O motivo vai num cabecalho proprio para o coletor distinguir "a PONTE recusou" de
  // "a ALERGS respondeu tal coisa".
  return new Response(JSON.stringify({ erro: motivo }), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", "x-ponte-erro": motivo },
  });
}

// Comparacao de tempo constante, para nao permitir adivinhar a senha por medicao de tempo.
function iguais(a: string, b: string) {
  if (a.length !== b.length) return false;
  let d = 0;
  for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
}

// O caminho (com a query) precisa comecar por um prefixo permitido, e o prefixo tem de terminar ali
// ou ser seguido de "/" ou "?" (assim "/parlamentares/gastosX" nao passa).
function permitido(caminho: string, prefixos: string[]) {
  if (!caminho.startsWith("/") || caminho.includes("..") || caminho.includes("\\") || caminho.includes("@")) {
    return false;
  }
  return prefixos.some((p) => {
    if (!caminho.startsWith(p)) return false;
    const resto = caminho.slice(p.length);
    return resto === "" || resto[0] === "/" || resto[0] === "?";
  });
}

Deno.serve(async (req: Request) => {
  if (req.method !== "GET") return recusa(405, "so GET");

  const esperada = Deno.env.get("ALERGS_PONTE_TOKEN");
  if (!esperada) return recusa(500, "ALERGS_PONTE_TOKEN ausente no ambiente");

  const enviado = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "").trim();
  if (!iguais(enviado, esperada)) {
    // Diagnostico so no log, nunca na resposta, e sem imprimir pedaco da senha.
    console.log(`401 | esperada: ${esperada.length} chars | recebida: ${enviado.length} chars`);
    return recusa(401, "credencial invalida");
  }

  const url = new URL(req.url);
  const alvo = url.searchParams.get("alvo") || "";
  const caminho = url.searchParams.get("caminho") || "";
  const destino = DESTINOS[alvo];
  if (!destino) return recusa(400, `alvo desconhecido: ${alvo.slice(0, 40)}`);
  if (!permitido(caminho, destino.prefixos)) {
    return recusa(400, `caminho fora da lista permitida para ${alvo}: ${caminho.slice(0, 120)}`);
  }

  // Accept e Referer podem vir do coletor (a ALERGS muda a resposta conforme eles), mas o Referer
  // so e aceito se apontar para um host da propria lista.
  const cab: Record<string, string> = { ...CAB_BASE };
  const accept = req.headers.get("x-accept");
  if (accept) cab["Accept"] = accept.slice(0, 200);
  const referer = req.headers.get("x-referer");
  if (referer && Object.values(DESTINOS).some((d) => referer.startsWith(d.base + "/"))) {
    cab["Referer"] = referer.slice(0, 300);
  }

  try {
    const r = await fetch(destino.base + caminho, { headers: cab, signal: AbortSignal.timeout(30000) });
    const corpo = await r.text();
    // Status da ALERGS passa INTACTO: o coletor ja sabe tratar "HTTP 5xx" e pagina vazia.
    return new Response(corpo, {
      status: r.status,
      headers: {
        "Content-Type": r.headers.get("Content-Type") || "text/plain; charset=utf-8",
        "x-ponte-origem": "alergs",
      },
    });
  } catch (e) {
    // No Deno o motivo real da falha de conexao vem em `cause`.
    const msg = String((e as Error)?.message ?? e);
    const causa = String(((e as Error)?.cause as unknown) ?? "");
    return recusa(502, `falha ao falar com a ALERGS: ${msg}${causa ? ` | causa: ${causa}` : ""}`);
  }
});
