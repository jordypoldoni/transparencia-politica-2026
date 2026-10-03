alter table votacoes add column if not exists explicacao_cidada     text;
alter table votacoes add column if not exists explicacao_gerada_em  timestamptz;
alter table votacoes add column if not exists explicacao_modelo     text;

comment on column votacoes.explicacao_cidada is
  'Uma frase em portugues comum sobre O QUE O TEXTO FAZ. Gerada por IA offline em lote. Nunca opina sobre merito, motivo ou impacto.';

create index if not exists idx_votacoes_sem_explicacao
  on votacoes (data_voto desc)
  where explicacao_cidada is null;
