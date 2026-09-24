-- Candidatos a GOVERNADOR 2026. (24/09/2026)
--
-- Roda no BANCO 1, junto com senador e deputado federal: medimos que um candidato com ficha
-- completa ocupa 6,4 KB, e os ~180 governadores do pais dao 1,2 MB. Cabe com folga, e a
-- cedula do eleitor continua lendo quatro dos cinco cargos de um banco so.
-- Quem vai para o banco 2 e o DEPUTADO ESTADUAL: sao ~20 mil candidatos, uns 128 MB, e o
-- banco 1 tem ~105 MB livres.
--
-- Espelha candidatos_senador, com uma diferenca: o senador leva dois SUPLENTES e o
-- governador leva um VICE. Por isso `vice` e jsonb de objeto, nao de lista.

create table if not exists public.candidatos_governador (
  id                    uuid primary key default gen_random_uuid(),
  ano_eleicao           integer not null,
  uf                    text    not null,
  nr_candidato          text,
  sq_candidato          text    not null unique,
  id_externo_api        text,
  nome_urna             text,
  nome_completo         text,
  slug                  text    unique,
  partido_sigla         text,
  partido_numero        text,
  partido_nome          text,
  coligacao_nome        text,
  coligacao_composicao  text,
  situacao_candidatura  text,
  reeleicao             boolean,
  data_nascimento       date,
  naturalidade_uf       text,
  municipio_nascimento  text,
  nacionalidade         text,
  genero                text,
  grau_instrucao        text,
  estado_civil          text,
  cor_raca              text,
  ocupacao              text,
  foto_url              text,
  fonte_api             text,
  agente_id             uuid references public.agentes_politicos(id) on delete set null,
  vice                  jsonb,
  situacao_tse          text,
  apto_tse              boolean,
  consta_da_urna        text,
  totalizacao_tse       text,
  numero_processo       text,
  motivos               jsonb,
  substituido           boolean,
  substituto_sq         text,
  substituto_nome       text,
  documentos            jsonb,
  redes                 jsonb,
  divulga_bens          boolean,
  total_de_bens         numeric,
  bens                  jsonb,
  eleicoes_anteriores   jsonb,
  ficha_coletada_em     timestamptz,
  ficha_fonte_url       text,
  criado_em             timestamptz default now(),
  atualizado_em         timestamptz default now()
);

-- A cedula do eleitor busca sempre por ano + estado.
create index if not exists idx_cand_gov_ano_uf on public.candidatos_governador (ano_eleicao, uf);
create index if not exists idx_cand_gov_slug   on public.candidatos_governador (slug);

-- Dado publico: qualquer um le, ninguem escreve pela chave publica. A escrita e do coletor,
-- que usa a service_role e passa por cima da RLS.
alter table public.candidatos_governador enable row level security;

drop policy if exists "leitura publica" on public.candidatos_governador;
create policy "leitura publica" on public.candidatos_governador for select using (true);
