-- 22/09/2026 — Candidatos a SENADOR nas eleições de 2026.
--
-- Mesmo molde de candidatos_deputado_federal, para a página de Eleições tratar os dois cargos
-- do mesmo jeito, com duas diferenças:
--   1. `suplentes`: cada chapa de senador leva 1º e 2º suplente, que assumem se o titular sair.
--      Em 2026 há senador em exercício que chegou lá como suplente, sem receber voto. A ficha do
--      TSE traz os dois no campo `vices`, com nome e número de sequência.
--   2. Tudo vem da FICHA INDIVIDUAL do DivulgaCandContas, não do arquivo em lote: são 318
--      candidatos (medido em 22/09), e a ficha já traz nome completo, nascimento, escolaridade,
--      foto, patrimônio, trajetória e suplentes numa requisição por pessoa.
--
-- `reeleicao` NÃO sai do TSE (o campo não existe no layout de 2026, ver a migração do agente_id
-- dos deputados); sai do casamento com agentes_politicos, e `agente_id` guarda com quem casou.
create table if not exists candidatos_senador (
  id uuid primary key default gen_random_uuid(),
  ano_eleicao int not null,
  uf text not null,
  nr_candidato text,
  sq_candidato text not null unique,
  id_externo_api text,
  nome_urna text,
  nome_completo text,
  slug text unique,
  partido_sigla text,
  partido_numero text,
  partido_nome text,
  coligacao_nome text,
  coligacao_composicao text,
  situacao_candidatura text,
  reeleicao boolean,
  data_nascimento date,
  naturalidade_uf text,
  genero text,
  grau_instrucao text,
  estado_civil text,
  cor_raca text,
  ocupacao text,
  foto_url text,
  fonte_api text default 'divulgacandcontas',
  agente_id uuid references agentes_politicos(id) on delete set null,
  suplentes jsonb,
  -- as mesmas colunas da ficha que os deputados federais ganharam em 20/09
  situacao_tse text,
  apto_tse boolean,
  consta_da_urna text,
  totalizacao_tse text,
  numero_processo text,
  motivos jsonb,
  substituido boolean,
  substituto_sq text,
  substituto_nome text,
  municipio_nascimento text,
  nacionalidade text,
  documentos jsonb,
  redes jsonb,
  divulga_bens boolean,
  total_de_bens numeric,
  bens jsonb,
  eleicoes_anteriores jsonb,
  ficha_coletada_em timestamptz,
  ficha_fonte_url text,
  criado_em timestamptz default now(),
  atualizado_em timestamptz default now()
);

create index if not exists idx_cand_senador_uf on candidatos_senador (uf);
create index if not exists idx_cand_senador_agente on candidatos_senador (agente_id);

-- Leitura pública, escrita só pela chave de serviço: a mesma política de candidatos_deputado_federal.
alter table candidatos_senador enable row level security;
drop policy if exists "Leitura pública" on candidatos_senador;
create policy "Leitura pública" on candidatos_senador for select using (true);
