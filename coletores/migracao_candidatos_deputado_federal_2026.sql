-- Migração: candidatos_deputado_federal (Eleições 2026)
-- Rodar no SQL Editor do Supabase (mesmo projeto de candidatos_presidenciais).
-- Tabela própria (mesmo padrão de candidatos_presidenciais — não estende agentes_politicos,
-- que é centrada em MANDATO/voto legislativo de quem já foi eleito).
--
-- Diferenças-chave em relação a candidatos_presidenciais:
--   - Deputado Federal é eleito POR ESTADO (coluna `uf`), não tem candidatura nacional.
--   - Não existe "proposta de governo" nesse cargo (só cargos majoritários — Presidente,
--     Governador, Prefeito — são obrigados a apresentar plano de governo na Justiça Eleitoral).
--     Por isso não há proposta_pdf_url aqui.
--   - Tem `reeleicao` (ST_REELEICAO do TSE: candidato já ocupa o cargo e concorre de novo),
--     usado no pedido do Jordy ("todos que tentarão reeleição ou que estão se candidatando").

create table if not exists candidatos_deputado_federal (
  id uuid primary key default gen_random_uuid(),
  ano_eleicao integer not null default 2026,
  uf text not null,                     -- estado onde concorre (ex.: SP, MG...)
  nr_candidato text,                    -- número de urna (ex.: 1234)
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
  reeleicao boolean,                    -- ST_REELEICAO = 'S' → já ocupa o cargo e busca reeleição
  data_nascimento date,
  naturalidade_uf text,
  genero text,
  grau_instrucao text,
  estado_civil text,
  cor_raca text,
  ocupacao text,
  foto_url text,                        -- rehospedada no Supabase Storage (bucket deputados-federais-fotos)
  fonte_api text,                       -- link para a ficha do candidato no DivulgaCandContas
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create index if not exists idx_cand_depfed_ano_uf on candidatos_deputado_federal (ano_eleicao, uf);
create index if not exists idx_cand_depfed_ano_partido on candidatos_deputado_federal (ano_eleicao, partido_sigla);
create index if not exists idx_cand_depfed_ano_reeleicao on candidatos_deputado_federal (ano_eleicao, reeleicao);
create index if not exists idx_cand_depfed_nome on candidatos_deputado_federal (nome_urna);

alter table candidatos_deputado_federal enable row level security;

drop policy if exists "Leitura pública" on candidatos_deputado_federal;
create policy "Leitura pública" on candidatos_deputado_federal
  for select using (true);

-- Escrita só via service_role (a chave usada pelos coletores), que já ignora RLS por padrão.
-- Nenhuma policy de insert/update/delete é necessária para isso.
