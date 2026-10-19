-- Correcao da tabela criada minutos antes (ainda vazia): a API da Camara REPETE o numero de
-- sequencia em movimentacoes diferentes (RCP 2/2023 e 4/2023), entao a chave passa a ser a
-- posicao na lista da fonte (`ordem`). `sequencia` fica como dado informativo.
ALTER TABLE public.pedidos_cpi_tramitacoes DROP CONSTRAINT pedidos_cpi_tramitacoes_pkey;
ALTER TABLE public.pedidos_cpi_tramitacoes ADD COLUMN ordem integer NOT NULL;
ALTER TABLE public.pedidos_cpi_tramitacoes ALTER COLUMN sequencia DROP NOT NULL;
ALTER TABLE public.pedidos_cpi_tramitacoes ADD PRIMARY KEY (pedido_id, ordem);
