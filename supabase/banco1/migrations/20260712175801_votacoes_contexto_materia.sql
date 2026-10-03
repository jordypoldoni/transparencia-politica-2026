-- Contexto da matéria (do endpoint /proposicoes da Câmara) para o leitor entender do que trata.
alter table votacoes add column if not exists situacao          text;  -- descricaoSituacao (ex.: "Transformado em Norma Jurídica")
alter table votacoes add column if not exists ementa_detalhada  text;  -- ementaDetalhada (quando acrescenta info)
alter table votacoes add column if not exists regime            text;  -- regime de tramitação (ex.: "Urgência (Art. 155)")
alter table votacoes add column if not exists url_inteiro_teor  text;  -- link do texto completo na fonte oficial
-- (a coluna `keywords` já existe na tabela)
