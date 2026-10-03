ALTER TABLE public.despesas_parlamentares
  ADD CONSTRAINT despesas_parlamentares_agente_id_fkey
  FOREIGN KEY (agente_id) REFERENCES public.agentes_politicos(id);
CREATE INDEX IF NOT EXISTS idx_despesas_agente ON public.despesas_parlamentares (agente_id);
CREATE INDEX IF NOT EXISTS idx_despesas_ano ON public.despesas_parlamentares (ano);
