-- JÁ APLICADA no banco 1 em 21/10/2026, 13:05 (view radar_gastos_base criada e refresh_radar_gastos atualizada).
-- Este arquivo registra no repositório o que está no ar.
--
-- 21/10/2026: BASE JUSTA do ranking de verba (item 6), em view materializada PRÓPRIA, sem tocar na radar_gastos.
-- (Plano A era recriar a radar_gastos com 3 colunas novas; a troca com DROP foi cancelada duas vezes pela
-- ferramenta, então ficou o caminho aditivo, que não mexe em nada do que o site lê hoje.)
--
-- radar_gastos_base: uma linha por parlamentar e ano (mesma chave id + ano da radar_gastos; o site junta pelas duas).
--   meses_base            meses do ano que entram na média: em exercício (15 dias ou mais, regra do Jordy de
--                         21/10) E fechados (30 dias depois do fim do mês; em 2025, 98% do valor de um mês
--                         já tinha nota emitida nesse prazo).
--   total_base            soma do gasto nesses meses (sem a categoria 'Outras despesas', como a radar_gastos).
--   total_divulgacao_base parte de total_base na categoria 'Publicidade e Marketing' (divulgação da atividade
--                         parlamentar). Linha separada no cartão, porque candidatos não podem usá-la nos 120 dias
--                         antes da eleição (Câmara: R$ 9,56 mi/mês em jan a mai para R$ 0,44 mi em jun a set de
--                         2026, só nessa categoria). null para quem não tem histórico de exercício.
-- Média justa = total_base / meses_base. O divisor deixa de ser "meses com gasto": quem não gasta num mês em
-- que estava em exercício puxa a média para baixo, como a cota prevê (o saldo pode acumular).
--
-- QUEM NÃO TEM HISTÓRICO DE EXERCÍCIO (Assembleias e raros sem cadastro): meses_base = meses com gasto e
-- total_base = total, ou seja, igual ao que já existe. Decisão do Jordy de 20/10: estaduais ficam como estão.
--
-- Depende de exercicio_parlamentar (20261021123500) e do coletor_exercicio.js. Os cortes "30 dias" e
-- "15 dias" estão escritos aqui; mudar um exige recriar a view.
-- A view usa current_date: refresh_radar_gastos (chamada pelos coletores) a mantém em dia.
-- Desfazer: supabase/banco1/desfazer/20261021130000_radar_gastos_meses_base_DESFAZER.sql

create materialized view public.radar_gastos_base as
with pares as (
    select distinct d.agente_id, d.ano from despesas_parlamentares d
),
cal as (
    select p.agente_id, p.ano, g.m as mes,
           make_date(p.ano, g.m, 1) as ini,
           (make_date(p.ano, g.m, 1) + interval '1 month' - interval '1 day')::date as fim
    from pares p cross join generate_series(1, 12) as g(m)
),
ex as (
    select c.agente_id, c.ano, c.mes, c.fim,
           least(extract(day from c.fim)::int,
                 coalesce(sum(greatest(0, least(coalesce(e.data_fim, current_date), c.fim) - greatest(e.data_inicio, c.ini) + 1)), 0))::int as dias
    from cal c
    left join exercicio_parlamentar e
           on e.agente_id = c.agente_id and e.situacao = 'Exercício'
          and e.data_inicio <= c.fim and coalesce(e.data_fim, current_date) >= c.ini
    group by c.agente_id, c.ano, c.mes, c.fim
),
elegiveis as (
    select agente_id, ano, count(*) filter (where dias >= 15 and fim + 30 <= current_date) as n
    from ex group by agente_id, ano
),
tem as (
    select distinct agente_id from exercicio_parlamentar
)
select d.agente_id as id, d.ano,
    case when t.agente_id is not null then coalesce(el.n, 0) else count(distinct d.mes) end as meses_base,
    case when t.agente_id is not null
         then coalesce(sum(d.valor_liquido) filter (where x.dias >= 15 and x.fim + 30 <= current_date), 0)
         else sum(d.valor_liquido) end as total_base,
    case when t.agente_id is not null
         then coalesce(sum(d.valor_liquido) filter (where x.dias >= 15 and x.fim + 30 <= current_date
                                                     and d.categoria_normalizada = 'Publicidade e Marketing'), 0)
         else null end as total_divulgacao_base
  from despesas_parlamentares d
  left join tem t on t.agente_id = d.agente_id
  left join ex x on x.agente_id = d.agente_id and x.ano = d.ano and x.mes = d.mes
  left join elegiveis el on el.agente_id = d.agente_id and el.ano = d.ano
 where d.categoria_normalizada is distinct from 'Outras despesas'
 group by d.agente_id, d.ano, t.agente_id, el.n;
create unique index idx_radar_gastos_base_id_ano on public.radar_gastos_base using btree (id, ano);
-- Mesmas permissões da radar_gastos no ar em 21/10/2026 (anon e authenticated leem; service_role tudo).
grant select on public.radar_gastos_base to anon, authenticated, service_role;

-- O refresh diário que os coletores já chamam passa a atualizar as duas views.
-- ATENÇÃO: manter o statement_timeout de 300s (coletores/migracao_refresh_radar_timeout.sql). O refresh das duas
-- views leva cerca de 32 s + 25 s e o limite da API é 8 s; sem isso o rpc falha em silêncio (aviso amarelo no Actions).
-- Na primeira versão desta migração o ajuste foi perdido por engano e corrigido no mesmo dia.
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
