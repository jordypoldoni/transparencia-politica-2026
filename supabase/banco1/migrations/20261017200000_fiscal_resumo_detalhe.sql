-- 17/10/2026: página de gastos públicos v2. O coletor passa a guardar, junto do resumo, o detalhe
-- da receita (origem), resultado primário e nominal, juros, dívida e o conteúdo de "Encargos
-- Especiais". Fica numa coluna JSON para não precisar de uma coluna por número; o formato está em
-- src/lib/siconfi.js (parseReceitaDetalhe, parseResultados, parseEncargos). Nulo = ente sem o detalhe.
alter table public.fiscal_resumo add column if not exists detalhe jsonb;
comment on column public.fiscal_resumo.detalhe is
  'Detalhe do RREO (receita por origem, resultados primário/nominal, juros, dívida, encargos). Ver src/lib/siconfi.js.';
