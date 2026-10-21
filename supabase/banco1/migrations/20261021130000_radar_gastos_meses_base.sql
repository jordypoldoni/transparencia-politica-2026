-- ATENÇÃO: AINDA NÃO APLICADA no banco 1 (aguarda OK do Jordy, 21/10/2026). Não presumir que está no ar.
-- 21/10/2026: radar_gastos ganha a BASE JUSTA do ranking de verba (item 6).
--
-- O QUE MUDA: três colunas novas no fim da view. Nenhuma coluna existente muda de valor.
--   meses_base            meses do ano que entram na média: em exercício (15 dias ou mais, regra do Jordy de
--                         21/10) E fechados (30 dias depois do fim do mês; em 2025, 98% do valor de um mês
--                         já tinha nota emitida nesse prazo).
--   total_base            soma do gasto nesses meses.
--   total_divulgacao_base parte de total_base na categoria 'Publicidade e Marketing' (divulgação da atividade
--                         parlamentar). Aparece como linha separada, porque candidatos não podem usá-la nos 120
--                         dias antes da eleição (a Câmara caiu de R$ 9,56 mi/mês em jan a mai para R$ 0,44 mi
--                         em jun a set de 2026, só nessa categoria).
-- Média justa = total_base / meses_base. O divisor deixa de ser "meses com gasto": quem não gasta num mês em
-- que estava em exercício puxa a média para baixo, como a cota prevê (o saldo pode acumular).
--
-- QUEM NÃO TEM HISTÓRICO DE EXERCÍCIO (Assembleias e raros sem cadastro): continua como antes
-- (meses_base = meses_com_gasto, total_base = total, total_divulgacao_base = null). Decisão do Jordy de 20/10:
-- estaduais ficam como estão por ora.
--
-- Depende de exercicio_parlamentar (migração exercicio_parlamentar, 21/10) e do coletor_exercicio.js.
-- O corte "30 dias" e o "15 dias" estão escritos aqui; mudar um exige recriar a view.
-- A view usa current_date: quem a atualiza (refresh_radar_gastos, chamado pelos coletores) a mantém em dia.
-- Desfazer: supabase/banco1/desfazer/20261021130000_radar_gastos_meses_base_DESFAZER.sql

drop materialized view if exists public.radar_gastos;
create materialized view public.radar_gastos as
with pares as (
    select distinct d.agente_id, d.ano from despesas_parlamentares d
),
cal as (
    select p.agente_id, p.ano, g.m as mes,
           make_date(p.ano, g.m, 1) as ini,
           (make_date(p.ano, g.m, 1) + interval '1 month' - interval '1 day')::date as fim
    from pares p cross join generate_series(1, 12) as g(m)
),
ex as (
    select c.agente_id, c.ano, c.mes, c.fim,
           least(extract(day from c.fim)::int,
                 coalesce(sum(greatest(0, least(coalesce(e.data_fim, current_date), c.fim) - greatest(e.data_inicio, c.ini) + 1)), 0))::int as dias
    from cal c
    left join exercicio_parlamentar e
           on e.agente_id = c.agente_id and e.situacao = 'Exercício'
          and e.data_inicio <= c.fim and coalesce(e.data_fim, current_date) >= c.ini
    group by c.agente_id, c.ano, c.mes, c.fim
),
elegiveis as (
    select agente_id, ano, count(*) filter (where dias >= 15 and fim + 30 <= current_date) as n
    from ex group by agente_id, ano
),
ag as (
    select a.*, exists (select 1 from exercicio_parlamentar e where e.agente_id = a.id) as tem_ex
    from agentes_politicos a
)
select a.id, a.slug, a.nome_urna, a.partido_atual, a.uf_sede, a.foto_url,
    a.situacao as situacao_atual, a.condicao_eleitoral,
    case
        when a.fonte_api ilike '%senado%' then 'Senado'
        when a.fonte_api ilike '%alesp%'  then 'Assembleia (SP)'
        when a.fonte_api ilike '%alergs%' then 'Assembleia (RS)'
        when a.fonte_api ilike '%almg%'   then 'Assembleia (MG)'
        else 'Câmara'
    end as casa,
    d.ano,
    sum(d.valor_liquido) as total,
    count(*) as n_notas,
    count(distinct d.mes) as meses_com_gasto,
    case when a.tem_ex then coalesce(el.n, 0) else count(distinct d.mes) end as meses_base,
    case when a.tem_ex
         then coalesce(sum(d.valor_liquido) filter (where x.dias >= 15 and x.fim + 30 <= current_date), 0)
         else sum(d.valor_liquido) end as total_base,
    case when a.tem_ex
         then coalesce(sum(d.valor_liquido) filter (where x.dias >= 15 and x.fim + 30 <= current_date
                                                     and d.categoria_normalizada = 'Publicidade e Marketing'), 0)
         else null end as total_divulgacao_base
   from despesas_parlamentares d
     join ag a on a.id = d.agente_id
     left join ex x on x.agente_id = d.agente_id and x.ano = d.ano and x.mes = d.mes
     left join elegiveis el on el.agente_id = d.agente_id and el.ano = d.ano
  where d.categoria_normalizada is distinct from 'Outras despesas'
  group by a.id, a.slug, a.nome_urna, a.partido_atual, a.uf_sede, a.foto_url, a.situacao, a.condicao_eleitoral,
    case
        when a.fonte_api ilike '%senado%' then 'Senado'
        when a.fonte_api ilike '%alesp%'  then 'Assembleia (SP)'
        when a.fonte_api ilike '%alergs%' then 'Assembleia (RS)'
        when a.fonte_api ilike '%almg%'   then 'Assembleia (MG)'
        else 'Câmara'
    end, d.ano, a.tem_ex, el.n;

create unique index idx_radar_gastos_id_ano on public.radar_gastos using btree (id, ano);
create index idx_radar_gastos_ano_casa on public.radar_gastos using btree (ano, casa);
create index idx_radar_gastos_total on public.radar_gastos using btree (total desc);
create index idx_radar_gastos_uf on public.radar_gastos using btree (uf_sede, ano);
-- Mesmas permissões que a view tinha no ar em 21/10/2026 (anon e authenticated leem; service_role tudo).
grant select on public.radar_gastos to anon, authenticated, service_role;
