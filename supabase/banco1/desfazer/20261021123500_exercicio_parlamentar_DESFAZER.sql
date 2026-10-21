-- DESFAZ 20261021123500_exercicio_parlamentar.sql. Apaga a tabela e a função (e os intervalos coletados).
-- Antes, desfazer 20261021130000_radar_gastos_meses_base.sql se ela já tiver sido aplicada: a view depende da tabela.
drop function if exists public.meses_em_exercicio(uuid, int);
drop table if exists public.exercicio_parlamentar;
