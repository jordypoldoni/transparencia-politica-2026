-- I1 / D-031: tramitacao dos pedidos de CPI da Camara (movimentacoes da API de Dados Abertos).
-- Dado publico e pequeno (~420 linhas, ~130 KB). Leitura so pelo servidor do site (service_role);
-- anon e authenticated NAO acessam. Aplicada em 19/10/2026 pelo conector (pedido explicito do Jordy).
CREATE TABLE IF NOT EXISTS public.pedidos_cpi_tramitacoes (
  pedido_id   bigint      NOT NULL REFERENCES public.pedidos_cpi_camara(id) ON DELETE CASCADE,
  sequencia   integer     NOT NULL,
  data_hora   timestamp   NOT NULL,
  sigla_orgao text,
  tipo        text,
  cod_tipo    text,
  despacho    text,
  url         text,
  coletado_em timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (pedido_id, sequencia)
);

ALTER TABLE public.pedidos_cpi_tramitacoes ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.pedidos_cpi_tramitacoes FROM PUBLIC, anon, authenticated;
GRANT  ALL ON TABLE public.pedidos_cpi_tramitacoes TO service_role;
