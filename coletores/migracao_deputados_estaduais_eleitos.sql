-- Deputados ESTADUAIS (e DISTRITAIS, no DF) ELEITOS, lidos do TSE. (29/09/2026)
--
-- Por que existe: o site so tinha cadastro de deputado estadual de RS (ALERGS) e SP (ALESP),
-- porque nao ha fonte nacional de quem esta em exercicio nas 27 Assembleias. O TSE e a unica
-- fonte que cobre os 27 estados pelo mesmo caminho, mas diz quem foi ELEITO, nao quem esta no
-- cargo hoje. Medido no RS em 29/09: 55 eleitos para 55 cadeiras, e 3 diferencas reais contra o
-- cadastro da ALERGS (um eleito que saiu, dois suplentes em exercicio). Por isso a tela diz
-- "eleitos em 2022", nunca "em exercicio", e o partido e o DA ELEICAO.
--
-- Banco 1 (decisao do Jordy, 29/09): ~1.059 linhas, menos de 1 MB, junto do cadastro, dos gastos
-- e dos votos das Assembleias, para ligar eleito e mandato (agente_id) numa consulta so.
--
-- O que NAO entra: titulo de eleitor, CPF e qualquer documento. A lista do TSE traz o titulo;
-- o coletor descarta.

create table if not exists public.deputados_estaduais_eleitos (
  id               uuid primary key default gen_random_uuid(),
  ano_eleicao      integer not null,
  cargo            text    not null,          -- 'Deputado Estadual' ou 'Deputado Distrital' (DF)
  uf               text    not null,
  sq_candidato     text    not null unique,   -- id do candidato no TSE
  nr_candidato     text,
  nome_urna        text    not null,
  nome_completo    text,
  slug             text    unique,
  partido_sigla    text,                      -- partido NA ELEICAO, nao o de hoje
  coligacao_nome   text,
  totalizacao_tse  text,                      -- 'Eleito por QP' ou 'Eleito por média'
  foto_url         text,                      -- endereco da foto no proprio TSE
  agente_id        uuid references public.agentes_politicos(id) on delete set null,
  coletado_em      timestamptz default now()
);

create index if not exists idx_dep_est_eleitos_ano_uf on public.deputados_estaduais_eleitos (ano_eleicao, uf);
create index if not exists idx_dep_est_eleitos_agente on public.deputados_estaduais_eleitos (agente_id);

-- Dado publico: qualquer um le, ninguem escreve pela chave publica. O coletor usa a service_role.
alter table public.deputados_estaduais_eleitos enable row level security;

drop policy if exists "leitura publica" on public.deputados_estaduais_eleitos;
create policy "leitura publica" on public.deputados_estaduais_eleitos for select using (true);
