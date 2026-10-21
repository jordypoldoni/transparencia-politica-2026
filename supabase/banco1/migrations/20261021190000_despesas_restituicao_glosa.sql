-- 21/10/2026: restituição e glosa da cota da Câmara (colunas do arquivo anual que não eram guardadas).
-- Aditiva: ADD COLUMN sem valor padrão só altera o catálogo, não reescreve a tabela.
-- Preenchidas só quando maiores que zero (vazio = não houve). Carga única: coletores/carga_restituicao_glosa.js.
alter table despesas_parlamentares
  add column if not exists valor_restituido numeric(12,2),
  add column if not exists data_restituicao date,
  add column if not exists valor_glosa numeric(12,2);
