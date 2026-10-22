-- Remove a view materializada radar_gastos_base_antiga (sobra do RENAME de 21/10,
-- migracao 20261021201000). Era a versao com o bug dos meses em exercicio.
-- Conferido em 22/10: 0 views dependentes, 0 funcoes que a citam, 328 kB;
-- a radar_gastos_base nova esta ativa (2.343 linhas).
-- Sem CASCADE de proposito: se algo depender dela, o comando falha e nada e apagado.
drop materialized view if exists public.radar_gastos_base_antiga;
