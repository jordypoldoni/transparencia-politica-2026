-- radar_gastos classificava a casa por fonte_api e o ELSE caia em 'Camara'.
-- Sem esta correcao, os gastos dos deputados estaduais do RS (fonte_api='alergs')
-- entrariam no ranking dos deputados FEDERAIS. Acrescenta a Assembleia (RS).
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

create unique index idx_radar_gastos_id_ano on public.radar_gastos using btree (id, ano);
create index idx_radar_gastos_ano_casa on public.radar_gastos using btree (ano, casa);
create index idx_radar_gastos_total on public.radar_gastos using btree (total desc);
create index idx_radar_gastos_uf on public.radar_gastos using btree (uf_sede, ano);
