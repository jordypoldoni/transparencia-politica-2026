-- 21/10/2026: períodos de exercício dos parlamentares (base do ranking de verba justo, item 6).
-- JÁ APLICADA no banco 1 pelo conector do Supabase em 21/10/2026, 12:40 (migração "exercicio_parlamentar").
-- Este arquivo só registra no repositório o que está no ar.
--
-- exercicio_parlamentar: uma linha por intervalo em que o parlamentar esteve numa situação
-- (Exercício, Licença, Fim de mandato...). data_fim vazia = ainda vale. Preenchida por
-- coletores/coletor_exercicio.js (Câmara: /deputados/{id}/historico; Senado: /senador/{cod}/mandatos).
-- meses_em_exercicio(agente, ano): o mês conta se houve exercício em 15 dias ou mais (decisão do Jordy, 21/10).
-- Desfazer: supabase/banco1/desfazer/20261021123500_exercicio_parlamentar_DESFAZER.sql

create table if not exists public.exercicio_parlamentar (
  id bigint generated always as identity primary key,
  agente_id uuid not null references public.agentes_politicos(id) on delete cascade,
  casa text not null check (casa in ('Câmara','Senado')),
  data_inicio date not null,
  data_fim date,
  situacao text not null,
  condicao text,
  motivo text,
  coletado_em timestamptz not null default now(),
  unique (agente_id, data_inicio, situacao)
);
create index if not exists exercicio_parlamentar_agente_idx on public.exercicio_parlamentar (agente_id);
alter table public.exercicio_parlamentar enable row level security;
create policy "Leitura publica" on public.exercicio_parlamentar for select to anon, authenticated using (true);

create or replace function public.meses_em_exercicio(p_agente uuid, p_ano int)
returns table(mes int, dias int, conta boolean)
language sql stable
set search_path = public
as $$
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
$$;
