-- T2b (17/10/2026): itens 5 e 6 do analisador de seguranca e remocao das 7 tabelas legadas vazias.
-- Desfazer: ../desfazer/20261017180000_t2b_unaccent_radar_legado_DESFAZER.sql
--
-- 5) Extensao unaccent saia do schema public (alerta extension_in_public). Nada no banco a usa
--    (nenhuma funcao, indice, view, gatilho ou valor padrao; conferido em 17/10). SQL futuro que
--    chamar unaccent() deve escrever extensions.unaccent().
-- 6) A materialized view radar_gastos deixa de ser legivel por anon e authenticated. O site le
--    pelo servidor com a chave de servico; o banco 1 nao e acessado pelo navegador.
-- 7) As 7 tabelas legadas tem 0 linhas e nenhum uso no codigo. Tres views sem uso dependem delas e
--    saem antes. votos_parlamentares.projeto_id (vazio nas linhas) perde so a amarracao com
--    legislativo_projetos; a coluna fica.
--
-- Trava: se alguma tabela legada tiver linha, ou projeto_id tiver valor, tudo e desfeito (erro).

begin;

do $$
declare t text; n bigint;
begin
  foreach t in array array['registros_votos','legislativo_projetos','executivo_licitacoes',
                           'gastos_cotas_individuais','analises_politicas','pid2026_judiciario',
                           'processos_judiciarios'] loop
    execute format('select count(*) from public.%I', t) into n;
    if n > 0 then raise exception 'tabela % tem % linhas: abortado, nada foi alterado', t, n; end if;
  end loop;
  select count(*) into n from public.votos_parlamentares where projeto_id is not null;
  if n > 0 then raise exception 'votos_parlamentares.projeto_id tem % valores: abortado', n; end if;
end $$;

-- 5
alter extension unaccent set schema extensions;

-- 6
revoke select on public.radar_gastos from anon, authenticated;

-- 7
drop view if exists public.vista_comparativa_gastos;
drop view if exists public.ranking_gastos_politicos;
drop view if exists public.resumo_coerencia_votos;
drop table if exists public.registros_votos;
alter table public.votos_parlamentares drop constraint if exists votos_parlamentares_projeto_id_fkey;
drop table if exists public.legislativo_projetos;
drop table if exists public.executivo_licitacoes;
drop table if exists public.gastos_cotas_individuais;
drop table if exists public.analises_politicas;
drop table if exists public.pid2026_judiciario;
drop table if exists public.processos_judiciarios;

commit;
