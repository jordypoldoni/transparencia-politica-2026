-- 22/09/2026 — o coletor de gastos pelo arquivo anual apagava e regravava os ~103 mil lançamentos
-- da Câmara TODO DIA, mesmo sem mudança. Medido: a tabela foi de 214 para 256 MB com o mesmo
-- número de linhas. Esta função devolve uma impressão digital por deputado (quantidade, soma em
-- centavos e a emissão mais recente), para o coletor regravar só quem mudou.
-- Uma linha por deputado: ~600 linhas, bem abaixo do corte de 1.000 do PostgREST.
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
