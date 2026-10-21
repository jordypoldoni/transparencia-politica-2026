// Carga ÚNICA e no lugar de restituição e glosa da cota da Câmara (21/10/2026).
// Atualiza só as linhas que têm glosa ou restituição maior que zero, SEM apagar nem reinserir nada
// (regravar o ano inteiro incha a tabela; o banco está perto do teto de 500 MB).
// Casa a linha do arquivo com a do banco por agente + documento + mês + valor líquido + data de emissão.
// Chave com valores conflitantes dentro do próprio arquivo é CONTADA e PULADA, nunca adivinhada.
// Idempotente: rodar de novo grava os mesmos valores.
//
// Uso: node coletores/carga_restituicao_glosa.js 2026 --dry-run   (só mede)
//      node coletores/carga_restituicao_glosa.js 2026             (grava)
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import { lerCsv, paraNumero, baixarCotaAnual } from './cota_arquivo.js';

const args = process.argv.slice(2);
const ANO = parseInt(args.find((a) => /^\d{4}$/.test(a)) || process.env.ANO || '2026', 10);
const DRY = args.includes('--dry-run');
if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) { console.error('❌ Faltam SUPABASE_URL e/ou SUPABASE_SERVICE_ROLE_KEY.'); process.exit(1); }
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const nota = (titulo, linhas) => console.log(`::notice title=${titulo}::${linhas.join('%0A')}`);
const cent = (n) => Math.round(n * 100);

const { data: agentes, error } = await supabase.from('agentes_politicos').select('id, id_externo_api')
  .or('fonte_api.ilike.%camara%,cargo_atual.ilike.%deputado%federal%');
if (error) throw error;
const porId = new Map();
for (const a of agentes || []) { const m = String(a.id_externo_api || '').trim().match(/(\d+)$/); if (m) porId.set(m[1], a.id); }

const linhas = lerCsv(await baixarCotaAnual(ANO));
const cab = linhas.shift().map((c) => c.trim());
const ix = (n) => { const i = cab.indexOf(n); if (i < 0) throw new Error(`coluna ${n} ausente`); return i; };
const [iCad, iAno, iMes, iVlr, iData, iDoc, iGlosa, iRest, iDRest] =
  ['ideCadastro', 'numAno', 'numMes', 'vlrLiquido', 'datEmissao', 'ideDocumento', 'vlrGlosa', 'vlrRestituicao', 'datPagamentoRestituicao'].map(ix);

// Agrupa TODAS as linhas pela chave: assim uma linha sem glosa com a mesma chave de uma com glosa vira conflito.
const grupos = new Map();
let semDeputado = 0;
for (const l of linhas) {
  if (l.length < cab.length - 2) continue;
  const cad = (l[iCad] || '').trim();
  if (!cad || (l[iAno] || '').trim() !== String(ANO)) continue;
  const agente = porId.get(cad);
  const rest = paraNumero(l[iRest]), glosa = paraNumero(l[iGlosa]);
  if (!agente) { if (rest > 0 || glosa > 0) semDeputado++; continue; }
  const doc = (l[iDoc] || '').trim() || null;
  const mes = parseInt((l[iMes] || '0').trim(), 10) || null;
  const valor = paraNumero(l[iVlr]);
  const emissao = (l[iData] || '').trim() ? l[iData].trim().slice(0, 10) : null;
  const k = `${agente}|${doc}|${mes}|${cent(valor)}|${emissao}`;
  const dr = rest > 0 && (l[iDRest] || '').trim() ? l[iDRest].trim().slice(0, 10) : null;
  const v = `${rest > 0 ? cent(rest) : 0}|${rest > 0 ? dr : ''}|${glosa > 0 ? cent(glosa) : 0}`;
  const g = grupos.get(k) || { item: { agente_id: agente, doc, mes, valor, emissao, rest: rest > 0 ? rest : null, dr, glosa: glosa > 0 ? glosa : null }, vs: new Set(), n: 0 };
  g.vs.add(v); g.n++; grupos.set(k, g);
}

const itens = [];
let conflitos = 0, conflitosLinhas = 0, tG = 0, sG = 0, tR = 0, sR = 0;
for (const g of grupos.values()) {
  if (g.vs.size > 1) { conflitos++; conflitosLinhas += g.n; continue; }
  const it = g.item;
  if (it.rest == null && it.glosa == null) continue;
  itens.push(it);
  // totais esperados no banco: cada linha do arquivo daquele grupo recebe o valor
  if (it.glosa != null) { tG += g.n; sG += cent(it.glosa) * g.n; }
  if (it.rest != null) { tR += g.n; sR += cent(it.rest) * g.n; }
}
nota(`carga ${ANO}: o que o arquivo manda gravar`, [
  `grupos de chave: ${grupos.size}`,
  `itens a gravar: ${itens.length}`,
  `linhas com glosa > 0: ${tG} · soma R$ ${(sG / 100).toFixed(2)}`,
  `linhas com restituição > 0: ${tR} · soma R$ ${(sR / 100).toFixed(2)}`,
  `chaves em conflito (puladas): ${conflitos} (${conflitosLinhas} linhas)`,
  `linhas com glosa/restituição de quem não está no banco: ${semDeputado}`,
]);
if (DRY) { console.log('Simulação: nada gravado.'); process.exit(0); }

let atualizadas = 0, lotes = 0;
for (let i = 0; i < itens.length; i += 500) {
  const { data, error: e } = await supabase.rpc('aplicar_restituicao_glosa', { p_ano: ANO, p_itens: itens.slice(i, i + 500) });
  if (e) { console.error(`💥 lote ${i}: ${e.message}`); process.exit(1); }
  atualizadas += data; lotes++;
}
nota(`carga ${ANO}: gravado`, [`${itens.length} itens em ${lotes} lotes · ${atualizadas} linhas do banco atualizadas`]);
