-- T10 / D-036: uma linha por fonte (e escopo) com QUANDO coletamos e ATE QUANDO a fonte ja publicou.
-- O site le daqui para mostrar "coletado em" e "dados ate" e para a secao "Como atualizamos os dados".
-- Cada coletor grava a propria linha no fim da rodada. Tabela minuscula (dezenas de linhas).
-- Leitura so pelo servidor do site (service_role), mesmo padrao de pedidos_cpi_camara. Idempotente.

CREATE TABLE IF NOT EXISTS public.fonte_status (
  fonte        text        NOT NULL,                 -- ex.: 'gastos_camara', 'votos_alergs'
  escopo       text        NOT NULL DEFAULT '',      -- ex.: 'RS'; vazio = nacional/unico
  coletado_em  timestamptz NOT NULL DEFAULT now(),   -- fim da ultima rodada que gravou com sucesso
  dados_ate    date,                                 -- ultimo dia/mes que a FONTE ja publicou (null = a fonte nao informa)
  linhas       integer,                              -- quantas linhas a rodada gravou (conferencia)
  PRIMARY KEY (fonte, escopo)
);

ALTER TABLE public.fonte_status ENABLE ROW LEVEL SECURITY;   -- sem politica: so service_role le e grava

REVOKE ALL ON TABLE public.fonte_status FROM PUBLIC, anon, authenticated;
GRANT  ALL ON TABLE public.fonte_status TO service_role;
