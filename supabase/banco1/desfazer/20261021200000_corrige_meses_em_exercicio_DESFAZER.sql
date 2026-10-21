-- Volta a versao com o bug (so use se a correcao causar problema pior).
create or replace function public.meses_em_exercicio(p_agente uuid, p_ano integer)
returns table(mes integer, dias integer, conta boolean)
language sql stable set search_path to 'public'
as $function$
  with m as (
    select g as mes, make_date(p_ano, g, 1) as ini,
           (make_date(p_ano, g, 1) + interval '1 month' - interval '1 day')::date as fim
    from generate_series(1,12) g
  ),
  d as (
    select m.mes,
      coalesce(sum(greatest(0,
        least(coalesce(e.data_fim, current_date), m.fim) - greatest(e.data_inicio, m.ini) + 1)), 0)::int as dias
    from m
    left join public.exercicio_parlamentar e
      on e.agente_id = p_agente and e.situacao = 'Exercício'
     and e.data_inicio <= m.fim and coalesce(e.data_fim, current_date) >= m.ini
    group by m.mes
  )
  select mes, dias, dias >= 15 as conta from d order by mes;
$function$;
