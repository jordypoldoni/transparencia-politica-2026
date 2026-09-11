-- Migracao: radar_gastos ganha situacao, condicao eleitoral e contagem de meses.
-- APLICADA EM 2026-09-11. Guardada aqui para o banco ser recriavel do zero.
--
-- MOTIVO: o ranking passou a ter as DUAS pontas ("quem mais usou" e "quem menos usou").
-- Na ponta de baixo, gasto baixo pode ser economia, mas tambem pode ser parlamentar
-- licenciado, suplente, ou que assumiu no meio do ano. Sem esses campos a lista sugere
-- economia onde pode haver apenas ausencia de dado - e sugerir conclusao e justamente o
-- que o site nao faz.
--
-- ATENCAO AO USAR situacao_atual: e o estado ATUAL do cadastro, nao o daquele ano. A tela
-- precisa escrever "Situacao atual: Licenca" com todas as letras; escrever so "Licenca" ao
-- lado de um gasto de 2024 faria o leitor concluir que ele estava licenciado em 2024.
--
-- View materializada nao aceita ALTER para novas colunas: derruba e recria com os indices.
-- O indice UNICO (id, ano) e obrigatorio para o REFRESH ... CONCURRENTLY usado por
-- refresh_radar_gastos(). Sem ele, o refresh passa a bloquear leitura.

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

create unique index idx_radar_gastos_id_ano on public.radar_gastos using btree (id, ano);
create index idx_radar_gastos_ano_casa on public.radar_gastos using btree (ano, casa);
create index idx_radar_gastos_total on public.radar_gastos using btree (total desc);
create index idx_radar_gastos_uf on public.radar_gastos using btree (uf_sede, ano);
