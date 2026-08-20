-- Migração: candidatos_presidenciais (Eleições 2026)
-- Rodar no SQL Editor do Supabase (projeto fedxytdorrecllugnicu).
-- Tabela própria (não estende agentes_politicos, que é centrada em mandato/voto legislativo).

create table if not exists candidatos_presidenciais (
  id uuid primary key default gen_random_uuid(),
  ano_eleicao integer not null default 2026,
  cargo text not null check (cargo in ('Presidente', 'Vice-Presidente')),
  nr_candidato text,                    -- número de urna da chapa (ex.: 13, 22...)
  sq_candidato text not null unique,    -- id sequencial oficial do TSE (chave de upsert)
  id_externo_api text,                  -- espelha sq_candidato (padrão usado em agentes_politicos)
  nome_urna text not null,
  nome_completo text,
  slug text unique,
  partido_sigla text,
  partido_numero text,
  partido_nome text,
  coligacao_nome text,
  coligacao_composicao text,            -- lista de partidos da coligação/federação (texto cru do TSE)
  situacao_candidatura text,            -- ex.: "DEFERIDO", "AGUARDANDO JULGAMENTO"
  situacao_detalhe text,
  data_nascimento date,
  naturalidade_uf text,
  genero text,
  grau_instrucao text,
  estado_civil text,
  cor_raca text,
  ocupacao text,
  foto_url text,                        -- rehospedada no Supabase Storage (bucket presidenciaveis-fotos)
  proposta_pdf_url text,                -- rehospedada no Supabase Storage (bucket presidenciaveis-propostas)
  proposta_coletada_em timestamptz,
  fonte_api text,                       -- link para a ficha do candidato no DivulgaCandContas
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create index if not exists idx_candidatos_pres_ano_cargo on candidatos_presidenciais (ano_eleicao, cargo);
create index if not exists idx_candidatos_pres_nr on candidatos_presidenciais (nr_candidato);

alter table candidatos_presidenciais enable row level security;

drop policy if exists "Leitura pública" on candidatos_presidenciais;
create policy "Leitura pública" on candidatos_presidenciais
  for select using (true);

-- Escrita só via service_role (a chave usada pelos coletores), que já ignora RLS por padrão.
-- Nenhuma policy de insert/update/delete é necessária para isso.
