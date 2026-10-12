-- DESFAZ 20261012145500_t2_revoke_escrita_publico.sql (devolve a escrita ao anon e ao authenticated).
-- Usar somente se algo do site ou dos coletores quebrar por falta de permissao. Nao e uma migracao: nao entra no historico.

grant insert, update, delete, truncate, references, trigger, maintain on all tables in schema public to anon, authenticated;

alter default privileges for role postgres in schema public
  grant insert, update, delete, truncate, references, trigger, maintain on tables to anon, authenticated;

do $$ begin
  execute 'alter default privileges for role supabase_admin in schema public grant insert, update, delete, truncate, references, trigger, maintain on tables to anon, authenticated';
exception when insufficient_privilege then
  raise notice 'sem permissao para alterar os privilegios padrao do supabase_admin (ignorado)';
end $$;
