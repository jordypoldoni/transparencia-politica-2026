-- BANCO 2 (projeto ywfppacbwipppvgkvrpl): PERFIL DO USUÁRIO. (25/09/2026)
--
-- O banco 2 nasceu em 24/09 para os ~20 mil candidatos a deputado estadual. Em 25/09 eles
-- passaram a ser lidos do TSE na hora, sem banco, e o banco 2 ficou vazio. Pedido do Jordy:
-- ele vira o banco do PERFIL. A regra de 24/09 continua de pé ao contrário: dado de gente fica
-- SOZINHO aqui, e nada público do site entra neste banco.
--
-- O QUE SE GUARDA: o estado, o consentimento (quando e em que versão do texto) e a posição da
-- pessoa em cada pergunta do questionário de afinidade.
-- O QUE NÃO SE GUARDA, DE PROPÓSITO: o texto livre em que a pessoa escreve no que acredita.
-- Opinião política é dado pessoal SENSÍVEL na LGPD (art. 5º, II). O texto só serve para a IA
-- sugerir respostas, que a pessoa confirma; depois disso ele não tem função, e guardar o que não
-- tem função é só risco. Fica guardado o que ela CONFIRMOU, e a origem de cada resposta.
--
-- ACESSO: cada pessoa lê e escreve só o que é dela (RLS com auth.uid()). O site nunca lê isto
-- com a chave de serviço para montar tela; a chave de serviço só serve para apagar conta.
--
-- Rodar no SQL Editor do banco 2 (o conector do Claude não enxerga este projeto).

create table if not exists public.perfis (
  id uuid primary key references auth.users (id) on delete cascade,
  uf char(2) check (uf is null or uf ~ '^[A-Z]{2}$'),
  -- Sem consentimento registrado, a política abaixo não deixa gravar nenhuma resposta.
  consentimento_em timestamptz,
  consentimento_versao text,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create table if not exists public.respostas_afinidade (
  user_id uuid not null references auth.users (id) on delete cascade,
  -- id estável da pergunta, definido em src/lib/perguntasAfinidade.js (ex.: 'dosimetria-8-janeiro').
  pergunta_id text not null check (char_length(pergunta_id) between 3 and 60),
  resposta text not null check (resposta in ('a_favor', 'contra', 'sem_opiniao')),
  -- De onde veio a resposta: marcada direto, sugerida pela IA e confirmada, ou sugerida e corrigida.
  -- A diferença é informação para a própria pessoa, e é o que permite medir se a IA acerta.
  origem text not null check (origem in ('escolha', 'ia_confirmada', 'ia_corrigida')),
  respondido_em timestamptz not null default now(),
  primary key (user_id, pergunta_id)
);

alter table public.perfis enable row level security;
alter table public.respostas_afinidade enable row level security;

-- Visitante sem login não enxerga nada; quem entrou vê só o próprio.
revoke all on public.perfis, public.respostas_afinidade from anon;
grant select, insert, update, delete on public.perfis, public.respostas_afinidade to authenticated;

drop policy if exists "perfil: dono" on public.perfis;
create policy "perfil: dono" on public.perfis
  for all to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

drop policy if exists "respostas: dono le" on public.respostas_afinidade;
create policy "respostas: dono le" on public.respostas_afinidade
  for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "respostas: dono apaga" on public.respostas_afinidade;
create policy "respostas: dono apaga" on public.respostas_afinidade
  for delete to authenticated
  using ((select auth.uid()) = user_id);

-- Gravar e alterar resposta EXIGE consentimento registrado no perfil.
drop policy if exists "respostas: dono grava com consentimento" on public.respostas_afinidade;
create policy "respostas: dono grava com consentimento" on public.respostas_afinidade
  for insert to authenticated
  with check (
    (select auth.uid()) = user_id
    and exists (select 1 from public.perfis p where p.id = (select auth.uid()) and p.consentimento_em is not null)
  );

drop policy if exists "respostas: dono altera com consentimento" on public.respostas_afinidade;
create policy "respostas: dono altera com consentimento" on public.respostas_afinidade
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check (
    (select auth.uid()) = user_id
    and exists (select 1 from public.perfis p where p.id = (select auth.uid()) and p.consentimento_em is not null)
  );

-- atualizado_em sozinho, para ninguém depender de lembrar de mandar.
create or replace function public.tocar_atualizado_em() returns trigger
language plpgsql set search_path = '' as $$
begin new.atualizado_em := now(); return new; end $$;

drop trigger if exists perfis_atualizado_em on public.perfis;
create trigger perfis_atualizado_em before update on public.perfis
  for each row execute function public.tocar_atualizado_em();

-- APAGAR MEUS DADOS: respostas e perfil, num passo só. Roda com a permissão de quem chama
-- (security invoker), então a RLS garante que ninguém apaga o que não é seu. Apagar a CONTA
-- (auth.users) é outro passo, feito no servidor com a chave de serviço.
create or replace function public.apagar_meus_dados() returns void
language sql security invoker set search_path = '' as $$
  delete from public.respostas_afinidade where user_id = (select auth.uid());
  delete from public.perfis where id = (select auth.uid());
$$;
revoke all on function public.apagar_meus_dados() from public, anon;
grant execute on function public.apagar_meus_dados() to authenticated;
