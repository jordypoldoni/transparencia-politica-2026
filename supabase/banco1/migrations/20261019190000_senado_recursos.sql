-- 19/10/2026: os quatro blocos que o portal do Senado mostra por senador e ano e o Lume nao tinha:
-- cotas (total), gastos NAO inclusos nas cotas (Correios, passagens ATC 2/2023, material...),
-- beneficios (auxilio-moradia, imovel funcional) e pessoal (gabinete e escritorios de apoio).
-- Fonte: API de dados abertos do Senado, /senadores/{codigo}/recursos-utilizados.
-- Uma linha por senador e ano. Gravada so pelo coletor (service role); leitura publica.
create table if not exists public.senado_recursos (
  agente_id uuid not null references public.agentes_politicos(id) on delete cascade,
  ano integer not null,
  cotas_total numeric(14,2),
  nao_inclusos jsonb not null default '[]'::jsonb,
  nao_inclusos_total numeric(14,2),
  beneficios jsonb not null default '[]'::jsonb,
  pessoal jsonb not null default '[]'::jsonb,
  coletado_em timestamptz not null default now(),
  primary key (agente_id, ano)
);
alter table public.senado_recursos enable row level security;
create policy leitura_publica_senado_recursos on public.senado_recursos for select using (true);
grant select on public.senado_recursos to anon, authenticated;
grant all on public.senado_recursos to service_role;
