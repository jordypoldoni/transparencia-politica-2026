-- Senado: 4 lancamentos com data de emissao no futuro (ano errado na fonte). Limpa a data;
-- a nota segue contada no mes de referencia (colunas ano/mes). (17/10/2026)
update despesas_parlamentares
   set data_emissao = null
 where casa_legislativa = 'Senado' and data_emissao > current_date;
