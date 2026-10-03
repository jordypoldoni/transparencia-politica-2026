-- 20/09/2026 - a ficha do TSE passa a valer para deputado federal, nao so para os 14 presidenciaveis.
-- As colunas espelham exatamente o que traduzir() ja produz em candidatos_presidenciais, menos
-- `vices` (deputado federal nao tem vice) e menos uf_nascimento, que aqui ja existe como
-- naturalidade_uf: duas colunas com o mesmo dado sairiam de sincronia na primeira recoleta.
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

-- Retomada: o coletor roda 7.703 fichas em lotes e precisa saber onde parou sem varrer tudo.
create index if not exists idx_cand_dep_fed_ficha_pendente
  on candidatos_deputado_federal (uf) where ficha_coletada_em is null;
