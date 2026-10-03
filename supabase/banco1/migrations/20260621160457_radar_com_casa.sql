DROP VIEW IF EXISTS public.radar_gastos;
CREATE VIEW public.radar_gastos AS
SELECT a.id, a.slug, a.nome_urna, a.partido_atual, a.uf_sede, a.foto_url,
       CASE WHEN a.fonte_api ILIKE '%senado%' THEN 'Senado' ELSE 'Câmara' END AS casa,
       d.ano, sum(d.valor_liquido) AS total, count(*) AS n_notas
FROM public.despesas_parlamentares d
JOIN public.agentes_politicos a ON a.id = d.agente_id
GROUP BY a.id, a.slug, a.nome_urna, a.partido_atual, a.uf_sede, a.foto_url,
         CASE WHEN a.fonte_api ILIKE '%senado%' THEN 'Senado' ELSE 'Câmara' END, d.ano;
