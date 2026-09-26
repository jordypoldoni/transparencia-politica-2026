-- BANCO 2: FAVORITOS (coração nos cartões de parlamentar, candidato e partido). (26/09/2026)
--
-- Favoritar um político ou partido também é preferência política: dado pessoal SENSÍVEL (LGPD,
-- art. 5º, II). Mesma regra das respostas do questionário: sem login fica só no navegador; com
-- login vai para o perfil SÓ com consentimento, e o consentimento tem de ser da versão que cita
-- os favoritos (2026-09-26 em diante). Quem consentiu na versão anterior, que só falava das
-- respostas, precisa aceitar o texto novo antes: é o que a página de privacidade promete.
-- Rodar no SQL Editor do banco 2.

create table if not exists public.favoritos (
  user_id uuid not null references auth.users (id) on delete cascade,
  -- parlamentar: perfil de quem tem mandato; candidato: ficha de candidatura 2026; partido: sigla.
  tipo text not null check (tipo in ('parlamentar', 'candidato', 'partido')),
  -- Endereço da página no site (ex.: /senador/fulano-123) ou a sigla do partido.
  chave text not null check (char_length(chave) between 2 and 200),
  -- Só o que a lista "Seus favoritos" precisa para se desenhar sem consultar o banco 1.
  rotulo text not null check (char_length(rotulo) between 1 and 120),
  detalhe text check (detalhe is null or char_length(detalhe) <= 120),
  criado_em timestamptz not null default now(),
  primary key (user_id, tipo, chave)
);

alter table public.favoritos enable row level security;
revoke all on public.favoritos from anon;
grant select, insert, delete on public.favoritos to authenticated;

drop policy if exists "favoritos: dono le" on public.favoritos;
create policy "favoritos: dono le" on public.favoritos
  for select to authenticated using ((select auth.uid()) = user_id);

drop policy if exists "favoritos: dono apaga" on public.favoritos;
create policy "favoritos: dono apaga" on public.favoritos
  for delete to authenticated using ((select auth.uid()) = user_id);

drop policy if exists "favoritos: dono grava com consentimento novo" on public.favoritos;
create policy "favoritos: dono grava com consentimento novo" on public.favoritos
  for insert to authenticated
  with check (
    (select auth.uid()) = user_id
    and exists (
      select 1 from public.perfis p
      where p.id = (select auth.uid())
        and p.consentimento_em is not null
        and p.consentimento_versao >= '2026-09-26'
    )
  );

-- Apagar meus dados passa a levar os favoritos também.
create or replace function public.apagar_meus_dados() returns void
language sql security invoker set search_path = '' as $$
  delete from public.favoritos where user_id = (select auth.uid());
  delete from public.respostas_afinidade where user_id = (select auth.uid());
  delete from public.perfis where id = (select auth.uid());
$$;
revoke all on function public.apagar_meus_dados() from public, anon;
grant execute on function public.apagar_meus_dados() to authenticated;
