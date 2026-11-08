-- gastos_assembleia_totais: total oficial de gasto das Assembleias Legislativas por UF, ano e mês.
-- Guarda só o total somado e a divisão por categoria (sem lançamento por lançamento), para caber no banco 1.
-- Cada Assembleia tem a sua verba (cota, verba indenizatória, VIAP...), por isso o texto em "o_que_inclui" é obrigatório:
-- os totais NÃO são comparáveis entre estados. Alimenta a aba "Todas as casas" de /gastos-parlamentares.
-- Desfazer: supabase/banco1/desfazer/20261108150000_gastos_assembleia_totais_DESFAZER.sql
create table if not exists public.gastos_assembleia_totais (
  uf               text    not null check (uf ~ '^[A-Z]{2}$'),
  ano              int     not null,
  mes              int     not null check (mes between 1 and 12),
  total            numeric(16,2) not null,
  n_lancamentos    int,
  n_deputados      int,
  por_categoria    jsonb,
  o_que_inclui     text    not null,
  fonte_url        text    not null,
  fonte            text    not null,
  coletado_em      timestamptz not null default now(),
  primary key (uf, ano, mes)
);
alter table public.gastos_assembleia_totais enable row level security;
create policy gastos_assembleia_totais_leitura on public.gastos_assembleia_totais for select using (true);
grant select on public.gastos_assembleia_totais to anon, authenticated, service_role;
grant insert, update, delete on public.gastos_assembleia_totais to service_role;
