-- Recriar a materialized view zerou os privilegios. Os dados sao os mesmos ja publicos
-- no ranking do site (leitura publica, igual as tabelas com policy "Leitura publica").
grant select on public.radar_gastos to anon, authenticated, service_role;
