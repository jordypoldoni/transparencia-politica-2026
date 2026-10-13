-- I1 / D-031: pedidos de CPI da Camara (requerimentos RCP), guardados no banco 1.
-- Motivo: o servidor da Vercel nao conecta em dadosabertos.camara.leg.br ("fetch failed" em 13/10/2026),
-- entao a coleta passa para o GitHub Actions e a pagina /cpis le desta tabela.
-- Dado publico e pequeno (~21 linhas, menos de 50 KB). Leitura so pelo servidor do site (service_role);
-- anon e authenticated NAO acessam. Idempotente: pode rodar mais de uma vez.

CREATE TABLE IF NOT EXISTS public.pedidos_cpi_camara (
  id               bigint      PRIMARY KEY,          -- id da proposicao na Camara
  numero           integer     NOT NULL,
  ano              integer     NOT NULL,
  ementa           text,
  data_apresentacao date,
  situacao         text,
  despacho         text,
  data_situacao    date,
  assinaturas      integer,                          -- null = a fonte nao informou
  primeiro_autor   text,
  inteiro_teor     text,                             -- URL do documento oficial
  ficha            text,                             -- URL da ficha de tramitacao
  coletado_em      timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.pedidos_cpi_camara ENABLE ROW LEVEL SECURITY;   -- sem politica: so service_role le e grava

REVOKE ALL ON TABLE public.pedidos_cpi_camara FROM PUBLIC, anon, authenticated;
GRANT  ALL ON TABLE public.pedidos_cpi_camara TO service_role;

-- Conferencia depois de rodar (esperado: rls = true; anon e authenticated sem nenhuma linha):
-- SELECT relrowsecurity AS rls FROM pg_class WHERE oid = 'public.pedidos_cpi_camara'::regclass;
-- SELECT grantee, privilege_type FROM information_schema.role_table_grants
--   WHERE table_schema = 'public' AND table_name = 'pedidos_cpi_camara' ORDER BY 1, 2;
