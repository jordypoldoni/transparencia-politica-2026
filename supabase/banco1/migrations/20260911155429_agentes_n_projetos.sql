-- Separa "projeto de lei e afins" do resto da atividade parlamentar.
--
-- MOTIVO (11/09/2026): o filtro idDeputadoAutor da API da Camara traz, no mesmo balde,
-- projetos de lei, requerimentos, pareceres de relator, emendas e redacoes finais. Com o
-- total exato passamos a exibir numeros como "13.782 proposicoes" embaixo do titulo
-- "O que ele propos" - correto na contagem e enganoso na leitura, porque o leitor entende
-- projetos de lei. Medido na amostra guardada: so ~24% sao PL ou PEC.
--
-- n_proposicoes continua sendo TUDO (nao removemos nada, por decisao do Jordy).
-- n_projetos conta apenas os tipos que criam ou alteram norma: PL, PLP, PEC, PDL, PDC,
-- PLV, PRC, PLN. Assim a tela pode mostrar a proporcao em vez de um numero solto.
alter table agentes_politicos
  add column if not exists n_projetos integer;

comment on column agentes_politicos.n_projetos is
  'Proposicoes que criam ou alteram norma (PL, PLP, PEC, PDL, PDC, PLV, PRC, PLN). Subconjunto de n_proposicoes, que conta tambem requerimentos, pareceres e emendas.';
