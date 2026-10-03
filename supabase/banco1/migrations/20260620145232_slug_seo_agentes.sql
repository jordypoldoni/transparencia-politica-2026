CREATE EXTENSION IF NOT EXISTS unaccent;

ALTER TABLE public.agentes_politicos ADD COLUMN IF NOT EXISTS slug text;

UPDATE public.agentes_politicos
SET slug = regexp_replace(
             lower(regexp_replace(unaccent(coalesce(nome_urna, 'deputado') || '-' || coalesce(uf_sede, '')), '[^a-zA-Z0-9]+', '-', 'g')),
             '^-+|-+$', '', 'g'
           ) || '-' || left(id::text, 8);

CREATE UNIQUE INDEX IF NOT EXISTS uniq_agentes_slug ON public.agentes_politicos (slug);

DROP VIEW IF EXISTS public.radar_gastos;
CREATE VIEW public.radar_gastos AS
SELECT a.id, a.slug, a.nome_urna, a.partido_atual, a.uf_sede, a.foto_url,
       d.ano, sum(d.valor_liquido) AS total, count(*) AS n_notas
FROM public.despesas_parlamentares d
JOIN public.agentes_politicos a ON a.id = d.agente_id
GROUP BY a.id, a.slug, a.nome_urna, a.partido_atual, a.uf_sede, a.foto_url, d.ano;
