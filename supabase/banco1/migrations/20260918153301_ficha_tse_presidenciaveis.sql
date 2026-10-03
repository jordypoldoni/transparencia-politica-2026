-- A ficha do DivulgaCandContas passa a morar no banco. (18/09/2026)
--
-- POR QUE saiu do "ao vivo": o Akamai do TSE recusa a Vercel com 403 (Access Denied,
-- Reference #18.x). Nao e DNS, tempo nem User-Agent - trocamos o UA por um assinado e o
-- 403 continuou igual, o que elimina essa hipotese. E bloqueio de origem.
--
-- E, olhando sem a pressa da urgencia, o banco era o lugar certo desde o inicio: buscando
-- no navegador depois da pagina carregar, nada disso existia para o Google. Servido do
-- banco, entra no HTML e vira conteudo indexavel. Some tambem a dependencia de o TSE estar
-- de bom humor no instante em que alguem abre a pagina.
--
-- Nomes com sufixo _tse de proposito: situacao_candidatura e situacao_detalhe ja existem e
-- vem do CSV em lote, que traz "#NE". Sao dados diferentes, de fontes diferentes, e
-- sobrescrever um com o outro apagaria a origem.

alter table candidatos_presidenciais add column if not exists situacao_tse        text;
alter table candidatos_presidenciais add column if not exists apto_tse            boolean;
alter table candidatos_presidenciais add column if not exists consta_da_urna      text;
alter table candidatos_presidenciais add column if not exists totalizacao_tse     text;
alter table candidatos_presidenciais add column if not exists numero_processo     text;
alter table candidatos_presidenciais add column if not exists motivos             jsonb not null default '[]'::jsonb;

alter table candidatos_presidenciais add column if not exists substituido         boolean;
alter table candidatos_presidenciais add column if not exists substituto_sq       text;
alter table candidatos_presidenciais add column if not exists substituto_nome     text;

alter table candidatos_presidenciais add column if not exists divulga_bens        boolean;
alter table candidatos_presidenciais add column if not exists total_de_bens       numeric;
alter table candidatos_presidenciais add column if not exists bens                jsonb not null default '[]'::jsonb;

alter table candidatos_presidenciais add column if not exists documentos          jsonb not null default '[]'::jsonb;
alter table candidatos_presidenciais add column if not exists redes               jsonb not null default '[]'::jsonb;

alter table candidatos_presidenciais add column if not exists municipio_nascimento text;
alter table candidatos_presidenciais add column if not exists uf_nascimento        text;
alter table candidatos_presidenciais add column if not exists nacionalidade        text;

alter table candidatos_presidenciais add column if not exists ficha_coletada_em   timestamptz;
alter table candidatos_presidenciais add column if not exists ficha_fonte_url     text;

comment on column candidatos_presidenciais.situacao_tse is
  'Situacao vinda da ficha individual do DivulgaCandContas (Deferido, Indeferido...). Diferente de situacao_candidatura, que vem do CSV em lote e costuma trazer #NE.';
comment on column candidatos_presidenciais.motivos is
  'Motivos do indeferimento, como o TSE publica. Vazio quando deferido.';
comment on column candidatos_presidenciais.bens is
  'Bens declarados no registro. NAO contem CPF nem titulo de eleitor: esses ficam fora do banco de proposito.';

create index if not exists idx_presidenciaveis_ficha_coletada
  on candidatos_presidenciais (ficha_coletada_em desc nulls last);
