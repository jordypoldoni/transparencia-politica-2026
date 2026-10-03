create or replace function presenca_votacoes(p_agente uuid)
returns json
language sql
stable
security definer
set search_path = public
as $$
  with alvo as (
    select case
      when fonte_api ilike '%camara%' then 'camara'
      when fonte_api ilike '%senado%' then 'senado'
      when fonte_api ilike '%alesp%'  then 'alesp'
      else 'outro' end as casa
    from agentes_politicos where id = p_agente
  ),
  universo as (
    select count(distinct v.votacao_id_externa) as total
    from votos_parlamentares v
    join agentes_politicos a on a.id = v.agente_id, alvo
    where (alvo.casa = 'camara' and a.fonte_api ilike '%camara%')
       or (alvo.casa = 'senado' and a.fonte_api ilike '%senado%')
       or (alvo.casa = 'alesp'  and a.fonte_api ilike '%alesp%')
  ),
  meu as (
    select count(distinct votacao_id_externa) as compareceu
    from votos_parlamentares
    where agente_id = p_agente
      and lower(voto_tipo) in ('sim','não','nao','abstenção','abstencao','obstrução','obstrucao')
  )
  select json_build_object(
    'casa', (select casa from alvo),
    'total', coalesce((select total from universo), 0),
    'compareceu', coalesce((select compareceu from meu), 0)
  );
$$;
grant execute on function presenca_votacoes(uuid) to anon, authenticated, service_role;
