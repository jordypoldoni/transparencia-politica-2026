// Devolução de valores à Câmara (21/10/2026). Vem do campo vlrRestituicao do arquivo anual da cota e é gravada em
// despesas_parlamentares.valor_restituido (+ data_restituicao) só quando maior que zero. O arquivo não diz o MOTIVO,
// então o texto é só fato e fonte (D-003): sem elogio, sem juízo.
import { dataBr } from './datas.js';

const reais = (v) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);

// linhas: [{ valor_restituido, data_restituicao }] de UM ano. Devolve null se não houve devolução.
export function resumoDevolucoes(linhas) {
  const ls = (linhas || []).filter((l) => Number(l && l.valor_restituido) > 0);
  if (!ls.length) return null;
  const datas = ls.map((l) => String(l.data_restituicao || '').slice(0, 10)).filter(Boolean).sort();
  return {
    total: Math.round(ls.reduce((s, l) => s + Number(l.valor_restituido) * 100, 0)) / 100,
    n: ls.length,
    de: datas[0] || null,
    ate: datas[datas.length - 1] || null,
  };
}

// { rotulo, texto } da linha do perfil; null se não houve devolução.
export function textoDevolucao(d) {
  if (!d) return null;
  const total = reais(d.total);
  const umDia = d.de && d.de === d.ate;
  if (d.n === 1) return { rotulo: 'Devolução à Câmara:', texto: d.de ? `${total} em ${dataBr(d.de)}` : total };
  if (umDia) return { rotulo: 'Devolução à Câmara:', texto: `${total} em ${dataBr(d.de)} (${d.n} lançamentos)` };
  if (d.de && d.ate) return { rotulo: 'Devoluções à Câmara:', texto: `${total} em ${d.n} lançamentos, de ${dataBr(d.de)} a ${dataBr(d.ate)}` };
  return { rotulo: 'Devoluções à Câmara:', texto: `${total} em ${d.n} lançamentos` };
}
