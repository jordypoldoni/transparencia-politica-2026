-- 21/10/2026: corrige radar_gastos_base (mesmo bug de meses_em_exercicio: mes sem periodo de exercicio gerava
-- linha com e.* nulo e GREATEST ignora NULL, entao o mes contava como inteiro). Agora so soma dias quando
-- existe periodo (e.id nao nulo). Troca por RENAME (DROP e cancelado pela ferramenta): a view antiga fica como
-- radar_gastos_base_antiga ate conferirmos; depois pode ser removida.
-- Desfazer: supabase/banco1/desfazer/20261021201000_corrige_radar_gastos_base_DESFAZER.sql
create materialized view public.radar_gastos_base_nova as
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
                 coalesce(sum(case when e.id is not null then greatest(0, least(coalesce(e.data_fim, current_date), c.fim) - greatest(e.data_inicio, c.ini) + 1) end), 0))::int as dias
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

create unique index idx_radar_gastos_base_nova_id_ano on public.radar_gastos_base_nova using btree (id, ano);
grant select on public.radar_gastos_base_nova to anon, authenticated, service_role;
alter materialized view public.radar_gastos_base rename to radar_gastos_base_antiga;
alter index public.idx_radar_gastos_base_id_ano rename to idx_radar_gastos_base_antiga_id_ano;
alter materialized view public.radar_gastos_base_nova rename to radar_gastos_base;
alter index public.idx_radar_gastos_base_nova_id_ano rename to idx_radar_gastos_base_id_ano;
