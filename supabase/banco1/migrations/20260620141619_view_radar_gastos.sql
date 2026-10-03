CREATE OR REPLACE VIEW public.radar_gastos AS
SELECT
  a.id,
  a.nome_urna,
  a.partido_atual,
  a.uf_sede,
  a.foto_url,
  d.ano,
  sum(d.valor_liquido) AS total,
  count(*) AS n_notas
FROM public.despesas_parlamentares d
JOIN public.agentes_politicos a ON a.id = d.agente_id
GROUP BY a.id, a.nome_urna, a.partido_atual, a.uf_sede, a.foto_url, d.ano;
