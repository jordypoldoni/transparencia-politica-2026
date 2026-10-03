
-- Função que refresha a view materializada (chamada pelos coletores via rpc)
-- CONCURRENTLY = não bloqueia leituras durante o refresh
CREATE OR REPLACE FUNCTION refresh_radar_gastos()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY radar_gastos;
END;
$$;

-- Apenas service_role pode chamar (os coletores usam service_role key)
REVOKE ALL ON FUNCTION refresh_radar_gastos() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION refresh_radar_gastos() TO service_role;

