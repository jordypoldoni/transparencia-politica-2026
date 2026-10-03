DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'agentes_politicos','analises_politicas','categorias_impacto',
    'executivo_licitacoes','gastos_cotas_individuais','legislativo_projetos',
    'pid2026_judiciario','processos_judiciarios','registros_votos','votos_parlamentares'
  ]
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', t);
    EXECUTE format('DROP POLICY IF EXISTS "Leitura publica" ON public.%I;', t);
    EXECUTE format('CREATE POLICY "Leitura publica" ON public.%I FOR SELECT TO anon, authenticated USING (true);', t);
  END LOOP;
END $$;
