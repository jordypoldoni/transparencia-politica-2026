/**
 * Utilitário: atualiza a view materializada radar_gastos após coletas de gastos.
 * A view agrega ~600 mil linhas — materialized = query da home é instantânea.
 * Chame ao final de qualquer coletor que grave em despesas_parlamentares.
 */
import { createClient } from '@supabase/supabase-js';

export async function refreshRadar() {
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
  );
  console.log('🔄 Atualizando view materializada radar_gastos…');
  const { error } = await supabase.rpc('refresh_radar_gastos');
  if (error) {
    console.warn('⚠️  Refresh do radar falhou:', error.message);
  } else {
    console.log('✅ radar_gastos atualizado.');
  }
}
