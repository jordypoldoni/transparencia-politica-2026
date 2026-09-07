-- Migracao: radar_gastos passa a reconhecer a Assembleia do Rio Grande do Sul (ALERGS)
-- Aplicada em 07/09/2026 no projeto fedxytdorrecllugnicu (via conector do Supabase).
-- Este arquivo existe para que a correcao fique VERSIONADA: sem ele, quem recriasse o banco
-- a partir do repo teria de volta o bug descrito abaixo.
--
-- O BUG: a materialized view classificava a casa do parlamentar a partir de `fonte_api`, com
-- um ELSE que caia em 'Camara'. Como os deputados estaduais do RS entram com fonte_api='alergs',
-- os gastos deles apareceriam no ranking "Quem mais usou a verba publica" dos deputados
-- FEDERAIS. Descoberto antes de coletar qualquer gasto gaucho.
--
-- CUIDADO AO RODAR: recriar uma materialized view ZERA os privilegios dela. Por isso o GRANT
-- no fim — sem ele o ranking do site para de carregar. O indice UNICO tambem e obrigatorio:
-- refresh_radar_gastos() usa REFRESH MATERIALIZED VIEW CONCURRENTLY, que exige um indice unico.
-- A funcao refresh_radar_gastos() NAO precisa ser recriada: ela referencia a view pelo nome.

drop materialized view if exists radar_gastos;

create materialized view radar_gastos as
 select a.id,
    a.slug,
    a.nome_urna,
    a.partido_atual,
    a.uf_sede,
    a.foto_url,
    case
        when a.fonte_api ilike '%senado%' then 'Senado'
        when a.fonte_api ilike '%alesp%'  then 'Assembleia (SP)'
        when a.fonte_api ilike '%alergs%' then 'Assembleia (RS)'
        else 'Câmara'
    end as casa,
    d.ano,
    sum(d.valor_liquido) as total,
    count(*) as n_notas
   from despesas_parlamentares d
     join agentes_politicos a on a.id = d.agente_id
  group by a.id, a.slug, a.nome_urna, a.partido_atual, a.uf_sede, a.foto_url,
    case
        when a.fonte_api ilike '%senado%' then 'Senado'
        when a.fonte_api ilike '%alesp%'  then 'Assembleia (SP)'
        when a.fonte_api ilike '%alergs%' then 'Assembleia (RS)'
        else 'Câmara'
    end, d.ano;

-- Indice unico: exigido pelo REFRESH ... CONCURRENTLY de refresh_radar_gastos().
create unique index idx_radar_gastos_id_ano on public.radar_gastos using btree (id, ano);
create index idx_radar_gastos_ano_casa on public.radar_gastos using btree (ano, casa);
create index idx_radar_gastos_total on public.radar_gastos using btree (total desc);
create index idx_radar_gastos_uf on public.radar_gastos using btree (uf_sede, ano);

-- Leitura publica: os mesmos numeros que o site ja exibe no ranking.
grant select on public.radar_gastos to anon, authenticated, service_role;
