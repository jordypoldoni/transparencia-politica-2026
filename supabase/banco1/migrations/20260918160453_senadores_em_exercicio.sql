-- O site dizia ter 89 senadores. O Brasil tem 81. (18/09/2026)
--
-- CAUSA: o coletor de senadores insere e atualiza, mas nunca DESATIVA ninguem. Quando um
-- titular vira ministro e o 1o suplente assume, a fonte passa a listar o suplente - e a
-- nossa tabela fica com os dois marcados como em exercicio, para sempre. Sao 90 linhas de
-- senador para 81 cadeiras: CE com 5, MT com 5, AL/MA/RJ/RR/SC com 4.
--
-- Nao da para resolver filtrando por `situacao = 'Exercicio'`: o registro velho do titular
-- tambem diz "Exercicio", porque ninguem o atualizou desde que ele saiu. Quem sabe quem esta
-- em exercicio hoje e a lista do Senado, e so ela. Esta coluna guarda essa resposta.
--
-- null = nunca foi avaliado (todo o resto da tabela: deputados federais e estaduais).
-- A tela exclui apenas `false`, nunca `null` - assim nada some antes de o coletor rodar.
alter table agentes_politicos add column if not exists em_exercicio boolean;

comment on column agentes_politicos.em_exercicio is
  'true = consta na lista de senadores em exercicio do Senado na ultima coleta; false = constava antes e nao consta mais (titular licenciado, suplente que devolveu a cadeira); null = nao se aplica ou nunca coletado. A tela filtra apenas o false.';

create index if not exists idx_agentes_em_exercicio on agentes_politicos (em_exercicio);
