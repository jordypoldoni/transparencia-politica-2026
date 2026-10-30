-- 24/10/2026: fixa o search_path da função aplicar_restituicao_glosa (alerta de segurança do Supabase: search_path mutável).
-- Com search_path vazio todos os nomes ficam qualificados (public.despesas_parlamentares). Já aplicada no banco 1.
alter function public.aplicar_restituicao_glosa(int, jsonb) set search_path = '';
