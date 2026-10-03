alter table agentes_politicos
  add column if not exists sexo text,
  add column if not exists contato jsonb,
  add column if not exists ocupacoes jsonb default '[]'::jsonb,
  add column if not exists cargos_anteriores jsonb default '[]'::jsonb,
  add column if not exists mandato jsonb;
