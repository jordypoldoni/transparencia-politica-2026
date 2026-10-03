-- 20/09/2026 - a ficha do TSE traz `eleicoesAnteriores`, e a traducao ignorava esse campo.
-- Medido na amostra: 5 a 8 eleicoes por candidato, com ano, cargo, local, partido daquela epoca
-- e como terminou (Eleito por QP, Eleito por media, Suplente, Nao eleito). E o que permite
-- mostrar troca de partido, mudanca de cargo e derrotas, sem juizo de valor e com link na fonte.
-- Vai nas DUAS tabelas porque a traducao e a mesma para presidenciaveis e federais.
alter table candidatos_deputado_federal add column if not exists eleicoes_anteriores jsonb;
alter table candidatos_presidenciais   add column if not exists eleicoes_anteriores jsonb;
