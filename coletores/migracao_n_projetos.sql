-- Migracao: separa "projeto de lei e afins" do resto da atividade parlamentar.
-- APLICADA EM 2026-09-11.
--
-- MOTIVO: o filtro idDeputadoAutor da API da Camara devolve, no mesmo balde, projetos de
-- lei, requerimentos, pareceres de relator, emendas e redacoes finais. Quando o coletor
-- passou a contar o total exato (antes parava em 500), a ficha comecou a exibir numeros
-- como "13.782 proposicoes" embaixo do titulo "O que ele propos" - correto na contagem e
-- enganoso na leitura, porque o leitor entende projetos de lei. Na amostra guardada, so
-- ~24% eram PL ou PEC; o campeao isolado era REQ (requerimento).
--
-- n_proposicoes continua contando TUDO: nada foi removido do site.
-- n_projetos conta so o que cria ou altera norma, para a tela poder mostrar a proporcao.

alter table agentes_politicos
  add column if not exists n_projetos integer;

comment on column agentes_politicos.n_projetos is
  'Proposicoes que criam ou alteram norma (PL, PLP, PEC, PDL, PDC, PLV, PRC, PLN). Subconjunto de n_proposicoes, que conta tambem requerimentos, pareceres e emendas.';
