-- 19/10/2026: presenca_votacoes passa a cobrir a Assembleia do RS (ALERGS).
-- Antes, para qualquer casa fora Camara/Senado/ALESP o universo vinha vazio e a tela dizia "a fonte
-- nao informa", embora houvesse 683 votacoes e ~28 mil votos da ALERGS no banco.
-- Atencao: o portal da ALERGS so publica votos Sim e Nao (sem abstencao nem ausencia); a tela trata
-- como "votos registrados", nao como presenca (ver soSimNao em servico_api.js).
create or replace function public.presenca_votacoes(p_agente uuid)
returns json
language sql
stable
security definer
set search_path to 'public'
as $function$
  with alvo as (
    select case
      when fonte_api ilike '%camara%' then 'camara'
      when fonte_api ilike '%senado%' then 'senado'
      when fonte_api ilike '%alesp%'  then 'alesp'
      when fonte_api ilike '%alergs%' then 'alergs'
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
       or (alvo.casa = 'alergs' and a.fonte_api ilike '%alergs%')
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
$function$;
