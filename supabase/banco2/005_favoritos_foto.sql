-- FOTO NOS FAVORITOS (01/10/2026). Os favoritos que DESCIAM do perfil para outro aparelho chegavam
-- sem foto (a tabela não tinha a coluna), e a lista "Seus favoritos" mostrava só as iniciais.
-- Agora a foto (endereço público da imagem, não é dado pessoal de quem favoritou) vai junto.
-- O UPDATE é liberado SÓ na coluna foto: serve para completar a foto dos favoritos antigos a
-- partir do aparelho que ainda tem a foto guardada. Rodar no SQL Editor do banco 2.

alter table public.favoritos add column if not exists foto text
  check (foto is null or (foto ~ '^https://' and char_length(foto) <= 400));

grant update (foto) on public.favoritos to authenticated;

drop policy if exists "favoritos: dono completa a foto" on public.favoritos;
create policy "favoritos: dono completa a foto" on public.favoritos
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check (
    (select auth.uid()) = user_id
    and exists (
      select 1 from public.perfis p
      where p.id = (select auth.uid())
        and p.consentimento_em is not null
        and p.consentimento_versao >= '2026-09-26'
    )
  );
