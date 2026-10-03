create table if not exists public.deputados_estaduais_eleitos (
  id               uuid primary key default gen_random_uuid(),
  ano_eleicao      integer not null,
  cargo            text    not null,
  uf               text    not null,
  sq_candidato     text    not null unique,
  nr_candidato     text,
  nome_urna        text    not null,
  nome_completo    text,
  slug             text    unique,
  partido_sigla    text,
  coligacao_nome   text,
  totalizacao_tse  text,
  foto_url         text,
  agente_id        uuid references public.agentes_politicos(id) on delete set null,
  coletado_em      timestamptz default now()
);
create index if not exists idx_dep_est_eleitos_ano_uf on public.deputados_estaduais_eleitos (ano_eleicao, uf);
create index if not exists idx_dep_est_eleitos_agente on public.deputados_estaduais_eleitos (agente_id);
alter table public.deputados_estaduais_eleitos enable row level security;
drop policy if exists "leitura publica" on public.deputados_estaduais_eleitos;
create policy "leitura publica" on public.deputados_estaduais_eleitos for select using (true);
