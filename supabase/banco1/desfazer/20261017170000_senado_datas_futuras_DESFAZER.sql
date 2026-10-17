-- Nao ha desfazer automatico: a data original era invalida (no futuro) e foi descartada de proposito.
-- Para recuperar, rode de novo o coletor_gastos_senado.js com a regra antiga (git revert do commit).
select 'sem desfazer: a data descartada era invalida' as aviso;
