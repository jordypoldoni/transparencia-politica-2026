-- migracao_indicacoes_executivo.sql — indicações do presidente e o voto do Senado (17/09/2026)
--
-- O QUE É
-- Pelo art. 52 da Constituição, uma lista de cargos só é preenchida depois que o Senado
-- aprova o nome que o presidente manda. Ministro do STF e do STJ, presidente e diretor do
-- Banco Central e das agências, procurador-geral, defensor público-geral, embaixador. O
-- Executivo submete por Mensagem (MSF), a comissão sabatina, o plenário decide.
--
-- Em 2026 foram 17 indicações de nome. Treze já votadas. Uma rejeitada: Jorge Rodrigo
-- Araújo Messias para o STF, 42 a 34, em 29/04/2026 — contra aprovações de 67 a 8 e 40 a 1.
-- Esse contraste é a informação, e ele aparece sozinho quando as 17 ficam lado a lado.
--
-- O LIMITE QUE A FONTE IMPÕE, E QUE A TELA PRECISA DIZER
-- Essa votação é SECRETA por determinação constitucional. A API publica os 81 senadores da
-- sessão, mas o campo SiglaVoto diz apenas se a pessoa votou — não o quê. Os valores são
-- Votou, P-NRV (presente, não registrou voto), MIS (missão) e NCom (não compareceu). A
-- aritmética confirma: 34 sim + 42 não + 1 abstenção = 77, exatamente o total de "Votou".
-- Portanto: guardamos presença, NUNCA direção individual. Quem ler a tela precisa sair
-- sabendo que ninguém está escondendo o voto de fulano — ele não é público, e por lei.
--
-- POR QUE jsonb PARA PRESENÇAS
-- São ~81 linhas por votação e ~15 votações por ano. Uma tabela filha daria join em todo
-- lugar para um dado que só é lido junto com a indicação, nunca sozinho. jsonb serve.

create table if not exists indicacoes_executivo (
  id                bigserial primary key,

  -- Identidade na fonte
  codigo_materia    bigint not null unique,
  identificacao     text not null,          -- "MSF 7/2026"
  sigla             text,
  numero            text,
  ano               int not null,
  data_mensagem     date,
  autor             text,                   -- "Presidência da República"

  -- Texto oficial. NUNCA é substituído pelo que extraímos dele: fica na tela inteiro.
  ementa            text not null,

  -- Extração determinística da ementa (sem IA). null quando o padrão não casa — e null
  -- na tela vira "ver ementa", nunca um palpite.
  nome_indicado     text,
  cargo             text,
  orgao             text,
  tipo_orgao        text,                   -- judiciario | agencia | diplomacia | controle | defensoria | outro

  -- Votação. Uma matéria pode ter mais de uma; `votacoes` guarda todas e os campos
  -- abaixo espelham a ÚLTIMA, que é a decisiva.
  votada            boolean not null default false,
  data_votacao      date,
  resultado         text,                   -- Aprovado | Rejeitado
  votos_sim         int,
  votos_nao         int,
  votos_abstencao   int,
  votacao_secreta   boolean,
  codigo_sessao     bigint,
  descricao_votacao text,

  -- [{codigo, nome, nome_completo, partido, uf, sigla_voto, comparecimento}]
  -- `comparecimento` é a descrição OFICIAL da sigla, buscada em
  -- plenario/lista/tiposComparecimento — não um rótulo inventado por nós.
  presencas         jsonb not null default '[]'::jsonb,
  total_presentes   int,
  total_ausentes    int,

  url_materia       text,                   -- portal, abre em navegador
  url_fonte         text,                   -- dadosabertos, a origem do dado
  coletado_em       timestamptz not null default now()
);

comment on table indicacoes_executivo is
  'Indicações do presidente submetidas ao Senado (MSF) e o resultado da votação. Voto individual é secreto por lei: guardamos presença, nunca direção.';
comment on column indicacoes_executivo.presencas is
  'Quem estava na sessão e em que condição. NÃO contém como cada senador votou — a votação é secreta.';
comment on column indicacoes_executivo.nome_indicado is
  'Extraído da ementa por regra fixa, sem IA. null quando o padrão não casa.';

create index if not exists idx_indicacoes_ano        on indicacoes_executivo (ano desc, data_mensagem desc);
create index if not exists idx_indicacoes_votada     on indicacoes_executivo (votada, data_votacao desc);
create index if not exists idx_indicacoes_tipo_orgao on indicacoes_executivo (tipo_orgao);
