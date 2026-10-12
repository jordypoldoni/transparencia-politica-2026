-- T2b: endurecimento de seguranca do banco 1 (dados publicos)
-- Premissa verificada no codigo: o site e os coletores usam SO a service_role neste banco.
-- Idempotente: pode rodar mais de uma vez.

-- 1) Tabela sem RLS (anon podia ler e escrever)
ALTER TABLE public.indicacoes_executivo ENABLE ROW LEVEL SECURITY;

-- 2) Views passam a respeitar as permissoes de quem consulta
ALTER VIEW public.ranking_gastos_politicos SET (security_invoker = true);
ALTER VIEW public.resumo_coerencia_votos   SET (security_invoker = true);
ALTER VIEW public.vista_comparativa_gastos SET (security_invoker = true);

-- 3) Funcoes: so a service_role executa
REVOKE EXECUTE ON FUNCTION public.refresh_radar_gastos()                 FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.presenca_votacoes(uuid)                FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.resumo_despesas_por_agente(integer,text) FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.refresh_radar_gastos()                 TO service_role;
GRANT  EXECUTE ON FUNCTION public.presenca_votacoes(uuid)                TO service_role;
GRANT  EXECUTE ON FUNCTION public.resumo_despesas_por_agente(integer,text) TO service_role;

-- 4) search_path fixo nas funcoes que ainda nao tinham
ALTER FUNCTION public.refresh_radar_gastos()                   SET search_path = public, pg_temp;
ALTER FUNCTION public.resumo_despesas_por_agente(integer,text) SET search_path = public, pg_temp;

-- ROLLBACK (se algo quebrar):
-- ALTER TABLE public.indicacoes_executivo DISABLE ROW LEVEL SECURITY;
-- ALTER VIEW public.ranking_gastos_politicos RESET (security_invoker);
-- ALTER VIEW public.resumo_coerencia_votos   RESET (security_invoker);
-- ALTER VIEW public.vista_comparativa_gastos RESET (security_invoker);
-- GRANT EXECUTE ON FUNCTION public.refresh_radar_gastos(), public.presenca_votacoes(uuid), public.resumo_despesas_por_agente(integer,text) TO anon, authenticated;
-- ALTER FUNCTION public.refresh_radar_gastos() RESET search_path;
-- ALTER FUNCTION public.resumo_despesas_por_agente(integer,text) RESET search_path;
