CREATE TABLE IF NOT EXISTS public.votacoes (
  votacao_id_externa text PRIMARY KEY,
  descricao text,
  aprovacao integer,
  data_voto timestamptz,
  proposicao_id text,
  proposicao_titulo text,
  ementa text,
  descricao_tipo text,
  keywords text,
  autor_nome text,
  autor_tipo text,
  data_insercao timestamptz DEFAULT now()
);
ALTER TABLE public.votacoes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Leitura publica" ON public.votacoes;
CREATE POLICY "Leitura publica" ON public.votacoes FOR SELECT TO anon, authenticated USING (true);
