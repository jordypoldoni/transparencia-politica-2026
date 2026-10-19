// Coletor dos recursos do Senado por senador e ano (19/10/2026): cotas, gastos NAO inclusos nas cotas,
// beneficios e pessoal. Fonte: https://adm.senado.gov.br/adm-dadosabertos (recursos-utilizados).
// Uso: node coletor_recursos_senado.js [2026 2025 ...] [--dry]   (padrao: ano corrente)
// Idempotente: upsert por (agente_id, ano). Falha de um senador nao derruba os demais, mas mais de
// 10% de falhas derruba a rodada (a fonte mudou ou caiu).
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import { registrarStatus } from './_status.js';
import { lerRecursos } from './_recursos_senado.js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const DRY = process.argv.includes('--dry');
const anosArg = process.argv.filter((a) => /^\d{4}$/.test(a)).map(Number);
const ANOS = anosArg.length ? anosArg : [new Date().getUTCFullYear()];
const BASE = 'https://adm.senado.gov.br/adm-dadosabertos/api/v1/senadores';

if (!SUPABASE_URL || !SUPABASE_KEY) { console.error('Faltam credenciais Supabase.'); process.exit(1); }
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const dorme = (ms) => new Promise((r) => setTimeout(r, ms));

async function buscar(cod, ano) {
  let ultimo;
  for (let t = 1; t <= 2; t++) {
    try {
      const r = await fetch(`${BASE}/${cod}/recursos-utilizados?ano=${ano}&formato=json`, { headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(15000) });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return await r.json();
    } catch (e) { ultimo = e; await dorme(1500 * t); }
  }
  throw ultimo;
}

async function main() {
  const { data: senadores, error } = await supabase.from('agentes_politicos').select('id, nome_urna, id_externo_api').ilike('fonte_api', '%senado%').not('id_externo_api', 'is', null);
  if (error) throw error;
  console.log(`Senadores no banco: ${senadores.length}. Anos: ${ANOS.join(', ')}${DRY ? ' (dry)' : ''}.`);

  // Total CEAPS que o Lume tem (sem 'Outras despesas'), para conferir contra o total oficial.
  let gravadas = 0, vazias = 0, falhas = [], divergentes = [];
  for (const ano of ANOS) {
    const { data: radar } = await supabase.from('radar_gastos').select('id, total').eq('casa', 'Senado').eq('ano', ano);
    const nosso = new Map((radar || []).map((r) => [r.id, Number(r.total)]));
    const linhas = [];
    let n = 0, t0 = Date.now();
    for (const s of senadores) {
      if (++n % 20 === 0 && process.env.GITHUB_ACTIONS) console.log(`::notice title=Recursos ${ano} progresso::${n}/${senadores.length} em ${Math.round((Date.now() - t0) / 1000)}s, ${falhas.length} falhas`);
      // Fonte fora do ar: 8 falhas seguidas no inicio derrubam a rodada em vez de esperar 88 timeouts.
      if (n === 9 && linhas.length === 0 && falhas.length >= 8) throw new Error(`Recursos do Senado: as 8 primeiras chamadas falharam (${falhas[0]})`);
      try {
        const rec = lerRecursos(await buscar(s.id_externo_api, ano));
        if (!rec) { vazias++; continue; }
        linhas.push({ agente_id: s.id, ano, ...rec, coletado_em: new Date().toISOString() });
        const meu = nosso.get(s.id);
        if (meu !== undefined && Math.abs(meu - rec.cotas_total) > 1) divergentes.push(`${s.nome_urna} ${ano}: Lume ${meu.toFixed(2)} x Senado ${rec.cotas_total.toFixed(2)}`);
      } catch (e) { falhas.push(`${s.nome_urna} ${ano}: ${e.message}`); }
      await dorme(150);
    }
    if (!DRY && linhas.length) {
      for (let i = 0; i < linhas.length; i += 100) {
        const { error: eUp } = await supabase.from('senado_recursos').upsert(linhas.slice(i, i + 100), { onConflict: 'agente_id,ano' });
        if (eUp) throw new Error(`falha ao gravar ${ano}: ${eUp.message}`);
      }
    }
    gravadas += linhas.length;
    console.log(`${ano}: ${linhas.length} senadores${DRY ? ' lidos (nada gravado)' : ' gravados'}.`);
  }
  const resumo = `${gravadas} registros, ${vazias} sem registro, ${falhas.length} falhas, ${divergentes.length} com total de cotas diferente do Lume (${divergentes.slice(0, 5).join(' | ')})`;
  console.log(resumo);
  if (process.env.GITHUB_ACTIONS) {
    console.log(`::notice title=Recursos do Senado ${DRY ? '(dry)' : ''}::${resumo}`);
    if (falhas.length) console.log(`::warning title=Recursos do Senado, falhas::${falhas.slice(0, 5).join(' | ')}`);
  }
  if (falhas.length > Math.max(3, senadores.length * ANOS.length * 0.1)) throw new Error(`Recursos do Senado: ${falhas.length} falhas; ex.: ${falhas[0]}`);
  if (!DRY) await registrarStatus(supabase, { fonte: 'recursos_senado', linhas: gravadas });
}
main().catch((e) => { console.error(e); process.exit(1); });
