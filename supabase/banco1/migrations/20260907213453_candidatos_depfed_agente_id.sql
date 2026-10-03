-- Liga o candidato a Deputado Federal 2026 ao parlamentar que JA tem mandato, quando for a
-- mesma pessoa. E isso que permite a ficha do candidato mostrar gastos, votos e presenca.
--
-- Por que nao usamos o campo do TSE: o arquivo consulta_cand_2026 NAO traz mais ST_REELEICAO
-- (a coluna sumiu do layout de 2026), e DS_SITUACAO_CANDIDATURA vem como sentinela "#NE"
-- porque as candidaturas ainda nao foram julgadas. Conferido no CSV real em 07/09/2026.
-- Entao "busca reeleicao" passa a ser derivado do NOSSO banco: bate o nome de urna
-- normalizado + UF contra agentes_politicos. Medido antes de aplicar: 380 dos 514 deputados
-- federais em exercicio, com ZERO casos ambiguos (nenhum nome+UF casando com 2 candidatos).

alter table candidatos_deputado_federal
  add column if not exists agente_id uuid references agentes_politicos(id) on delete set null;

create index if not exists idx_cand_depfed_agente on candidatos_deputado_federal (agente_id);

comment on column candidatos_deputado_federal.agente_id is
  'Parlamentar em exercicio que e a mesma pessoa deste candidato (casado por nome de urna sem acento + UF). Nulo = nao tem mandato hoje, ou concorre a outro cargo, ou usa nome de urna diferente.';
