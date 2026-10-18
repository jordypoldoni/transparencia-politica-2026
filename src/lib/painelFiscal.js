// PAINEL FISCAL (17/10/2026, página de gastos públicos v2): transforma o resumo do SICONFI
// (fiscal_resumo.detalhe + fiscal_funcao) nos blocos que a tela mostra. Função pura, testada em
// tests/painelFiscal.test.mjs, para a tela não fazer conta.
//
// Conceitos oficiais (Tesouro Nacional, RREO Anexo 06):
//   resultado primário = receita primária - despesa primária (sem juros e sem dívida nova)
//   resultado nominal  = resultado primário - juros líquidos; é o déficit/superávit "de verdade"
//   a dívida líquida sobe (ou cai) pelo resultado nominal.
// "Gastou" é a despesa primária PAGA no ano (inclui restos a pagar de anos anteriores), que é a base
// em que o Tesouro calcula o resultado primário.

const NB = '\u00a0';
const junta = (s) => s.replace(/ /g, NB);
export const brlCompacto = (v) => junta(brlCompactoBruto(v));
const brlCompactoBruto = (v) => {
  if (v == null) return '-';
  const n = Number(v), abs = Math.abs(n);
  if (abs >= 1e12) return `R$ ${(n / 1e12).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} tri`;
  if (abs >= 1e9) return `R$ ${(n / 1e9).toLocaleString('pt-BR', { maximumFractionDigits: abs >= 1e10 ? 0 : 1 })} bi`;
  if (abs >= 1e6) return `R$ ${(n / 1e6).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} mi`;
  if (abs >= 1e3) return `R$ ${(n / 1e3).toLocaleString('pt-BR', { maximumFractionDigits: 0 })} mil`;
  return `R$ ${n.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}`;
};
// Um decimal em bilhões (R$ 94,9 bi), para somas que o leitor vai conferir de cabeça (94,9 + 707,6 = 802,4).
export const brlPreciso = (v) => {
  if (v == null) return '-';
  const n = Number(v), abs = Math.abs(n);
  if (abs >= 1e9 && abs < 1e12) return junta(`R$ ${(n / 1e9).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} bi`);
  return brlCompacto(v);
};
// Percentual real, com mais casas quando é pequeno (0,03% em vez de 0%). Só abaixo de 0,01% vira "<0,01%".
export const pct = (p) => {
  if (p > 0 && p < 0.01) return '<0,01%';
  const casas = p > 0 && p < 0.1 ? 2 : 1;
  return `${p.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: casas })}%`;
};

const ok = (...vs) => vs.every((v) => v != null && Number.isFinite(Number(v)));

// Textos de "o que é" por área. SÓ para a União: texto escrito para um âmbito não vale em outro
// (Diretrizes de Design, 19/09/2026).
const DESC_UNIAO = {
  'Previdência Social': 'Aposentadorias e pensões do INSS e dos servidores federais.',
  'Serviço da dívida': 'Juros e principal pagos aos credores do governo (dívida interna e externa).',
  'Repasses a estados e municípios': 'Parte da arrecadação que a lei manda dividir com estados e municípios.',
  'Outros encargos': 'Demais despesas que o Tesouro classifica como encargos especiais.',
  'Assistência Social': 'Bolsa Família, BPC e outros benefícios.',
  'Saúde': 'SUS, hospitais federais e medicamentos.',
  'Educação': 'Universidades e institutos federais e repasses para a educação básica.',
  'Trabalho': 'Seguro-desemprego e abono salarial.',
  'Defesa Nacional': 'Forças Armadas.',
};

// Subfunções de uma área: [{ nome, valor, pct }] com o percentual sobre o valor da ÁREA.
// "Demais subfunções" vira "Outras subfunções" e vai para o fim. O que a área tem a mais que a soma
// das subfunções entra em "Outras subfunções"; se a soma passar do valor da área (leitura
// duvidosa), não mostramos nada em vez de mostrar número errado. Menos de 2 linhas: não há o que abrir.
export const ROTULO_INTRA = 'Despesas entre órgãos do próprio governo';
export function montarSubs(valorArea, lista, intra = 0) {
  if (!Array.isArray(lista) || !(valorArea > 0)) return null;
  let outras = 0;
  const subs = [];
  // Intra-orçamentárias: já estão no valor da área, mas não nas subfunções. Entram como linha própria.
  if (intra > 0) subs.push({ nome: ROTULO_INTRA, valor: Number(intra) });
  for (const par of lista) {
    const nome = String(par[0] || '').trim();
    const v = Number(par[1]);
    if (!nome || !(v > 0)) continue;
    if (/^demais subfun[cç][oõ]es$/i.test(nome)) outras += v; else subs.push({ nome, valor: v });
  }
  const soma = subs.reduce((a, x) => a + x.valor, 0) + outras;
  if (soma > valorArea * 1.02) return null;
  const resto = valorArea - soma;
  if (resto > valorArea * 0.005) outras += resto;
  subs.sort((a, b) => b.valor - a.valor);
  if (outras > 0) subs.push({ nome: 'Outras subfunções', valor: outras, semDetalhe: true });
  if (subs.length < 2) return null;
  return subs.map((x) => ({ ...x, pct: (x.valor / valorArea) * 100 }));
}

