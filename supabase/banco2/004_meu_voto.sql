-- MEU VOTO (27/09/2026). Em quem a pessoa pretende votar em cada cargo, marcado na cédula e nas
-- fichas (src/lib/meuVoto.js). Preferência política declarada: dado SENSÍVEL (LGPD art. 11).
-- Mesma regra dos favoritos: cada um só vê e mexe no que é seu, e gravar exige a autorização na
-- versão que cita o voto (2026-09-27). Rodar no SQL Editor do banco 2.

create table if not exists public.meu_voto (
  user_id uuid not null references auth.users (id) on delete cascade,
  cargo text not null check (cargo in ('deputado-federal', 'deputado-estadual', 'senador', 'governador', 'presidente')),
  -- Endereço da ficha do candidato no site (ex.: /candidato-senador/fulano-123).
  chave text not null check (char_length(chave) between 2 and 200),
  uf char(2) check (uf is null or uf ~ '^[A-Z]{2}$'),
  rotulo text not null check (char_length(rotulo) between 1 and 120),
  detalhe text check (detalhe is null or char_length(detalhe) <= 120),
  escolhido_em timestamptz not null default now(),
  primary key (user_id, cargo, chave)
);

alter table public.meu_voto enable row level security;
revoke all on public.meu_voto from anon;
-- Sem UPDATE de propósito: o site grava com ON CONFLICT DO NOTHING e troca apagando e inserindo.
grant select, insert, delete on public.meu_voto to authenticated;

drop policy if exists "meu_voto: dono le" on public.meu_voto;
create policy "meu_voto: dono le" on public.meu_voto
  for select to authenticated using ((select auth.uid()) = user_id);

drop policy if exists "meu_voto: dono apaga" on public.meu_voto;
create policy "meu_voto: dono apaga" on public.meu_voto
  for delete to authenticated using ((select auth.uid()) = user_id);

drop policy if exists "meu_voto: dono grava com consentimento" on public.meu_voto;
create policy "meu_voto: dono grava com consentimento" on public.meu_voto
  for insert to authenticated
  with check (
    (select auth.uid()) = user_id
    and exists (
      select 1 from public.perfis p
      where p.id = (select auth.uid())
        and p.consentimento_em is not null
        and p.consentimento_versao >= '2026-09-27'
    )
  );
