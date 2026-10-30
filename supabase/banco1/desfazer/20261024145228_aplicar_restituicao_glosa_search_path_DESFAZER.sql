-- DESFAZ 20261024145228_aplicar_restituicao_glosa_search_path.sql.
alter function public.aplicar_restituicao_glosa(int, jsonb) reset search_path;