// Para onde foi o dinheiro: as funções de governo, com "Encargos Especiais" aberto em serviço da
// dívida, repasses e outros (o nome sozinho não diz nada ao cidadão). Percentual sobre a soma dos itens.
// Cada área pode trazer `subs` (como o valor se divide por dentro), quando o ente detalha.
export function montarDestino({ funcoes, encargos, subfuncoes, intra, esfera, maxPrincipais = 9 }) {
  const lista = (funcoes || []).map((f) => ({ rotulo: f.funcao, valor: Number(f.valor) || 0 })).filter((f) => f.valor > 0);
  const subDe = (f) => montarSubs(f.valor, subfuncoes && subfuncoes[f.rotulo], intra && intra[f.rotulo]);
  const enc = lista.find((f) => f.rotulo === 'Encargos Especiais');
  let itens = lista.map((f) => (f === enc ? f : { ...f, subs: subDe(f) }));
  if (enc && encargos && (ok(encargos.divida_interna) || ok(encargos.divida_externa) || ok(encargos.transferencias))) {
    const interna = Number(encargos.divida_interna) || 0;
    const externa = Number(encargos.divida_externa) || 0;
    const divida = interna + externa;
    const repasses = Number(encargos.transferencias) || 0;
    const outros = Math.max(0, enc.valor - divida - repasses);
    itens = itens.filter((f) => f !== enc);
    if (divida > 0) {
      const subs = [];
      if (interna > 0) subs.push({ nome: 'Dívida interna (credores no Brasil)', valor: interna, pct: (interna / divida) * 100 });
      if (externa > 0) subs.push({ nome: 'Dívida externa (credores no exterior)', valor: externa, pct: (externa / divida) * 100 });
      itens.push({ rotulo: 'Serviço da dívida', valor: divida, divida: true, subs: subs.length > 1 ? subs : null });
    }
    if (repasses > 0) itens.push({ rotulo: 'Repasses a estados e municípios', valor: repasses });
    if (outros > 0) {
      const resto = ((subfuncoes && subfuncoes['Encargos Especiais']) || [])
        .filter(([n]) => !/^(servi[cç]o da d[ií]vida (interna|externa)|transfer[eê]ncias)$/i.test(String(n).trim()));
      itens.push({ rotulo: 'Outros encargos', valor: outros, subs: montarSubs(outros, resto, intra && intra['Encargos Especiais']) });
    }
  } else if (enc) {
    itens = itens.map((f) => (f === enc ? { ...f, subs: subDe(f) } : f));
  }
  const total = itens.reduce((a, f) => a + f.valor, 0);
  itens = itens.sort((a, b) => b.valor - a.valor).map((f) => ({
    ...f, pct: total ? (f.valor / total) * 100 : 0,
    desc: esfera === 'U' ? DESC_UNIAO[f.rotulo] || null : null,
  }));
  const principais = itens.slice(0, maxPrincipais);
  const resto = itens.slice(maxPrincipais);
  const outras = resto.length ? { rotulo: 'Outras áreas', valor: resto.reduce((a, f) => a + f.valor, 0), n: resto.length } : null;
  if (outras) outras.pct = total ? (outras.valor / total) * 100 : 0;
  return { total, itens, principais, outras };
}

// Quadro completo. `v2` só quando o ente publica o resultado primário e nominal (hoje: União).
export function montarPainel({ resumo, funcoes, ente }) {
  const d = (resumo && resumo.detalhe) || {};
  const r = d.resultados || {};
  const rec = d.receita || {};
  const destino = montarDestino({ funcoes, encargos: d.encargos, subfuncoes: d.subfuncoes, intra: d.intra, esfera: ente && ente.esfera });
  const v2 = ok(r.receita_primaria, r.despesa_primaria_paga, r.resultado_primario, r.resultado_nominal,
    r.juros_ativos, r.juros_passivos, r.divida_liquida_inicio, r.divida_liquida_atual);
  if (!v2) return { v2: false, destino };

  const juros = Number(r.juros_passivos) - Number(r.juros_ativos);
  const aumentoDivida = Number(r.divida_liquida_atual) - Number(r.divida_liquida_inicio);
  const direta = Number(r.receita_primaria) - Number(r.despesa_primaria_paga);
  let origem = null;
  if (ok(rec.tributaria, rec.contribuicoes)) {
    const outras = Number(r.receita_primaria) - Number(rec.tributaria) - Number(rec.contribuicoes);
    if (outras >= 0) {
      const base = Number(r.receita_primaria);
      origem = [
        { chave: 'contribuicoes', rotulo: 'Contribuições (INSS, PIS, Cofins...)', curto: 'Contribuições', valor: Number(rec.contribuicoes) },
        { chave: 'impostos', rotulo: 'Impostos e taxas (renda, IPI, IOF...)', curto: 'Impostos', valor: Number(rec.tributaria) },
        { chave: 'outras', rotulo: 'Concessões, serviços e outras', curto: 'Outras', valor: outras },
      ].map((o) => ({ ...o, pct: (o.valor / base) * 100 }));
    }
  }
  return {
    v2: true,
    arrecadou: Number(r.receita_primaria),
    gastou: Number(r.despesa_primaria_paga),
    primario: Number(r.resultado_primario),          // negativo = gastou mais do que arrecadou
    ajuste: ok(r.ajuste_metodologico) ? Number(r.ajuste_metodologico) : 0,
    direta,
    juros,
    nominal: Number(r.resultado_nominal),
    deficit: Number(r.resultado_nominal) < 0,
    divida: { inicio: Number(r.divida_liquida_inicio), atual: Number(r.divida_liquida_atual), aumento: aumentoDivida },
    origem,
    destino,
  };
}
