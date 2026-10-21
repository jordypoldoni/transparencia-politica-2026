-- DESFAZ 20261021140000_gastos_agregados.sql: apaga a view gastos_agregados e devolve o refresh à versão
-- que atualiza só a radar_gastos e a radar_gastos_base (mantendo o statement_timeout de 300s).
create or replace function public.refresh_radar_gastos()
returns void
language plpgsql
security definer
set search_path = public, pg_temp
set statement_timeout = '300s'
as $$
begin
  refresh materialized view concurrently radar_gastos;
  refresh materialized view concurrently radar_gastos_base;
end;
$$;
drop materialized view if exists public.gastos_agregados;
