-- JÁ APLICADA no banco 1 em 21/10/2026, 13:5x (view gastos_agregados criada, refresh_radar_gastos atualizada).
-- Este arquivo registra no repositório o que está no ar.
--
-- gastos_agregados: gasto da Câmara e do Senado por ano, mês e tipo de despesa (~850 linhas). Alimenta os
-- gráficos de /gastos-parlamentares (por mês, por tipo, passagens aéreas) sem somar 600 mil lançamentos a cada
-- acesso. Assembleias ficam de fora: cada uma tem a sua verba e os tipos não se juntam.
-- Atualizada pela refresh_radar_gastos(), junto da radar_gastos e da radar_gastos_base. Esta view é refeita SEM
-- "concurrently" (é pequena, o bloqueio dura menos de um segundo) porque o índice único usa coalesce.
-- ATENÇÃO: manter o statement_timeout de 300s na função (coletores/migracao_refresh_radar_timeout.sql).
-- Desfazer: supabase/banco1/desfazer/20261021140000_gastos_agregados_DESFAZER.sql

create materialized view if not exists public.gastos_agregados as
select casa_legislativa as casa, ano, mes,
       coalesce(tipo_despesa, 'Sem tipo informado') as tipo_despesa,
       categoria_normalizada,
       sum(valor_liquido) as total,
       count(*) as n_lancamentos,
       count(distinct agente_id) as n_parlamentares
  from despesas_parlamentares
 where casa_legislativa in ('Câmara', 'Senado') and mes is not null
 group by casa_legislativa, ano, mes, coalesce(tipo_despesa, 'Sem tipo informado'), categoria_normalizada;
create unique index if not exists idx_gastos_agregados_chave on public.gastos_agregados (casa, ano, mes, tipo_despesa, coalesce(categoria_normalizada, ''));
grant select on public.gastos_agregados to anon, authenticated, service_role;

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
  refresh materialized view gastos_agregados;
end;
$$;
