create table if not exists indicacoes_executivo (
  id                bigserial primary key,
  codigo_materia    bigint not null unique,
  identificacao     text not null,
  sigla             text,
  numero            text,
  ano               int not null,
  data_mensagem     date,
  autor             text,
  ementa            text not null,
  nome_indicado     text,
  cargo             text,
  orgao             text,
  tipo_orgao        text,
  votada            boolean not null default false,
  data_votacao      date,
  resultado         text,
  votos_sim         int,
  votos_nao         int,
  votos_abstencao   int,
  votacao_secreta   boolean,
  codigo_sessao     bigint,
  descricao_votacao text,
  presencas         jsonb not null default '[]'::jsonb,
  total_presentes   int,
  total_ausentes    int,
  url_materia       text,
  url_fonte         text,
  coletado_em       timestamptz not null default now()
);

comment on table indicacoes_executivo is
  'Indicacoes do presidente submetidas ao Senado (MSF) e o resultado da votacao. Voto individual e secreto por lei: guardamos presenca, nunca direcao.';
comment on column indicacoes_executivo.presencas is
  'Quem estava na sessao e em que condicao. NAO contem como cada senador votou - a votacao e secreta.';
comment on column indicacoes_executivo.nome_indicado is
  'Extraido da ementa por regra fixa, sem IA. null quando o padrao nao casa.';

create index if not exists idx_indicacoes_ano        on indicacoes_executivo (ano desc, data_mensagem desc);
create index if not exists idx_indicacoes_votada     on indicacoes_executivo (votada, data_votacao desc);
create index if not exists idx_indicacoes_tipo_orgao on indicacoes_executivo (tipo_orgao);
