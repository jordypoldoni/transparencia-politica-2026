/**
 * Utilitário: atualiza a view materializada radar_gastos após coletas de gastos.
 * A view agrega ~600 mil linhas — materialized = query da home é instantânea.
 * Chame ao final de qualquer coletor que grave em despesas_parlamentares.
 *
 * Resiliente a soluços passageiros (tenta de novo com espera) e, se falhar de
 * verdade, avisa de um jeito que dá pra notar sem precisar abrir o log inteiro:
 * no GitHub Actions vira um aviso destacado na página de resumo da execução
 * (procure o ícone amarelo ⚠️ no topo do "Run" no GitHub); rodando local, sai um
 * aviso bem chamativo no terminal. Em nenhum dos dois casos isso derruba o
 * coletor — a tabela despesas_parlamentares já está gravada e correta de
 * qualquer forma; só o destaque "radar de gastos" da home é que ficaria
 * desatualizado até o próximo refresh dar certo.
 */
import { createClient } from '@supabase/supabase-js';

const delay = (ms) => new Promise((r) => setTimeout(r, ms));

export async function refreshRadar() {
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
  );
  console.log('🔄 Atualizando view materializada radar_gastos…');

  const TENTATIVAS = 3;
  let ultimoErro = null;
  for (let t = 1; t <= TENTATIVAS; t++) {
    const { error } = await supabase.rpc('refresh_radar_gastos');
    if (!error) {
      console.log('✅ radar_gastos atualizado.');
      return;
    }
    ultimoErro = error;
    if (t < TENTATIVAS) {
      const espera = t * 10;
      console.warn(`⚠️  Refresh do radar falhou (tentativa ${t}/${TENTATIVAS}): ${error.message} — tentando de novo em ${espera}s...`);
      await delay(espera * 1000);
    }
  }

  const msg = `radar_gastos NÃO foi atualizado após ${TENTATIVAS} tentativas (${ultimoErro?.message || 'erro desconhecido'}). A tabela de despesas está correta — só o destaque "radar de gastos" da home pode estar desatualizado até o próximo coletor rodar com sucesso.`;
  console.error(`🚨🚨🚨 ${msg}`);
  // Reconhecido pelo GitHub Actions: vira um aviso amarelo destacado direto na
  // página de resumo da execução, sem precisar abrir o log pra notar.
  if (process.env.GITHUB_ACTIONS) {
    console.log(`::warning title=radar_gastos desatualizado::${msg}`);
  }
}
