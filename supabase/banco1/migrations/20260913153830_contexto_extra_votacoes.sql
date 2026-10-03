alter table votacoes add column if not exists contexto_extra text;

comment on column votacoes.contexto_extra is
  'Camada mais longa, revelada pelo botao "quero entender melhor". Gerada no MESMO lote offline que explicacao_cidada: a pergunta e sempre a mesma, entao a resposta e sempre a mesma e nao precisa de IA em runtime.';
