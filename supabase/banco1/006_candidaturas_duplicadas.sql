-- 02/10/2026: candidaturas repetidas no TSE (mesma pessoa, mais de um registro).
-- Exemplo: Guto Schiavetto (SP, Senado) aparece como "Pedido nao conhecido" E "Deferido".
-- `oculta` = registro repetido que NAO consta da urna. As listas do site passam a ignorar essas
-- linhas; a ficha pelo endereco continua abrindo (favoritos antigos nao quebram).
-- Regra, por (ano, uf, nome_completo) com mais de uma linha: ficam as que "Consta da urna";
-- se nenhuma consta, fica so a de maior sq_candidato (a mais recente).
-- Rodar no SQL Editor do banco 1 (hub-transparencia-politica), uma vez. E seguro rodar de novo.

alter table public.candidatos_senador          add column if not exists oculta boolean not null default false;
alter table public.candidatos_governador       add column if not exists oculta boolean not null default false;
alter table public.candidatos_deputado_federal add column if not exists oculta boolean not null default false;

create or replace function public.marcar_candidaturas_duplicadas() returns void
language plpgsql security definer set search_path = public as $$
declare t text;
begin
  foreach t in array array['candidatos_senador','candidatos_governador','candidatos_deputado_federal'] loop
    execute format($f$
      with r as (
        select id,
          (count(*) over w) > 1 as dup,
          coalesce(consta_da_urna = 'Consta da urna', false) as na_urna,
          row_number() over (partition by ano_eleicao, uf, nome_completo
            order by coalesce(consta_da_urna = 'Consta da urna', false) desc, sq_candidato::numeric desc) as pos
        from public.%1$I
        window w as (partition by ano_eleicao, uf, nome_completo)
      ), alvo as (
        select id, (dup and pos > 1 and not na_urna) as oculta from r
      )
      update public.%1$I c set oculta = a.oculta from alvo a
      where c.id = a.id and c.oculta is distinct from a.oculta
    $f$, t);
  end loop;
end $$;

revoke all on function public.marcar_candidaturas_duplicadas() from public, anon, authenticated;

select public.marcar_candidaturas_duplicadas();

-- Conferencia: deve listar so as linhas escondidas (esperado: 1 senador, 1 governador e ~12 federais).
select 'senador' cargo, uf, nome_urna, situacao_tse, consta_da_urna from public.candidatos_senador where oculta
union all select 'governador', uf, nome_urna, situacao_tse, consta_da_urna from public.candidatos_governador where oculta
union all select 'dep_federal', uf, nome_urna, situacao_tse, consta_da_urna from public.candidatos_deputado_federal where oculta
order by 1, 2, 3;
