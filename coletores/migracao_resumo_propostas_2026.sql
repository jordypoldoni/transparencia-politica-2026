-- Migração: resumo por IA (offline, em lote) do plano de governo dos presidenciáveis.
-- Reabre a decisão "sem IA" de 2026-08-20 — ver Decisões.md (Obsidian) na mesma data,
-- 2ª entrada. Rodar no SQL Editor do Supabase, DEPOIS de migracao_presidenciaveis_2026.sql.

alter table candidatos_presidenciais
  add column if not exists resumo_proposta jsonb,       -- [{ "tema": "Economia", "pontos": ["...", "..."] }, ...]
  add column if not exists resumo_gerado_em timestamptz,
  add column if not exists resumo_modelo text;           -- qual modelo gerou (transparência/auditoria)
