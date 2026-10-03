-- Acrescenta a radar_gastos tres campos que explicam gasto baixo sem opinar:
--   situacao_atual      -> Exercicio / Licenca / Suplencia / Vacancia (estado de HOJE)
--   condicao_eleitoral  -> Titular / Suplente / Efetivado
--   meses_com_gasto     -> quantos meses do ano tem lancamento
-- Motivo: com as duas pontas do ranking no ar, "quem menos usou" precisa distinguir quem
-- gastou pouco de quem esteve pouco tempo em exercicio. Sem isso a lista sugere economia
-- onde pode haver apenas dado faltando.
-- ATENCAO: situacao_atual e o estado ATUAL do cadastro, nao o daquele ano. A tela precisa
-- dizer isso com todas as letras ("situacao atual: Licenca") para nao induzir o leitor a
-- atribuir a anos passados uma condicao de hoje.
-- View materializada nao aceita ALTER para novas colunas: derruba e recria, com os indices.

drop materialized view if exists radar_gastos;

create materialized view radar_gastos as
 select a.id,
    a.slug,
    a.nome_urna,
    a.partido_atual,
    a.uf_sede,
    a.foto_url,
    a.situacao as situacao_atual,
    a.condicao_eleitoral,
        case
            when (a.fonte_api ~~* '%senado%'::text) then 'Senado'::text
            when (a.fonte_api ~~* '%alesp%'::text) then 'Assembleia (SP)'::text
            when (a.fonte_api ~~* '%alergs%'::text) then 'Assembleia (RS)'::text
            else 'Câmara'::text
        end as casa,
    d.ano,
    sum(d.valor_liquido) as total,
    count(*) as n_notas,
    count(distinct d.mes) as meses_com_gasto
   from (despesas_parlamentares d
     join agentes_politicos a on ((a.id = d.agente_id)))
  group by a.id, a.slug, a.nome_urna, a.partido_atual, a.uf_sede, a.foto_url,
        a.situacao, a.condicao_eleitoral,
        case
            when (a.fonte_api ~~* '%senado%'::text) then 'Senado'::text
            when (a.fonte_api ~~* '%alesp%'::text) then 'Assembleia (SP)'::text
            when (a.fonte_api ~~* '%alergs%'::text) then 'Assembleia (RS)'::text
            else 'Câmara'::text
        end, d.ano;

-- O indice UNICO e o que permite REFRESH MATERIALIZED VIEW CONCURRENTLY (atualizar sem
-- bloquear leitura). Recriar os quatro exatamente como estavam.
create unique index idx_radar_gastos_id_ano on public.radar_gastos using btree (id, ano);
create index idx_radar_gastos_ano_casa on public.radar_gastos using btree (ano, casa);
create index idx_radar_gastos_total on public.radar_gastos using btree (total desc);
create index idx_radar_gastos_uf on public.radar_gastos using btree (uf_sede, ano);
