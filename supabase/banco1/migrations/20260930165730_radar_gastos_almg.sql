drop materialized view if exists radar_gastos;
create materialized view radar_gastos as
 select a.id, a.slug, a.nome_urna, a.partido_atual, a.uf_sede, a.foto_url,
    a.situacao as situacao_atual, a.condicao_eleitoral,
    case
        when a.fonte_api ilike '%senado%' then 'Senado'
        when a.fonte_api ilike '%alesp%'  then 'Assembleia (SP)'
        when a.fonte_api ilike '%alergs%' then 'Assembleia (RS)'
        when a.fonte_api ilike '%almg%'   then 'Assembleia (MG)'
        else 'Câmara'
    end as casa,
    d.ano, sum(d.valor_liquido) as total, count(*) as n_notas, count(distinct d.mes) as meses_com_gasto
   from despesas_parlamentares d
     join agentes_politicos a on a.id = d.agente_id
  group by a.id, a.slug, a.nome_urna, a.partido_atual, a.uf_sede, a.foto_url, a.situacao, a.condicao_eleitoral,
    case
        when a.fonte_api ilike '%senado%' then 'Senado'
        when a.fonte_api ilike '%alesp%'  then 'Assembleia (SP)'
        when a.fonte_api ilike '%alergs%' then 'Assembleia (RS)'
        when a.fonte_api ilike '%almg%'   then 'Assembleia (MG)'
        else 'Câmara'
    end, d.ano;
create unique index idx_radar_gastos_id_ano on public.radar_gastos using btree (id, ano);
create index idx_radar_gastos_ano_casa on public.radar_gastos using btree (ano, casa);
create index idx_radar_gastos_total on public.radar_gastos using btree (total desc);
create index idx_radar_gastos_uf on public.radar_gastos using btree (uf_sede, ano);
grant select on public.radar_gastos to anon, authenticated, service_role;
