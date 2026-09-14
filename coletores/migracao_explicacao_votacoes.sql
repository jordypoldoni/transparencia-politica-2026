-- migracao_explicacao_votacoes.sql — camada zero das votações (13/09/2026)
--
-- POR QUE
-- A ementa oficial é técnica: "Altera a Lei nº 9.503/1997". O leitor comum não sai
-- sabendo o que muda na vida dele. Esta coluna guarda UMA frase em português comum
-- dizendo O QUE O TEXTO FAZ — mecanismo, não opinião.
--
-- LIMITE EDITORIAL (decisão do Jordy, 13/09/2026): só o que o texto faz.
-- Vale: "aumenta de 30 para 60 dias o prazo para X".
-- Não vale: "vai melhorar a vida dos trabalhadores" — isso é análise, não fato,
-- e contraria a neutralidade radical do projeto.
--
-- NADA É REMOVIDO: a ementa oficial continua na tela, com o link para o documento.
-- Esta é uma camada acrescentada acima dela.
--
-- Tamanho: 771 votações × ~400 chars ≈ 300 KB. Irrelevante perto do teto de 500 MB.

alter table votacoes add column if not exists explicacao_cidada     text;
alter table votacoes add column if not exists explicacao_gerada_em  timestamptz;
alter table votacoes add column if not exists explicacao_modelo     text;

comment on column votacoes.explicacao_cidada is
  'Uma frase em português comum sobre O QUE O TEXTO FAZ. Gerada por IA offline em lote. Nunca opina sobre mérito, motivo ou impacto.';

-- Só as que ainda não têm explicação entram na fila do gerador.
create index if not exists idx_votacoes_sem_explicacao
  on votacoes (data_voto desc)
  where explicacao_cidada is null;

-- ---------------------------------------------------------------------------
-- Segunda camada, acrescentada no mesmo dia depois da decisão do botão.
--
-- O botão "quero entender melhor" faz sempre a MESMA pergunta sobre a MESMA votação,
-- então a resposta é sempre a mesma. Por isso ela é gerada no mesmo lote offline e
-- guardada aqui, em vez de chamar a IA a cada clique. Ganhos: clique instantâneo,
-- custo fixo, nenhuma chave de IA no servidor, e o texto entra no HTML servido —
-- conteúdo gerado no clique seria invisível para o Google.
alter table votacoes add column if not exists contexto_extra text;

comment on column votacoes.contexto_extra is
  'Camada mais longa, revelada pelo botão "quero entender melhor". Mesmo lote offline da explicacao_cidada.';
