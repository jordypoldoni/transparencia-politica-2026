-- Faltava esta na migracao anterior: o componente SituacaoCandidatura le `vices` e eu nao
-- tinha incluido na traducao do coletor. Achado conferindo campo a campo o que a tela
-- consome contra o que o coletor grava - e nao de memoria.
--
-- A fonte agrupa vices por NUMERO DE URNA, nao por chapa: dois presidentes com o mesmo
-- numero recebem a MESMA lista, e sq_CANDIDATO_SUPERIOR vem null. Guardamos a lista e nao
-- afirmamos de quem e cada vice. Verificado em duas fontes independentes em 16/09.
alter table candidatos_presidenciais add column if not exists vices jsonb not null default '[]'::jsonb;

comment on column candidatos_presidenciais.vices is
  'Vices publicados pelo TSE para o NUMERO DE URNA deste candidato, nao para a chapa dele. Quando ha mais de um, a fonte nao diz qual integra qual chapa - e a tela precisa dizer isso.';
