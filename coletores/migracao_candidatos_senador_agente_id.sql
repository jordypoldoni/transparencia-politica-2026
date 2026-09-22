-- 22/09/2026 — liga o candidato a Senador 2026 a quem tem ou teve mandato no Congresso.
-- APLICADA NO BANCO EM 22/09/2026. Rodar de novo depois de recoletar os candidatos.
--
-- Mesmo método dos deputados (nome de urna sem acento + UF), casando contra deputados federais em
-- exercício E senadores (em exercício ou não). Medido antes de aplicar: 55 candidatos ligados,
-- 23 senadores buscando reeleição, 30 deputados federais tentando o Senado, 3 ex-senadores.
--
-- ATENÇÃO À GRAFIA: no banco o cargo é "Senador(a)", não "Senador". A primeira medição filtrou por
-- "Senador" e casou zero senadores, o que era impossível num ano que renova 2/3 do Senado.
--
-- Uma ambiguidade, já conhecida (item "mesma pessoa, dois perfis" de 19/09): Eduardo Velloso (AC)
-- tem perfil de deputado e de ex-senador. O desempate liga ao mandato EM EXERCÍCIO.
with norm as (select 'ÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇÑáàâãäéèêëíìîïóòôõöúùûüçñ' de, 'AAAAAEEEEIIIIOOOOOUUUUCNAAAAAEEEEIIIIOOOOOUUUUCN' para),
ag as (
  select a.id, a.uf_sede, a.cargo_atual, a.em_exercicio, upper(translate(a.nome_urna, n.de, n.para)) chave
  from agentes_politicos a, norm n
  where (a.cargo_atual = 'Deputado Federal' and a.em_exercicio is not false) or a.cargo_atual ilike 'senador%'
),
cand as (select c.id, c.uf, upper(translate(c.nome_urna, n.de, n.para)) chave from candidatos_senador c, norm n),
escolhido as (
  select distinct on (cand.id) cand.id cid, ag.id aid, ag.cargo_atual, ag.em_exercicio
  from cand join ag on ag.chave = cand.chave and ag.uf_sede = cand.uf
  order by cand.id, (ag.em_exercicio is not false and ag.cargo_atual = 'Deputado Federal') or ag.em_exercicio is true desc
)
update candidatos_senador c
   set agente_id = e.aid,
       reeleicao = (e.cargo_atual ilike 'senador%' and e.em_exercicio is true)
  from escolhido e
 where e.cid = c.id;

update candidatos_senador set reeleicao = false where agente_id is null;
