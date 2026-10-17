-- Desfaz 20261017160000_fonte_status.sql (apaga a tabela; so guarda datas de coleta, que os coletores recriam).
-- Nao faz parte do historico de migracoes.
DROP TABLE IF EXISTS public.fonte_status;
