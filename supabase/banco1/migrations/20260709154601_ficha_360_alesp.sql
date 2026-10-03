alter table agentes_politicos
  add column if not exists biografia_texto text,
  add column if not exists areas_atuacao jsonb default '[]'::jsonb,
  add column if not exists base_eleitoral text,
  add column if not exists filiacoes jsonb default '[]'::jsonb;
