
CREATE OR REPLACE VIEW radar_gastos AS
SELECT
  a.id,
  a.slug,
  a.nome_urna,
  a.partido_atual,
  a.uf_sede,
  a.foto_url,
  CASE
    WHEN a.fonte_api ILIKE '%senado%' THEN 'Senado'
    WHEN a.fonte_api ILIKE '%alesp%'  THEN 'Assembleia (SP)'
    ELSE 'Câmara'
  END AS casa,
  d.ano,
  SUM(d.valor_liquido) AS total,
  COUNT(*) AS n_notas
FROM despesas_parlamentares d
JOIN agentes_politicos a ON a.id = d.agente_id
GROUP BY
  a.id, a.slug, a.nome_urna, a.partido_atual, a.uf_sede, a.foto_url,
  CASE
    WHEN a.fonte_api ILIKE '%senado%' THEN 'Senado'
    WHEN a.fonte_api ILIKE '%alesp%'  THEN 'Assembleia (SP)'
    ELSE 'Câmara'
  END,
  d.ano;

