-- Panorama fiscal (SICONFI/Tesouro): União, estados, DF e municípios.
-- Dados agregados de execução orçamentária (RREO). Municípios entram sob demanda.

create table if not exists entes_fiscais (
  cod_ibge      bigint primary key,      -- código IBGE (União=1, estados=2 dígitos, municípios=7)
  ente          text not null,
  esfera        char(1) not null,        -- 'U' União, 'E' estado/DF, 'M' município
  uf            text,
  regiao        text,
  capital       boolean default false,
  populacao     integer,
  cnpj          text,
  atualizado_em timestamptz default now()
);
create index if not exists idx_entes_fiscais_esfera on entes_fiscais (esfera);
create index if not exists idx_entes_fiscais_uf on entes_fiscais (uf);
create index if not exists idx_entes_fiscais_ente on entes_fiscais (ente);

create table if not exists fiscal_resumo (
  cod_ibge      bigint not null references entes_fiscais (cod_ibge) on delete cascade,
  ano           integer not null,
  periodo       integer,                 -- bimestre do RREO (1..6)
  esfera        char(1) not null,
  populacao     integer,
  receita_total numeric,                 -- receitas realizadas até o bimestre
  despesa_total numeric,                 -- despesas liquidadas até o bimestre
  resultado     numeric,                 -- receita_total - despesa_total
  fonte         text default 'SICONFI/RREO',
  atualizado_em timestamptz default now(),
  primary key (cod_ibge, ano)
);
create index if not exists idx_fiscal_resumo_esfera_ano on fiscal_resumo (esfera, ano);

create table if not exists fiscal_funcao (
  cod_ibge      bigint not null references entes_fiscais (cod_ibge) on delete cascade,
  ano           integer not null,
  funcao        text not null,           -- função de governo (Saúde, Educação, ...)
  valor         numeric,                 -- despesa liquidada até o bimestre
  atualizado_em timestamptz default now(),
  primary key (cod_ibge, ano, funcao)
);
create index if not exists idx_fiscal_funcao_ano on fiscal_funcao (ano);
create index if not exists idx_fiscal_funcao_funcao on fiscal_funcao (funcao);

-- Leitura pública (mesmo padrão das demais tabelas do site); escrita só via service_role.
alter table entes_fiscais enable row level security;
alter table fiscal_resumo enable row level security;
alter table fiscal_funcao enable row level security;

drop policy if exists leitura_publica_entes on entes_fiscais;
create policy leitura_publica_entes on entes_fiscais for select using (true);
drop policy if exists leitura_publica_resumo on fiscal_resumo;
create policy leitura_publica_resumo on fiscal_resumo for select using (true);
drop policy if exists leitura_publica_funcao on fiscal_funcao;
create policy leitura_publica_funcao on fiscal_funcao for select using (true);
