// "Em alta" das votações (07/11/2026): quais matérias da lista "Mais importante" estão em alta
// no país AGORA. Duas fontes públicas, cruzadas por termos específicos de cada matéria
// (destaques_votacoes.termos): as buscas em alta do Google no Brasil e as manchetes do Google
// Notícias nas últimas 24 horas. A terceira fonte, os acessos do próprio site (Vercel), entra
// depois, quando houver uma chave de leitura configurada.
//
// Esta parte é pura (sem rede, sem banco) para ser testada. A coleta fica em
// coletores/coletor_em_alta.js.

// Minúsculas, sem acento, só letras e números separados por espaço único.
export function normalizar(texto) {
  return String(texto || '')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

// O termo precisa aparecer como palavra inteira: "PLP 114" não casa com "PLP 1140".
export function contemTermo(texto, termos) {
  const alvo = ` ${normalizar(texto)} `;
  return (termos || []).some((t) => {
    const n = normalizar(t);
    return n && alvo.includes(` ${n} `);
  });
}

const decodifica = (s) => String(s || '')
  .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
  .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'");

// <item><title>…</title><ht:approx_traffic>200+</ht:approx_traffic> do feed de buscas em alta.
export function lerTendencias(xml) {
  return [...String(xml || '').matchAll(/<item>([\s\S]*?)<\/item>/g)].map((m) => {
    const titulo = decodifica((m[1].match(/<title>([\s\S]*?)<\/title>/) || [])[1]).trim();
    const tr = (m[1].match(/<ht:approx_traffic>([\s\S]*?)<\/ht:approx_traffic>/) || [])[1] || '';
    return { titulo, trafego: parseInt(tr.replace(/\D/g, ''), 10) || 0 };
  }).filter((x) => x.titulo);
}

// Títulos das manchetes do Google Notícias, sem o " - Veículo" do fim.
export function lerManchetes(xml) {
  return [...String(xml || '').matchAll(/<item>([\s\S]*?)<\/item>/g)]
    .map((m) => decodifica((m[1].match(/<title>([\s\S]*?)<\/title>/) || [])[1]).replace(/\s+-\s+[^-]+$/, '').trim())
    .filter(Boolean);
}

export const MIN_MANCHETES = 3; // menos que isso é acaso, não assunto do dia

// destaques: [{ casa, proposicao_id, termos }]; tendencias: lerTendencias(); manchetes: { primeiroTermo: [títulos] }.
// Devolve as linhas de em_alta_votacoes, da mais em alta para a menos. Fonte que falhou entra como
// null: a matéria só pode ganhar etiqueta das fontes que realmente responderam.
export function avaliarEmAlta({ destaques, tendencias, manchetes }) {
  const linhas = [];
  for (const d of destaques || []) {
    const termos = d.termos || [];
    if (!termos.length) continue;
    const fontes = [];
    const detalhe = {};
    if (Array.isArray(tendencias)) {
      const achadas = tendencias.filter((x) => contemTermo(x.titulo, termos));
      if (achadas.length) { fontes.push('google'); detalhe.busca = achadas[0].titulo; detalhe.trafego = Math.max(...achadas.map((x) => x.trafego)); }
    }
    let n = 0;
    const lista = manchetes && manchetes[termos[0]];
    if (Array.isArray(lista)) {
      n = lista.filter((t) => contemTermo(t, termos)).length;
      if (n >= MIN_MANCHETES) { fontes.push('noticias'); detalhe.manchetes = n; }
    }
    if (!fontes.length) continue;
    linhas.push({ casa: d.casa, proposicao_id: String(d.proposicao_id), fontes, pontos: fontes.length * 100 + Math.min(n, 50), detalhe });
  }
  return linhas.sort((a, b) => b.pontos - a.pontos);
}

export const ROTULO_FONTE = { google: 'Buscas em alta no Google', noticias: 'Nas notícias', site: 'Mais lida aqui' };
export const VALIDADE_HORAS = 12; // coletor parado: a seção some em vez de mostrar ranking velho
