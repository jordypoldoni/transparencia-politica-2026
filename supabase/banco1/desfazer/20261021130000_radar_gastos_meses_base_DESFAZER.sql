-- DESFAZ 20261021130000_radar_gastos_meses_base.sql: apaga a view radar_gastos_base e devolve o refresh
-- para a versão que atualizava só a radar_gastos. A radar_gastos nunca foi alterada por essa migração.
create or replace function public.refresh_radar_gastos()
returns void
language plpgsql
security definer
set search_path = public, pg_temp
set statement_timeout = '300s'
as $$
begin
  refresh materialized view concurrently radar_gastos;
end;
$$;
drop materialized view if exists public.radar_gastos_base;
