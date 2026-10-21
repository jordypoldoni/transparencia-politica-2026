// Diagnóstico SÓ DE LEITURA: perfil de CADA coluna do arquivo anual da cota da Câmara (preenchimento, valores
// distintos, mais frequentes e amostras). Serve para decidir, com dado e não com palpite, o que vale guardar. (21/10/2026)
// Uso: node coletores/diagnostico_perfil_colunas.js 2026
import { lerCsv, baixarCotaAnual } from './cota_arquivo.js';

const ANO = process.argv[2] || '2026';
const nota = (titulo, linhas) => console.log(`::notice title=${titulo}::${linhas.join('%0A')}`);
const linhas = lerCsv(await baixarCotaAnual(ANO));
const cab = linhas.shift().map((c) => c.trim());
const dados = linhas.filter((l) => l.length >= cab.length - 2 && (l[cab.indexOf('numAno')] || '').trim() === String(ANO) && (l[cab.indexOf('ideCadastro')] || '').trim());

const JA_GUARDADAS = new Set(['ideCadastro', 'numAno', 'numMes', 'txtDescricao', 'txtFornecedor', 'txtCNPJCPF', 'vlrLiquido', 'datEmissao', 'ideDocumento', 'urlDocumento', 'txNomeParlamentar']);
const SEM_PERFIL = new Set(['cpf', 'nuCarteiraParlamentar', 'txtPassageiro']); // dado pessoal: só conta preenchimento
const saida = [];
for (const [idx, nome] of cab.entries()) {
  if (JA_GUARDADAS.has(nome)) continue;
  const cont = new Map();
  let cheias = 0;
  for (const l of dados) {
    const v = (l[idx] || '').trim();
    if (!v) continue;
    cheias++;
    if (!SEM_PERFIL.has(nome)) cont.set(v, (cont.get(v) || 0) + 1);
  }
  const top = [...cont.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6).map(([v, n]) => `${v.slice(0, 40)}=${n}`).join('; ');
  saida.push(`${nome}: preenchida ${cheias}/${dados.length}, distintos ${SEM_PERFIL.has(nome) ? '(omitido)' : cont.size}${top && cont.size <= 40 ? ' | ' + top : (top ? ' | amostra ' + top : '')}`);
}
nota(`perfil das colunas não guardadas (${ANO})`, saida);

// Cruzamentos que decidem se vale guardar.
const i = (n) => cab.indexOf(n);
const porSub = new Map();
for (const l of dados) {
  const k = `${(l[i('txtDescricao')] || '').trim().slice(0, 34)} > ${(l[i('txtDescricaoEspecificacao')] || '').trim().slice(0, 30)}`;
  porSub.set(k, (porSub.get(k) || 0) + 1);
}
nota('tipo de despesa > especificação (linhas)', [...porSub.entries()].sort((a, b) => b[1] - a[1]).slice(0, 40).map(([k, n]) => `${k}: ${n}`));
const ress = new Map();
for (const l of dados) {
  if (!(l[i('numRessarcimento')] || '').trim()) continue;
  const k = (l[i('txtDescricao')] || '').trim().slice(0, 40);
  ress.set(k, (ress.get(k) || 0) + 1);
}
nota('onde aparece numRessarcimento', [...ress.entries()].sort((a, b) => b[1] - a[1]).map(([k, n]) => `${k}: ${n}`));
