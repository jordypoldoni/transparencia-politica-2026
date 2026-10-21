-- 21/10/2026: atualiza no lugar restituição e glosa (sem apagar nem reinserir linhas, para não inchar a tabela).
-- Casa por agente + documento + mês + valor líquido + data de emissão. Só service_role executa.
create or replace function public.aplicar_restituicao_glosa(p_ano int, p_itens jsonb)
returns int
language plpgsql
set statement_timeout = '120s'
as $$
declare n int;
begin
  update public.despesas_parlamentares d
     set valor_restituido = i.rest,
         data_restituicao = i.dr,
         valor_glosa      = i.glosa
    from jsonb_to_recordset(p_itens) as i(agente_id uuid, doc text, mes int, valor numeric, emissao date, rest numeric, dr date, glosa numeric)
   where d.ano = p_ano
     and d.casa_legislativa = 'Câmara'
     and d.agente_id = i.agente_id
     and d.id_externo_documento is not distinct from i.doc
     and d.mes is not distinct from i.mes
     and d.valor_liquido is not distinct from i.valor
     and d.data_emissao is not distinct from i.emissao;
  get diagnostics n = row_count;
  return n;
end $$;
revoke all on function public.aplicar_restituicao_glosa(int, jsonb) from public, anon, authenticated;
grant execute on function public.aplicar_restituicao_glosa(int, jsonb) to service_role;
