-- Migracao: liga o candidato a Deputado Federal 2026 ao parlamentar que ja tem mandato.
-- Aplicada em 07/09/2026 no projeto fedxytdorrecllugnicu (via conector do Supabase).
--
-- POR QUE ESTE CRUZAMENTO EXISTE
-- O plano original era usar ST_REELEICAO do TSE. Ao inspecionar o CSV real de 2026
-- (coletores/diag_tse_campos.js), descobrimos duas coisas:
--   1. A coluna ST_REELEICAO NAO EXISTE mais no layout de 2026 (o arquivo tem 50 colunas).
--   2. DS_SITUACAO_CANDIDATURA existe, mas vem "#NE" com codigo -3 em todos os candidatos,
--      porque as candidaturas ainda nao foram julgadas pela Justica Eleitoral.
-- Ou seja: os campos estao nulos porque a FONTE nao publica, nao por erro do coletor.
-- Logo, "quem busca reeleicao" so pode sair do nosso proprio banco, casando o candidato
-- com quem ja exerce mandato.
--
-- QUALIDADE DO CASAMENTO (medido antes de aplicar, em 07/09/2026)
--   514 deputados federais em exercicio · 380 casaram por nome de urna normalizado + UF
--   ZERO ambiguidade: nenhum nome+UF casa com dois candidatos diferentes
--   380 candidatos ligados / 380 deputados distintos, ou seja, 1 para 1
-- Os 134 restantes nao concorrem, concorrem a outro cargo (no Brasil ninguem disputa dois
-- cargos na mesma eleicao) ou usam nome de urna diferente do usado na Camara.

alter table candidatos_deputado_federal
  add column if not exists agente_id uuid references agentes_politicos(id) on delete set null;

create index if not exists idx_cand_depfed_agente on candidatos_deputado_federal (agente_id);

comment on column candidatos_deputado_federal.agente_id is
  'Parlamentar em exercicio que e a mesma pessoa deste candidato (casado por nome de urna sem acento + UF). Nulo = nao tem mandato hoje, ou concorre a outro cargo, ou usa nome de urna diferente.';

-- Preenchimento. Idempotente: rodar de novo apenas reconfirma os mesmos vinculos.
-- O translate() faz o papel do unaccent (a extensao nao esta instalada no projeto).
with norm as (
  select 'ÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇÑáàâãäéèêëíìîïóòôõöúùûüçñ' as de,
         'AAAAAEEEEIIIIOOOOOUUUUCNAAAAAEEEEIIIIOOOOOUUUUCN' as para
),
ag as (
  select a.id, a.uf_sede, upper(translate(a.nome_urna, n.de, n.para)) chave
    from agentes_politicos a, norm n
   where a.cargo_atual = 'Deputado Federal'
),
cand as (
  select c.id, c.uf, upper(translate(c.nome_urna, n.de, n.para)) chave
    from candidatos_deputado_federal c, norm n
)
update candidatos_deputado_federal c
   set agente_id = ag.id
  from cand, ag
 where cand.id = c.id
   and ag.chave = cand.chave
   and ag.uf_sede = cand.uf;

-- Conferencia esperada: com_mandato = deputados_distintos (1 para 1, sem duplicidade).
-- select count(*) total, count(agente_id) com_mandato, count(distinct agente_id) deputados_distintos
--   from candidatos_deputado_federal;
