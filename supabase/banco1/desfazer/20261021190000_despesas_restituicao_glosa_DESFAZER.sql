-- DESFAZ 20261021190000_despesas_restituicao_glosa.sql. Apaga também os valores já carregados
-- (uma nova carga a partir do arquivo da Câmara os recupera). A ferramenta Supabase cancela DROP:
-- rodar no editor SQL do painel.
alter table despesas_parlamentares
  drop column if exists valor_restituido,
  drop column if exists data_restituicao,
  drop column if exists valor_glosa;
