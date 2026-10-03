ALTER TABLE public.votos_parlamentares ADD COLUMN IF NOT EXISTS votacao_id_externa text;
ALTER TABLE public.votos_parlamentares ADD COLUMN IF NOT EXISTS descricao_votacao text;
ALTER TABLE public.votos_parlamentares ADD COLUMN IF NOT EXISTS aprovacao integer;
CREATE UNIQUE INDEX IF NOT EXISTS uniq_voto_votacao_agente
  ON public.votos_parlamentares (votacao_id_externa, agente_id);
