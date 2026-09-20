-- 20/09/2026 — histórico político: a ficha do TSE traz `eleicoesAnteriores` e a tradução ignorava.
-- APLICADA NO BANCO EM 20/09/2026. Versionada aqui junto do código que a usa.
--
-- Medido na coleta completa: 5.479 dos 7.703 candidatos têm histórico, média de 2,2 candidaturas
-- anteriores e máximo de 11. Cada linha traz ano, cargo, local, o partido DAQUELA eleição e como
-- terminou (Eleito por QP, Eleito por média, Suplente, Não eleito), com link para a fonte.
-- É o que permite mostrar troca de partido, mudança de cargo e derrota sem emitir juízo.
--
-- Vai nas DUAS tabelas porque a tradução é a mesma para presidenciáveis e federais.
alter table candidatos_deputado_federal add column if not exists eleicoes_anteriores jsonb;
alter table candidatos_presidenciais   add column if not exists eleicoes_anteriores jsonb;
