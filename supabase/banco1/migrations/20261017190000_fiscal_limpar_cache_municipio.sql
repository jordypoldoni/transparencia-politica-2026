-- 17/10/2026: o coletor gravava a despesa do BIMESTRE (coluna "No Bimestre") em vez da acumulada do ano.
-- Corrigido no código (commit 426bd04). A União, os estados e o DF são regravados pelo job fiscal
-- (alvo siconfi). Municípios são buscados sob demanda e a página usa o que já está gravado, então
-- apagamos o único município em cache (Porto Alegre, 4314902) para ele ser buscado de novo, certo.
begin;
delete from fiscal_funcao where cod_ibge = 4314902;
delete from fiscal_resumo where cod_ibge = 4314902;
commit;
