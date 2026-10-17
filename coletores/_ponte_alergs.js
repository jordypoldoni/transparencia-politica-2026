// Acesso a ALERGS pelos coletores, direto ou pela ponte. (17/10/2026, T4b, D-035)
//
// O GitHub Actions nao alcanca a ALERGS (bloqueio por origem). A Edge Function `alergs-ponte` do
// Supabase repassa o GET (ver supabase/functions/alergs-ponte/index.ts). A escolha e EXPLICITA:
//   - sem ALERGS_PONTE_URL: fala direto com a ALERGS (rodada manual no PC do Jordy, IP do Brasil);
//   - com ALERGS_PONTE_URL: passa pela ponte, e entao ALERGS_PONTE_TOKEN e obrigatorio.
// Nao ha "tenta direto e cai para a ponte": um fallback silencioso esconderia qual caminho esta valendo.
//
// buscarAlergs(url, init) tem a mesma forma do fetch (usa so init.headers). Quem chama continua
// tratando status, retry e parse; este modulo so decide o caminho.
//
// Variaveis lidas na hora do uso (nao no import), para nao depender da ordem do `dotenv/config`.

const ALVOS = [
  ['https://ww4.al.rs.gov.br:5000', 'lista'],
  ['https://transparencia.al.rs.gov.br', 'portal'],
];

let avisou = false;

export async function buscarAlergs(url, init = {}) {
  const ponte = process.env.ALERGS_PONTE_URL || null;
  if (!avisou) {
    avisou = true;
    console.log(ponte ? `ALERGS via ponte: ${ponte}` : 'ALERGS direto (sem ponte)');
  }
  if (!ponte) return fetch(url, init);

  const token = process.env.ALERGS_PONTE_TOKEN;
  if (!token) throw Object.assign(new Error('ALERGS_PONTE_URL definido, mas falta ALERGS_PONTE_TOKEN'), { fatal: true });

  const par = ALVOS.find(([base]) => url.startsWith(base));
  if (!par) throw Object.assign(new Error(`endereco fora da lista da ponte: ${url}`), { fatal: true });
  const caminho = url.slice(par[0].length);

  const h = init.headers || {};
  const res = await fetch(`${ponte}?alvo=${par[1]}&caminho=${encodeURIComponent(caminho)}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      // Obriga a saida pelo Brasil: sem isto o Supabase roda a funcao perto de quem chama (EUA).
      'x-region': 'sa-east-1',
      ...(h.Accept ? { 'x-accept': h.Accept } : {}),
      ...(h.Referer ? { 'x-referer': h.Referer } : {}),
    },
  });

  // A ponte marca os erros DELA num cabecalho proprio, para nao confundir com erro da ALERGS.
  // 4xx e 500 sao de configuracao (senha, caminho, segredo ausente): repetir nao resolve.
  const erroDaPonte = res.headers.get('x-ponte-erro');
  if (erroDaPonte) {
    throw Object.assign(new Error(`ponte: ${erroDaPonte}`), { fatal: res.status !== 502 });
  }
  return res;
}
