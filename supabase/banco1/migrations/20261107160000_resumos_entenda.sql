-- Aplicada em 07/11/2026 pelo MCP (nome: resumos_entenda). Resumo visual "Entenda em 1 minuto" por proposicao.
create table if not exists public.resumos_entenda (
  chave          text primary key,
  casa           text not null check (casa in ('camara','senado','rs')),
  proposicao_id  text not null,
  conteudo       jsonb not null,
  gerado_por     text not null,
  atualizado_em  timestamptz not null default now()
);
comment on table public.resumos_entenda is 'Resumo visual "Entenda em 1 minuto" de uma proposicao, escrito a partir do texto oficial e conferido nas fontes. Uma linha por proposicao (varias votacoes dividem a mesma). chave = casa:proposicao_id.';
alter table public.resumos_entenda enable row level security;
create policy leitura_publica_resumos_entenda on public.resumos_entenda for select to anon, authenticated using (true);
revoke insert, update, delete, truncate on public.resumos_entenda from anon, authenticated;
