-- BANCO 2: AVISOS DE ERRO enviados pelo formulário /avisar-erro. (02/11/2026)
-- Rodado pelo Jordy no SQL Editor do banco 2 em 02/11/2026 (o conector do Claude não alcança o banco 2).
-- Só o servidor do site (chave de serviço) grava e lê. Ninguém acessa pelo navegador.
create table if not exists public.avisos_erro (
  id bigint generated always as identity primary key,
  criado_em timestamptz not null default now(),
  pagina text not null check (char_length(pagina) between 1 and 300),
  descricao text not null check (char_length(descricao) between 10 and 2000),
  email_retorno text check (email_retorno is null or char_length(email_retorno) <= 200),
  status text not null default 'novo' check (status in ('novo','em_analise','corrigido','nao_procede'))
);

alter table public.avisos_erro enable row level security;
revoke all on public.avisos_erro from anon, authenticated;
