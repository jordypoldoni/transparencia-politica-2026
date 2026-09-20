-- 20/09/2026 — a ficha do TSE passa a valer para deputado federal, não só para os 14 presidenciáveis.
-- APLICADA NO BANCO EM 20/09/2026. O arquivo existe para o esquema ficar versionado junto do código.
--
-- As colunas espelham o que traduzir() já produz em candidatos_presidenciais, menos duas:
--   `vices`, porque deputado federal não tem vice;
--   `uf_nascimento`, porque nesta tabela o mesmo dado já existe como naturalidade_uf, e duas
--   colunas com o mesmo conteúdo saem de sincronia na primeira recoleta.
alter table candidatos_deputado_federal
  add column if not exists situacao_tse text,
  add column if not exists apto_tse boolean,
  add column if not exists consta_da_urna text,
  add column if not exists totalizacao_tse text,
  add column if not exists numero_processo text,
  add column if not exists motivos jsonb,
  add column if not exists substituido boolean,
  add column if not exists substituto_sq text,
  add column if not exists substituto_nome text,
  add column if not exists municipio_nascimento text,
  add column if not exists nacionalidade text,
  add column if not exists documentos jsonb,
  add column if not exists redes jsonb,
  add column if not exists divulga_bens boolean,
  add column if not exists total_de_bens numeric,
  add column if not exists bens jsonb,
  add column if not exists ficha_coletada_em timestamptz,
  add column if not exists ficha_fonte_url text;

-- Retomada: são 7.703 fichas a 1,6 por segundo, o que não cabe numa execução só. O coletor
-- busca sempre quem está sem marca, e este índice evita varrer a tabela inteira a cada lote.
create index if not exists idx_cand_dep_fed_ficha_pendente
  on candidatos_deputado_federal (uf) where ficha_coletada_em is null;
