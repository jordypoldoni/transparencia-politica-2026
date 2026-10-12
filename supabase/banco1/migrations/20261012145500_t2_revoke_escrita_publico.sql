-- T2 item 1 (2026-10-12): tira a permissão de ESCRITA do anon e do authenticated em todas as tabelas do schema public.
-- Motivo: so o RLS barrava escrita; o TRUNCATE nem e coberto por RLS. O site e os coletores usam service_role (nao afetado).
-- Resultado: anon e authenticated ficam so com SELECT. Para desfazer: supabase/banco1/desfazer/20261012145500_t2_revoke_escrita_publico_DESFAZER.sql

revoke insert, update, delete, truncate, references, trigger on all tables in schema public from anon, authenticated;

alter default privileges for role postgres in schema public
  revoke insert, update, delete, truncate, references, trigger on tables from anon, authenticated;

-- Tabelas criadas pelo papel interno supabase_admin: o postgres normalmente nao tem permissao de alterar; ignora se falhar.
do $$ begin
  execute 'alter default privileges for role supabase_admin in schema public revoke insert, update, delete, truncate, references, trigger on tables from anon, authenticated';
exception when insufficient_privilege then
  raise notice 'sem permissao para alterar os privilegios padrao do supabase_admin (ignorado)';
end $$;

-- PG17: privilegio MAINTAIN (VACUUM, ANALYZE, REINDEX, CLUSTER, REFRESH MATERIALIZED VIEW, LOCK).
revoke maintain on all tables in schema public from anon, authenticated;
alter default privileges for role postgres in schema public revoke maintain on tables from anon, authenticated;
