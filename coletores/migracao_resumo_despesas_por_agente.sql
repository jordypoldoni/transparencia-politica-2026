-- 22/09/2026 — impressão digital dos gastos por deputado, para o coletor regravar só quem mudou.
-- APLICADA NO BANCO EM 22/09/2026. Versionada aqui junto do coletor que a usa.
--
-- POR QUE: coletor_gastos_arquivo.js apagava e regravava os ~103 mil lançamentos da Câmara todo
-- dia, mesmo sem mudança. A tabela foi de 214 para 256 MB com o mesmo número de linhas (o Postgres
-- não devolve na hora o espaço de linha apagada), e o banco chegou a 391 MB dos 500 do plano free.
-- Com a comparação, a primeira execução regravou 0 de 512 deputados.
--
-- Uma linha por deputado (~600), abaixo do corte de 1.000 linhas do PostgREST.
create or replace function public.resumo_despesas_por_agente(p_ano int, p_casa text)
returns table (agente_id uuid, n bigint, centavos bigint, ultima_emissao date)
language sql stable
set statement_timeout = '60s'
as $$
  select d.agente_id,
         count(*)::bigint,
         round(sum(coalesce(d.valor_liquido, 0)) * 100)::bigint,
         max(d.data_emissao)
    from despesas_parlamentares d
   where d.ano = p_ano and d.casa_legislativa = p_casa
   group by d.agente_id;
$$;
