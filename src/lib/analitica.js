// MEDIÇÃO DE VISITAS (31/10/2026, pedido do Jordy: medir o tráfego real para planejar custo e
// para o plano apresentado ao financiador). Usa a Vercel Web Analytics, que não usa cookie e
// guarda só dado agregado.
//
// POR QUE ESTA FUNÇÃO EXISTE: a medição registra o ENDEREÇO de cada página. O link de
// compartilhar a cédula (/cola?uf=RS&df=...&s=...) carrega na própria URL os candidatos que a
// pessoa escolheu, e voto é dado pessoal sensível (LGPD, art. 5º, II). Esse endereço NUNCA pode
// ir para a medição com os parâmetros. Então, antes de enviar, esta função corta a parte depois
// do "?" e do "#" de qualquer endereço sob /cola. Os outros endereços seguem inteiros.
//
// Função pura: roda no navegador, no `beforeSend` do componente <Analytics />.
const CAMINHOS_SEM_PARAMETROS = ['/cola'];

const caminhoProtegido = (caminho) =>
  CAMINHOS_SEM_PARAMETROS.some((c) => caminho === c || caminho.startsWith(`${c}/`));

export function limparEnderecoParaMedicao(evento) {
  if (!evento || typeof evento.url !== 'string') return evento;
  let u;
  try { u = new URL(evento.url, 'https://www.lumecidadao.com.br'); } catch { return evento; }
  if (!caminhoProtegido(u.pathname)) return evento;
  u.search = '';
  u.hash = '';
  return { ...evento, url: u.toString() };
}
